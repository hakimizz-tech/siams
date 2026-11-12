"""HTTP endpoints for logbook reads and state transitions."""

from types import SimpleNamespace
from typing import Any, cast

from django.apps import apps
from django.db.models import QuerySet
from django.http import Http404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    inline_serializer,
)
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAcademicSupervisor, IsCoordinator, IsStudent, IsSupervisor
from apps.core.storage import serve_stored_file

from .models import IntegrityFlag, LogbookEntry, LogbookFeedback, LogbookImage
from .permissions import IsWorkplaceSupervisor
from .selectors import (
    entries_visible_to,
    open_flags_for_user,
    pending_reviews_for_supervisor,
    timeline_for_placement,
)
from .serializers import (
    ApproveSerializer,
    CommentSerializer,
    ImageUploadSerializer,
    IntegrityFlagSerializer,
    LogbookEntrySerializer,
    LogbookFeedbackSerializer,
    LogbookWriteSerializer,
)
from .services import LogbookService


def _placement(placement_id):
    try:
        model = apps.get_model("placements", "Placement")
    except LookupError:
        return SimpleNamespace(id=placement_id, status="APPROVED")
    try:
        return model.objects.get(pk=placement_id)
    except model.DoesNotExist as exc:
        raise Http404 from exc


class PlacementLogbookView(APIView):
    """List or create weekly logbook entries for one placement.

    Authenticated users can read entries visible within their role and
    placement scope. Students can create a weekly entry containing a summary
    and daily activities; the optional ``status`` query parameter filters the
    response by entry state.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("placement_id", OpenApiTypes.UUID, OpenApiParameter.PATH),
        ],
        responses=LogbookEntrySerializer(many=True),
    )
    def get(self, request, placement_id):
        """Return visible entries for a placement, optionally filtered by status."""
        queryset = entries_visible_to(request.user).filter(placement_id=placement_id)
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        return Response(LogbookEntrySerializer(queryset, many=True).data)

    @extend_schema(
        parameters=[
            OpenApiParameter("placement_id", OpenApiTypes.UUID, OpenApiParameter.PATH),
        ],
        request=LogbookWriteSerializer,
        responses={201: LogbookEntrySerializer},
    )
    def post(self, request, placement_id):
        """Create a student's draft weekly entry for the placement."""
        if not IsStudent().has_permission(request, self):
            return Response({"detail": "Only students can create logbook entries."}, status=403)
        serializer = LogbookWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = LogbookService().save_week(
            _placement(placement_id),
            request.user,
            serializer.validated_data,
        )
        return Response(LogbookEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class PlacementLogbookTimelineView(APIView):
    """Return the weekly submission and review timeline for one placement."""

    @extend_schema(
        parameters=[
            OpenApiParameter("placement_id", OpenApiTypes.UUID, OpenApiParameter.PATH),
        ],
        responses=inline_serializer(
            name="LogbookTimelineItem",
            fields={
                "week_start": serializers.DateField(),
                "status": serializers.CharField(),
                "entry": LogbookEntrySerializer(allow_null=True),
            },
            many=True,
        ),
    )
    def get(self, request, placement_id):
        """Return each week with its current status and entry when available."""
        timeline = timeline_for_placement(placement_id, request.user)
        return Response(
            [
                {
                    "week_start": item["week_start"],
                    "status": item["status"],
                    "entry": (
                        LogbookEntrySerializer(item["entry"]).data if item["entry"] else None
                    ),
                }
                for item in timeline
            ]
        )


class LogbookEntryViewSet(viewsets.GenericViewSet):
    """Expose individual logbook entries and their review workflow.

    Students edit and submit their own entries. Workplace supervisors approve
    submitted entries, optionally adjust activity hours, return entries for
    editing, and provide feedback. Coordinators can reopen entries, while
    supervisors can read or add feedback. Queryset scoping prevents users from
    accessing entries outside their placement or role permissions.
    """

    serializer_class = LogbookEntrySerializer
    queryset = entries_visible_to
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[LogbookEntry]:
        if getattr(self, "swagger_fake_view", False):
            return LogbookEntry.objects.none()
        return entries_visible_to(self.request.user)

    def retrieve(self, request, pk=None):
        """Return one logbook entry visible to the authenticated user."""
        return Response(self.get_serializer(self.get_object()).data)

    def get_object(self):
        try:
            return self.get_queryset().get(pk=self.kwargs["pk"])
        except LogbookEntry.DoesNotExist as exc:
            raise Http404 from exc

    def update(self, request, *args, **kwargs):
        """Replace an editable student entry and its weekly activities."""
        if not IsStudent().has_permission(request, self):
            return Response({"detail": "Only students can edit logbook entries."}, status=403)
        entry = self.get_object()
        serializer = LogbookWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        updated = LogbookService().save_week(
            _placement(entry.placement_id),
            request.user,
            data,
            entry=entry,
        )
        return Response(self.get_serializer(updated).data)

    def partial_update(self, request, *args, **kwargs):
        """Apply the same validated weekly-entry update used by ``PUT``."""
        return self.update(request, *args, **kwargs)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsStudent],
    )
    def submit(self, request, pk=None):
        """Submit a student entry for workplace-supervisor review."""
        entry = LogbookService().submit(self.get_object(), request.user)
        return Response(self.get_serializer(entry).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsWorkplaceSupervisor],
    )
    def approve(self, request, pk=None):
        """Approve an entry, optionally adjusting hours and adding a comment."""
        payload = ApproveSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = cast(dict[str, Any], payload.validated_data)
        entry = LogbookService().approve(self.get_object(), request.user, **data)
        return Response(self.get_serializer(entry).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsWorkplaceSupervisor],
    )
    def return_for_edit(self, request, pk=None):
        """Return an entry to the student with a required review comment."""
        payload = CommentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        comment = cast(dict[str, Any], payload.validated_data)["comment"]
        entry = LogbookService().return_for_edit(
            self.get_object(),
            request.user,
            comment,
        )
        return Response(self.get_serializer(entry).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsCoordinator],
    )
    def reopen(self, request, pk=None):
        """Reopen a reviewed entry for correction with a required comment."""
        payload = CommentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        comment = cast(dict[str, Any], payload.validated_data)["comment"]
        entry = LogbookService().reopen(
            self.get_object(),
            request.user,
            comment,
        )
        return Response(self.get_serializer(entry).data)

    @action(
        detail=True,
        methods=["get", "post"],
        permission_classes=[IsSupervisor],
        serializer_class=LogbookFeedbackSerializer,
    )
    def feedback(self, request, pk=None):
        """List or add supervisor feedback for a logbook entry."""
        entry = self.get_object()
        if request.method == "GET":
            feedback = LogbookFeedback.objects.filter(entry=entry)
            return Response(LogbookFeedbackSerializer(feedback, many=True).data)
        payload = CommentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        comment = cast(dict[str, Any], payload.validated_data)["comment"]
        feedback = LogbookService().add_feedback(
            entry,
            request.user,
            comment,
        )
        return Response(LogbookFeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsStudent],
        parser_classes=[MultiPartParser, FormParser],
    )
    def images(self, request, pk=None):
        """Upload an image to an editable student entry.

        The multipart request accepts an image, an optional caption, and an
        optional work date. The response returns the stored image identifier
        and display metadata.
        """
        entry = self.get_object()
        payload = ImageUploadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = cast(dict[str, Any], payload.validated_data)
        image = LogbookService().add_image(entry, request.user, **data)
        return Response(
            {
                "id": image.id,
                "caption": image.caption,
                "work_date": image.work_date,
            },
            status=status.HTTP_201_CREATED,
        )


