from typing import Any, cast

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsCoordinator, IsStudent
from apps.core.viewsets import ScopedModelViewSet

from . import selectors
from .filters import PlacementFilter
from .permissions import IsStudentOrCoordinator
from .serializers import (
    ApproveSerializer,
    AssignSupervisorsSerializer,
    GradeBandSerializer,
    OrganizationSerializer,
    PeriodSerializer,
    PlacementCreateSerializer,
    PlacementSerializer,
    PlacementUpdateSerializer,
    RemarksSerializer,
    TerminateSerializer,
    TimelineEventSerializer,
)
from .services import OrganizationService, PeriodService, PlacementService


class PeriodViewSet(ScopedModelViewSet):
    """Manage internship periods and their scheduling configuration.

    All authenticated users can read periods. Coordinators create or update
    periods, including the dates, required hours, minimum visits, and
    assessment opening date used by downstream workflows.
    """

    serializer_class = PeriodSerializer
    permission_classes = [IsAuthenticated]
    permission_classes_by_action = {
        "create": [IsCoordinator],
        "update": [IsCoordinator],
        "partial_update": [IsCoordinator],
    }
    http_method_names = ["get", "post", "put", "patch", "head", "options"]
    ordering = ["-start_date"]

    def get_scoped_queryset(self):
        return selectors.periods_visible_to(self.request.user)


class GradeBandsView(APIView):
    """Read or replace the grading bands configured for one internship period."""

    def get_permissions(self):
        return [IsCoordinator()] if self.request.method == "PUT" else [IsAuthenticated()]

    @extend_schema(responses=GradeBandSerializer(many=True))
    def get(self, request, period_id):
        """Return the period's grade bands ordered from highest threshold."""
        period = selectors.get_period(period_id)
        if period is None:
            raise NotFound()
        return Response(GradeBandSerializer(selectors.grade_bands_for(period), many=True).data)

    @extend_schema(request=GradeBandSerializer(many=True), responses=GradeBandSerializer(many=True))
    def put(self, request, period_id):
        """Replace all grade bands; only coordinators can change them."""
        period = selectors.get_period(period_id)
        if period is None:
            raise NotFound()
        serializer = GradeBandSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        bands = PeriodService.set_grade_bands(period, serializer.validated_data)
        return Response(GradeBandSerializer(bands, many=True).data)


