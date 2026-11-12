"""HTTP endpoints for assessment forms, placement assessments, and results."""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.enums import Role
from apps.core.exceptions import RuleViolation
from apps.core.permissions import IsAcademicSupervisor, IsCoordinator, IsStudent, roles_required
from apps.core.storage import serve_stored_file
from apps.core.viewsets import PermissionsByActionMixin, ScopedQuerysetMixin
from apps.placements import selectors as placements_selectors

from . import selectors
from .importers import AssessmentFormImporter
from .serializers import (
    AssessmentCreateSerializer,
    AssessmentFormImportSerializer,
    AssessmentFormPatchSerializer,
    AssessmentFormSerializer,
    AssessmentFormWriteSerializer,
    AssessmentSerializer,
    AssessmentUpdateSerializer,
    FinalReportReturnSerializer,
    FinalReportSerializer,
    FinalReportUploadSerializer,
)
from .services import (
    AssessmentFormService,
    AssessmentService,
    FinalReportService,
    ResultService,
)

IsSupervisor = roles_required(Role.WORKPLACE_SUPERVISOR, Role.ACADEMIC_SUPERVISOR)
IsResultReader = roles_required(Role.COORDINATOR, Role.ACADEMIC_SUPERVISOR, Role.STUDENT)


def _visible_placement(user, placement_id):
    placement = placements_selectors.placements_visible_to(user).filter(pk=placement_id).first()
    if placement is None:
        raise NotFound()
    return placement


def _clean_form_data(serializer) -> dict:
    data = dict(serializer.validated_data)
    data["criteria"] = [dict(item) for item in data["criteria"]]
    return data


#  rubric forms
class PeriodAssessmentFormsView(APIView):
    """List assessment forms for a period and create new versions.

    Authenticated users can read forms visible to them. Coordinators can
    create a form by supplying its assessor role, overall weight, activation
    state, and criteria. Forms are versioned and become immutable once locked
    by submitted assessments.
    """

    def get_permissions(self):
        return [IsCoordinator()] if self.request.method == "POST" else [IsAuthenticated()]

    @extend_schema(responses=AssessmentFormSerializer(many=True))
    def get(self, request, period_id):
        """Return assessment forms available for the selected internship period."""
        forms = selectors.assessment_forms_visible_to(request.user).filter(period_id=period_id)
        return Response(AssessmentFormSerializer(forms, many=True).data)

    @extend_schema(request=AssessmentFormWriteSerializer, responses={201: AssessmentFormSerializer})
    def post(self, request, period_id):
        """Create a coordinator-managed assessment form for the period."""
        period = placements_selectors.get_period(period_id)
        if period is None:
            raise NotFound()
        serializer = AssessmentFormWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        form = AssessmentFormService.create(period=period, **_clean_form_data(serializer))
        return Response(AssessmentFormSerializer(form).data, status=status.HTTP_201_CREATED)