class PendingReviewsView(APIView):
    """List submitted logbook entries awaiting the current supervisor's review."""

    permission_classes = [IsWorkplaceSupervisor]

    @extend_schema(responses=LogbookEntrySerializer(many=True))
    def get(self, request):
        """Return pending entries assigned to the authenticated supervisor."""
        entries = pending_reviews_for_supervisor(request.user)
        return Response(LogbookEntrySerializer(entries, many=True).data)


class LogbookImageView(APIView):
    """Delete an image belonging to the current student's editable entry."""

    permission_classes = [IsStudent]

    @extend_schema(
        parameters=[OpenApiParameter("image_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
        responses={204: None},
    )
    def delete(self, request, image_id):
        """Delete a draft or returned-entry image and return no content."""
        try:
            image = LogbookImage.objects.get(
                pk=image_id,
                entry__student=request.user,
                entry__status__in=("DRAFT", "RETURNED"),
            )
        except LogbookImage.DoesNotExist as exc:
            raise Http404 from exc
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogbookImageFileView(APIView):
    """Serve an image file when its entry is visible to the current user."""

    @extend_schema(
        parameters=[OpenApiParameter("image_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
        responses={200: OpenApiTypes.BINARY},
    )
    def get(self, request, image_id):
        """Stream the stored image inline using its original filename."""
        queryset = entries_visible_to(request.user)
        try:
            image = LogbookImage.objects.get(pk=image_id, entry__in=queryset)
        except LogbookImage.DoesNotExist as exc:
            raise Http404 from exc
        return serve_stored_file(
            image.image,
            download_name=image.original_name,
            as_attachment=False,
        )


class FlagViewSet(viewsets.ReadOnlyModelViewSet):
    """Read open integrity flags visible to the user and resolve them.

    Academic supervisors and coordinators can resolve a flag by supplying a
    non-empty resolution note. Flag creation and editing are handled by the
    logbook domain services rather than this read-only API.
    """

    serializer_class = IntegrityFlagSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return IntegrityFlag.objects.none()
        return open_flags_for_user(self.request.user)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAcademicSupervisor | IsCoordinator],
    )
    def resolve(self, request, pk=None):
        """Mark an integrity flag resolved with an auditable note."""
        flag = self.get_object()
        note = request.data.get("note", "").strip()
        if not note:
            return Response({"detail": "A resolution note is required."}, status=422)
        flag.resolved = True
        flag.resolved_by = request.user
        flag.resolved_at = timezone.now()
        flag.resolution_note = note
        flag.save(
            update_fields=[
                "resolved",
                "resolved_by",
                "resolved_at",
                "resolution_note",
                "updated_at",
            ]
        )
        return Response(self.get_serializer(flag).data)
