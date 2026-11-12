from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    AssessmentFormImportView,
    AssessmentFormViewSet,
    AssessmentViewSet,
    FinalReportAcceptView,
    FinalReportFileView,
    FinalReportReturnView,
    PeriodAssessmentFormsView,
    PlacementAssessmentsView,
    PlacementFinalizeView,
    PlacementFinalReportView,
    PlacementResultView,
)

router = SimpleRouter()
router.register("assessment-forms", AssessmentFormViewSet, basename="assessment-form")
router.register("assessments", AssessmentViewSet, basename="assessment")

urlpatterns = [
    path(
        "periods/<uuid:period_id>/assessment-forms/",
        PeriodAssessmentFormsView.as_view(),
        name="period-assessment-forms",
    ),
    path("assessment-forms/import/", AssessmentFormImportView.as_view(), name="form-import"),
    path(
        "placements/<uuid:placement_id>/assessments/",
        PlacementAssessmentsView.as_view(),
        name="placement-assessments",
    ),
    path(
        "placements/<uuid:placement_id>/final-report/",
        PlacementFinalReportView.as_view(),
        name="placement-final-report",
    ),
    path("final-reports/<uuid:pk>/file/", FinalReportFileView.as_view(), name="final-report-file"),
    path(
        "final-reports/<uuid:pk>/accept/",
        FinalReportAcceptView.as_view(),
        name="final-report-accept",
    ),
    path(
        "final-reports/<uuid:pk>/return/",
        FinalReportReturnView.as_view(),
        name="final-report-return",
    ),
    path(
        "placements/<uuid:placement_id>/result/",
        PlacementResultView.as_view(),
        name="placement-result",
    ),
    path(
        "placements/<uuid:placement_id>/finalize/",
        PlacementFinalizeView.as_view(),
        name="placement-finalize",
    ),
    path("", include(router.urls)),
]
