from django.urls import path

from .views import (
    AcademicSupervisorDashboardView,
    CoordinatorDashboardView,
    ExportCreateView,
    ExportFileView,
    ExportStatusView,
    PeriodSummaryView,
    PlacementSummaryView,
    StudentDashboardView,
    WorkplaceSupervisorDashboardView,
)

urlpatterns = [
    path("dashboard/student/", StudentDashboardView.as_view(), name="dashboard-student"),
    path(
        "dashboard/academic-supervisor/",
        AcademicSupervisorDashboardView.as_view(),
        name="dashboard-academic-supervisor",
    ),
    path(
        "dashboard/workplace-supervisor/",
        WorkplaceSupervisorDashboardView.as_view(),
        name="dashboard-workplace-supervisor",
    ),
    path(
        "dashboard/coordinator/", CoordinatorDashboardView.as_view(), name="dashboard-coordinator"
    ),
    path(
        "placements/<uuid:placement_id>/summary/",
        PlacementSummaryView.as_view(),
        name="placement-summary",
    ),
    path(
        "reports/periods/<uuid:period_id>/summary/",
        PeriodSummaryView.as_view(),
        name="period-summary",
    ),
    path("reports/export/", ExportCreateView.as_view(), name="report-export"),
    path(
        "reports/export/<uuid:task_id>/",
        ExportStatusView.as_view(),
        name="report-export-status",
    ),
    path(
        "reports/export/<uuid:task_id>/file/",
        ExportFileView.as_view(),
        name="report-export-file",
    ),
]
