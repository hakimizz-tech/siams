import uuid
from typing import Any, cast

from django.urls import reverse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.enums import Role
from apps.core.exceptions import RuleViolation
from apps.core.permissions import (
    IsAcademicSupervisor,
    IsCoordinator,
    IsStudent,
    IsWorkplaceSupervisor,
    roles_required,
)

from . import sources
from .dashboards import get_dashboard_builder
from .exports import serve_storage_path
from .jobs import create_job, get_job
from .selectors import period_summary, placement_summary
from .serializers import ExportRequestSerializer
from .tasks import export_period_summary

IsCoordinatorOrAcademicSupervisor = roles_required(Role.COORDINATOR, Role.ACADEMIC_SUPERVISOR)


class _DashboardView(APIView):
    """Return the authenticated user's role-specific dashboard.

    The response combines dashboard widgets, action items, notices, and an
    ``unavailable`` list for optional cross-application data that could not be
    loaded. Each concrete view restricts access to one role.
    """

    role = ""

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        """Return dashboard data for the current user and optional filters."""
        builder = get_dashboard_builder(self.role)(request.user, params=request.query_params.dict())
        return Response(builder.build())


class StudentDashboardView(_DashboardView):
    role = Role.STUDENT.value
    permission_classes = [IsStudent]


class AcademicSupervisorDashboardView(_DashboardView):
    role = Role.ACADEMIC_SUPERVISOR.value
    permission_classes = [IsAcademicSupervisor]


class WorkplaceSupervisorDashboardView(_DashboardView):
    role = Role.WORKPLACE_SUPERVISOR.value
    permission_classes = [IsWorkplaceSupervisor]


class CoordinatorDashboardView(_DashboardView):
    """Optional ?period=<uuid>; defaults to the latest period."""

    role = Role.COORDINATOR.value
    permission_classes = [IsCoordinator]


class PlacementSummaryView(APIView):
    """Return progress and oversight data for one visible placement.

    The summary includes placement status, approved hours, weekly logbook
    progress, visits, assessments, final-report status, result data, timeline
    events, and open integrity flags. Access is scoped by the requester's role.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request, placement_id):
        """Return the placement summary or 404 when it is outside the user's scope."""
        summary = placement_summary(request.user, placement_id)
        if summary is None:
            raise NotFound()
        return Response(summary)


class PeriodSummaryView(APIView):
    """Return the period summary for coordinators or assigned academic supervisors.

    Coordinators receive all non-draft placements in the period. Academic
    supervisors receive only their assigned students. Each result row combines
    placement, hours, logbook, visits, assessment, report, and final-result
    information.
    """

    permission_classes = [IsCoordinatorOrAcademicSupervisor]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request, period_id):
        """Return the requested period summary or 404 when the period is missing."""
        period = sources.get_period(period_id)
        if period is None:
            raise NotFound()
        return Response(period_summary(request.user, period))


class ExportCreateView(APIView):
    """Start an asynchronous CSV export for a period summary.

    The request identifies the report type and period. The response returns a
    ``task_id`` immediately; poll the status endpoint with that ID before
    following the temporary download URL. Coordinators can export all scoped
    placements, while academic supervisors export only their assigned students.
    """

    permission_classes = [IsCoordinatorOrAcademicSupervisor]

    @extend_schema(request=ExportRequestSerializer, responses={202: OpenApiTypes.OBJECT})
    def post(self, request):
        """Queue a period-summary export and return its pending task identifier."""
        serializer = ExportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        period = sources.get_period(data["period"])
        if period is None:
            raise RuleViolation("Internship period not found.", code="period_not_found")
        task_id = create_job(request.user.pk, report=data["report"])
        cast(Any, export_period_summary).delay(task_id, str(period.id), str(request.user.pk))
        return Response(
            {"task_id": str(uuid.UUID(task_id)), "status": "PENDING"},
            status=status.HTTP_202_ACCEPTED,
        )


def _own_job(request, task_id):
    job = get_job(task_id.hex)
    if not job or job.get("user_id") != str(request.user.pk):
        raise NotFound()
    return job


class ExportStatusView(APIView):
    """Return the status of an export task owned by the authenticated user.

    ``PENDING`` and ``RUNNING`` indicate that the CSV is still being generated.
    ``SUCCESS`` includes a download URL, while ``FAILURE`` includes an error
    message. Tasks belonging to another user are not revealed.
    """

    permission_classes = [IsCoordinatorOrAcademicSupervisor]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request, task_id):
        """Return export progress and, when ready, the download URL."""
        job = _own_job(request, task_id)
        payload = {"task_id": str(task_id), "status": job["status"]}
        if job["status"] == "SUCCESS":
            payload["filename"] = job["filename"]
            payload["download_url"] = reverse("report-export-file", kwargs={"task_id": task_id})
        if job["status"] == "FAILURE":
            payload["error"] = job.get("error", "")
        return Response(payload)


class ExportFileView(APIView):
    """Download a completed private CSV export owned by the authenticated user."""

    permission_classes = [IsCoordinatorOrAcademicSupervisor]

    @extend_schema(responses={(200, "text/csv"): OpenApiTypes.BINARY})
    def get(self, request, task_id):
        """Stream the CSV file or return 404 until the export is complete."""
        job = _own_job(request, task_id)
        if job["status"] != "SUCCESS":
            raise NotFound("The export is not ready.")
        return serve_storage_path(job["path"], job["filename"])