class OrganizationViewSet(ScopedModelViewSet):
    """Manage host organizations visible to the authenticated user.

    Students see verified organizations and their own submissions. Coordinators
    see all organizations, can edit them, and can verify student submissions.
    """

    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    permission_classes_by_action = {
        "create": [IsStudentOrCoordinator],
        "partial_update": [IsStudentOrCoordinator],
        "verify": [IsCoordinator],
    }
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_fields = ["is_verified", "county"]
    search_fields = ["name", "county"]
    ordering = ["name"]

    def get_scoped_queryset(self):
        return selectors.organizations_visible_to(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = OrganizationService.create(
            actor=self.request.user, **serializer.validated_data
        )

    def perform_update(self, serializer):
        serializer.instance = OrganizationService.update(
            actor=self.request.user, organization=serializer.instance, **serializer.validated_data
        )

    @extend_schema(request=None, responses=OrganizationSerializer)
    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        """Mark a host organization as verified for placement use."""
        organization = OrganizationService.verify(
            actor=request.user, organization=self.get_object()
        )
        return Response(self.get_serializer(organization).data)



@extend_schema_view(
    create=extend_schema(request=PlacementCreateSerializer, responses={201: PlacementSerializer}),
    partial_update=extend_schema(request=PlacementUpdateSerializer, responses=PlacementSerializer),
)
class PlacementViewSet(ScopedModelViewSet):
    """Manage placement requests and their coordinator approval lifecycle.

    Students create and edit their own drafts or returned requests, then submit
    them for review. Coordinators review submissions, return or reject them,
    approve valid requests, assign supervisors, and complete or terminate
    approved placements. Every action is restricted to the user's role and
    placement scope.
    """

    serializer_class = PlacementSerializer
    permission_classes = [IsAuthenticated]
    permission_classes_by_action = {
        "create": [IsStudentOrCoordinator],
        "partial_update": [IsStudentOrCoordinator],
        "me": [IsStudent],
        "submit": [IsStudent],
        "approve": [IsCoordinator],
        "return_for_changes": [IsCoordinator],
        "reject": [IsCoordinator],
        "assign_supervisors": [IsCoordinator],
        "complete": [IsCoordinator],
        "terminate": [IsCoordinator],
    }
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_class = PlacementFilter
    search_fields = ["student__full_name", "organization__name", "role_title"]
    ordering_fields = ["created_at", "start_date", "status"]
    ordering = ["-created_at"]

    def get_scoped_queryset(self):
        return selectors.placements_visible_to(self.request.user)

    def _respond(self, placement, code=status.HTTP_200_OK):
        context = self.get_serializer_context()
        return Response(PlacementSerializer(placement, context=context).data, status=code)

    def create(self, request, *args, **kwargs):
        """Create a draft placement for the current student or a selected student."""
        serializer = PlacementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        placement = PlacementService.create_draft(
            actor=request.user,
            student=data.pop("student", None),
            period=data.pop("period"),
            organization=data.pop("organization"),
            **data,
        )
        return self._respond(placement, status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        """Update editable placement details before approval."""
        placement = self.get_object()
        serializer = PlacementUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        placement = PlacementService.update(
            actor=request.user,
            placement=placement,
            organization=data.pop("organization", None),
            **data,
        )
        return self._respond(placement)

    @extend_schema(responses=PlacementSerializer)
    @action(detail=False, methods=["get"], pagination_class=None)
    def me(self, request):
        """Return the current student's latest active placement."""
        placement = selectors.latest_placement_for_student(request.user)
        if placement is None:
            raise NotFound("You have no placement yet.")
        return self._respond(placement)

    @extend_schema(responses=TimelineEventSerializer(many=True))
    @action(detail=True, methods=["get"], pagination_class=None)
    def timeline(self, request, pk=None):
        """Return the placement status history and coordinator decisions."""
        events = selectors.placement_timeline(self.get_object())
        return Response(TimelineEventSerializer(events, many=True).data)

    @extend_schema(request=None, responses=PlacementSerializer)
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit a complete draft or returned placement for coordinator review."""
        placement = PlacementService.submit(actor=request.user, placement=self.get_object())
        return self._respond(placement)

    @extend_schema(request=ApproveSerializer, responses=PlacementSerializer)
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a submitted placement and assign both supervisors."""
        serializer = ApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        placement = PlacementService.approve(
            actor=request.user,
            placement=self.get_object(),
            academic_supervisor_id=data["academic_supervisor"],
            workplace_supervisor_id=data.get("workplace_supervisor"),
            invite_workplace_supervisor=data.get("invite_workplace_supervisor", False),
            remarks=data.get("remarks", ""),
        )
        return self._respond(placement)

    @extend_schema(request=RemarksSerializer, responses=PlacementSerializer)
    @action(detail=True, methods=["post"], url_path="return")
    def return_for_changes(self, request, pk=None):
        """Return a submitted placement to the student with required remarks."""
        serializer = RemarksSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        placement = PlacementService.return_for_changes(
            actor=request.user,
            placement=self.get_object(),
            remarks=serializer.validated_data["remarks"],
        )
        return self._respond(placement)

    @extend_schema(request=RemarksSerializer, responses=PlacementSerializer)
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a submitted placement with required coordinator remarks."""
        serializer = RemarksSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        placement = PlacementService.reject(
            actor=request.user,
            placement=self.get_object(),
            remarks=serializer.validated_data["remarks"],
        )
        return self._respond(placement)

    @extend_schema(request=AssignSupervisorsSerializer, responses=PlacementSerializer)
    @action(detail=True, methods=["post"], url_path="assign-supervisors")
    def assign_supervisors(self, request, pk=None):
        """Change supervisors on an already approved placement."""
        serializer = AssignSupervisorsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        placement = PlacementService.assign_supervisors(
            actor=request.user,
            placement=self.get_object(),
            academic_supervisor_id=data.get("academic_supervisor"),
            workplace_supervisor_id=data.get("workplace_supervisor"),
        )
        return self._respond(placement)

    @extend_schema(request=None, responses=PlacementSerializer)
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark an approved placement as completed."""
        placement = PlacementService.complete(actor=request.user, placement=self.get_object())
        return self._respond(placement)

    @extend_schema(request=TerminateSerializer, responses=PlacementSerializer)
    @action(detail=True, methods=["post"])
    def terminate(self, request, pk=None):
        """Terminate an approved placement and record the reason."""
        serializer = TerminateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        placement = PlacementService.terminate(
            actor=request.user,
            placement=self.get_object(),
            reason=serializer.validated_data["reason"],
        )
        return self._respond(placement)
