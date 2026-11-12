"""HTTP endpoints for visit scheduling and tracking."""

from types import SimpleNamespace
from typing import Any, cast

from django.apps import apps
from django.http import Http404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAcademicSupervisor

from .models import Visit
from .selectors import visits_for_placement, visits_visible_to
from .serializers import (
    VisitCompleteSerializer,
    VisitSerializer,
    VisitUpdateSerializer,
    VisitWriteSerializer,
)
from .services import VisitService

PLACEMENT_ID_PARAMETER = OpenApiParameter(
    "placement_id",
    OpenApiTypes.UUID,
    OpenApiParameter.PATH,
    description="UUID of the placement whose visits are being accessed.",
)


def _placement(placement_id):
    try:
        model = apps.get_model("placements", "Placement")
    except LookupError:
        return SimpleNamespace(
            id=placement_id,
            status="APPROVED",
            student_id=None,
            workplace_supervisor_id=None,
        )
    try:
        return model.objects.get(pk=placement_id)
    except model.DoesNotExist as exc:
        raise Http404 from exc


class VisitViewSet(viewsets.GenericViewSet):
    """Manage visits visible to the authenticated user.

    The collection endpoint is scoped by role: students see their own visits,
    while academic and workplace supervisors see visits for their assigned
    placements. Only academic supervisors can edit, cancel, or complete visits.
    """

    serializer_class = VisitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Visit.objects.none()
        request = cast(Request, self.request)
        queryset = visits_visible_to(request.user)
        status_filter = request.query_params.get("status")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        if date_from:
            queryset = queryset.filter(scheduled_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(scheduled_at__date__lte=date_to)
        return queryset

    def list(self, request: Request):
        """List visits visible to the current user.

        Use ``status``, ``date_from``, and ``date_to`` query parameters to
        narrow the result by visit state or scheduled date. The response is
        always role-scoped and never exposes another user's placements.
        """
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    def retrieve(self, request: Request, pk=None):
        """Retrieve one visit when it belongs to the authenticated user's scope."""
        return Response(self.get_serializer(self.get_object()).data)

    def get_object(self):
        try:
            return self.get_queryset().get(pk=self.kwargs["pk"])
        except Visit.DoesNotExist as exc:
            raise Http404 from exc

    def partial_update(self, request: Request, pk=None):
        """Reschedule a visit or update its meeting link and notes.

        Only the assigned academic supervisor can edit an editable visit.
        Visit status and recorded findings are managed by workflow actions.
        """
        visit = self.get_object()
        serializer = VisitUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        updated = VisitService().update(visit, request.user, data)
        return Response(self.get_serializer(updated).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAcademicSupervisor],
    )
    def cancel(self, request: Request, pk=None):
        """Cancel a scheduled visit as its assigned academic supervisor."""
        visit = VisitService().cancel(self.get_object(), request.user)
        return Response(self.get_serializer(visit).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAcademicSupervisor],
    )
    def complete(self, request: Request, pk=None):
        """Complete a visit and record the academic supervisor's findings."""
        serializer = VisitCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, str], serializer.validated_data)
        visit = VisitService().complete(
            self.get_object(),
            request.user,
            data["findings"],
        )
        return Response(self.get_serializer(visit).data)


class PlacementVisitView(APIView):
    """Provide visit-specific operations for one placement.

    GET lists the placement's visits for any authenticated user with access to
    the placement. POST is restricted to the assigned academic supervisor and
    schedules a PHONE, VIDEO, or ONSITE visit. This endpoint owns visit data;
    the reports placement-summary endpoint owns aggregate placement progress.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            PLACEMENT_ID_PARAMETER,
        ],
        responses=VisitSerializer(many=True),
    )
    def get(self, request, placement_id):
        """List all visits for the placement within the requester's access scope."""
        visits = visits_for_placement(placement_id, request.user)
        return Response(VisitSerializer(visits, many=True).data)

    @extend_schema(
        parameters=[
            PLACEMENT_ID_PARAMETER,
        ],
        request=VisitWriteSerializer,
        responses={201: VisitSerializer},
    )
    def post(self, request, placement_id):
        """Schedule a visit for the placement as its assigned academic supervisor."""
        if not IsAcademicSupervisor().has_permission(request, self):
            return Response(
                {"detail": "Only academic supervisors can schedule visits."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = VisitWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = VisitService().schedule(
            _placement(placement_id),
            request.user,
            serializer.validated_data,
        )
        return Response(VisitSerializer(visit).data, status=status.HTTP_201_CREATED)