class AssessmentFormImportView(APIView):
    """Import an official assessment form definition for an internship period.

    Coordinators submit the period UUID together with the form name, assessor
    role, weight, activation state, and criteria as JSON.
    """

    permission_classes = [IsCoordinator]

    @extend_schema(
        request=AssessmentFormImportSerializer, responses={201: AssessmentFormSerializer}
    )
    def post(self, request):
        """Validate and create an assessment form from the supplied JSON definition."""
        period = placements_selectors.get_period(request.data.get("period"))
        if period is None:
            raise RuleViolation("Internship period not found.", code="period_not_found")
        data = {key: value for key, value in request.data.items() if key != "period"}
        form = AssessmentFormImporter.import_json(period, data)
        return Response(AssessmentFormSerializer(form).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    update=extend_schema(request=AssessmentFormWriteSerializer, responses=AssessmentFormSerializer),
    partial_update=extend_schema(
        request=AssessmentFormPatchSerializer, responses=AssessmentFormSerializer
    ),
)
class AssessmentFormViewSet(
    PermissionsByActionMixin,
    ScopedQuerysetMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Retrieve, edit, and version coordinator-managed assessment forms.

    Form definitions can be fully replaced or partially updated only while
    editable. Once a form is locked, create a new version instead of changing
    the historical definition used by submitted assessments.
    """

    serializer_class = AssessmentFormSerializer
    permission_classes = [IsAuthenticated]
    permission_classes_by_action = {
        "update": [IsCoordinator],
        "partial_update": [IsCoordinator],
        "new_version": [IsCoordinator],
    }
    http_method_names = ["get", "put", "patch", "post", "head", "options"]

    def get_scoped_queryset(self):
        return selectors.assessment_forms_visible_to(self.request.user)

    def update(self, request, *args, **kwargs):
        """Replace or patch an unlocked assessment form."""
        form = self.get_object()
        if kwargs.pop("partial", False):
            serializer = AssessmentFormPatchSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            updated = AssessmentFormService.patch(form=form, **serializer.validated_data)
        else:
            serializer = AssessmentFormWriteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = _clean_form_data(serializer)
            data.pop("assessor_role")
            updated = AssessmentFormService.replace(form=form, **data)
        return Response(AssessmentFormSerializer(updated).data)

    @extend_schema(request=None, responses={201: AssessmentFormSerializer})
    @action(detail=True, methods=["post"], url_path="new-version")
    def new_version(self, request, pk=None):
        """Create a new editable version while preserving the existing form."""
        clone = AssessmentFormService.new_version(form=self.get_object())
        return Response(AssessmentFormSerializer(clone).data, status=status.HTTP_201_CREATED)


#  assessments -
class PlacementAssessmentsView(APIView):
    """List assessments for a placement and create supervisor drafts.

    Authenticated users see assessments allowed by placement scope. Workplace
    and academic supervisors can create a draft using an assessment form,
    optional scores, and an optional comment.
    """

    def get_permissions(self):
        return [IsSupervisor()] if self.request.method == "POST" else [IsAuthenticated()]

    @extend_schema(responses=AssessmentSerializer(many=True))
    def get(self, request, placement_id):
        """Return assessments visible to the authenticated user for a placement."""
        placement = _visible_placement(request.user, placement_id)
        items = selectors.assessments_visible_to(request.user).filter(placement=placement)
        return Response(AssessmentSerializer(items, many=True).data)

    @extend_schema(request=AssessmentCreateSerializer, responses={201: AssessmentSerializer})
    def post(self, request, placement_id):
        """Create a supervisor assessment draft for the placement."""
        placement = _visible_placement(request.user, placement_id)
        serializer = AssessmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        form_id = data.get("form")  # type: ignore
        form = selectors.get_form(form_id) if form_id is not None else None
        if form is None:
            raise RuleViolation("Assessment form not found.", code="form_not_found")
        assessment = AssessmentService.create_draft(
            actor=request.user,
            placement=placement,
            form=form,
            scores=[dict(item) for item in data.get("scores", [])],  # type: ignore
            comment=data.get("comment", ""),  # type: ignore
        )
        fresh = selectors.assessments_visible_to(request.user).get(pk=assessment.pk)
        return Response(AssessmentSerializer(fresh).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    partial_update=extend_schema(
        request=AssessmentUpdateSerializer, responses=AssessmentSerializer
    ),
)
class AssessmentViewSet(
    PermissionsByActionMixin,
    ScopedQuerysetMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Retrieve, edit, and submit individual supervisor assessments."""

    serializer_class = AssessmentSerializer
    permission_classes = [IsAuthenticated]
    permission_classes_by_action = {"partial_update": [IsSupervisor], "submit": [IsSupervisor]}
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_scoped_queryset(self):
        return selectors.assessments_visible_to(self.request.user)

    def partial_update(self, request, *args, **kwargs):
        """Update scores or comments on an assessment draft."""
        assessment = self.get_object()
        serializer = AssessmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        AssessmentService.update_draft(
            actor=request.user,
            assessment=assessment,
            scores=[dict(item) for item in data.get("scores", [])],
            comment=data.get("comment"),
        )
        return Response(AssessmentSerializer(self.get_object()).data)

    @extend_schema(request=None, responses=AssessmentSerializer)
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit a completed supervisor assessment for scoring and review."""
        AssessmentService.submit(actor=request.user, assessment=self.get_object())
        return Response(AssessmentSerializer(self.get_object()).data)


#  final report
class PlacementFinalReportView(APIView):
    """Read or upload the final report associated with a placement.

    Authenticated users can retrieve a visible report. The student assigned to
    the placement can upload a multipart document and optional title.
    """

    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        return [IsStudent()] if self.request.method == "POST" else [IsAuthenticated()]

    @extend_schema(responses=FinalReportSerializer)
    def get(self, request, placement_id):
        """Return the visible final report for a placement."""
        placement = _visible_placement(request.user, placement_id)
        report = selectors.get_final_report_for(placement)
        if report is None:
            raise NotFound("No final report has been uploaded.")
        return Response(FinalReportSerializer(report).data)

    @extend_schema(request=FinalReportUploadSerializer, responses={201: FinalReportSerializer})
    def post(self, request, placement_id):
        """Upload or replace the student's final placement report."""
        placement = _visible_placement(request.user, placement_id)
        serializer = FinalReportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = FinalReportService.upload(
            actor=request.user,
            placement=placement,
            file=serializer.validated_data["document"],  # type: ignore
            title=serializer.validated_data.get("title", ""),  # type: ignore
        )
        return Response(FinalReportSerializer(report).data, status=status.HTTP_201_CREATED)


def _visible_report(user, pk):
    report = selectors.final_reports_visible_to(user).filter(pk=pk).first()
    if report is None:
        raise NotFound()
    return report


class FinalReportFileView(APIView):
    """Serve a final-report file after enforcing placement visibility.

    The storage boundary streams local files and may redirect to a signed URL
    when a cloud storage backend is configured.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={(200, "application/octet-stream"): OpenApiTypes.BINARY})
    def get(self, request, pk):
        """Stream the report using its original filename."""
        report = _visible_report(request.user, pk)
        return serve_stored_file(report.document, download_name=report.original_name)


class FinalReportAcceptView(APIView):
    """Allow an academic supervisor to accept a visible final report."""

    permission_classes = [IsAcademicSupervisor]

    @extend_schema(request=None, responses=FinalReportSerializer)
    def post(self, request, pk):
        """Mark the final report as accepted and return its updated state."""
        report = FinalReportService.accept(
            actor=request.user, report=_visible_report(request.user, pk)
        )
        return Response(FinalReportSerializer(report).data)


class FinalReportReturnView(APIView):
    """Allow an academic supervisor to return a report with feedback."""

    permission_classes = [IsAcademicSupervisor]

    @extend_schema(request=FinalReportReturnSerializer, responses=FinalReportSerializer)
    def post(self, request, pk):
        """Return the report for correction with required review feedback."""
        serializer = FinalReportReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = FinalReportService.return_report(
            actor=request.user,
            report=_visible_report(request.user, pk),
            feedback=serializer.validated_data.get("feedback") or "",  # type: ignore
        )
        return Response(FinalReportSerializer(report).data)


#  results -
class PlacementResultView(APIView):
    """Preview or retrieve the calculated result for a visible placement.

    Coordinators, academic supervisors, and students can request the result.
    Students receive it only after the coordinator has finalized and released
    the placement result.
    """

    permission_classes = [IsResultReader]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request, placement_id):
        """Return the calculated result or the released student result."""
        placement = _visible_placement(request.user, placement_id)
        data = ResultService.preview(placement)
        if request.user.role == Role.STUDENT and not data["finalized"]:
            raise NotFound("Your result has not been released yet.")
        return Response(data)


class PlacementFinalizeView(APIView):
    """Finalize and release a placement result for coordinator review."""

    permission_classes = [IsCoordinator]

    @extend_schema(request=None, responses=OpenApiTypes.OBJECT)
    def post(self, request, placement_id):
        """Create the immutable result snapshot for a placement."""
        placement = _visible_placement(request.user, placement_id)
        result = ResultService.finalize(actor=request.user, placement=placement)
        return Response(ResultService.snapshot(result), status=status.HTTP_201_CREATED)
