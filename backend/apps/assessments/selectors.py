from typing import Any, cast

from django.utils import timezone

from apps.core.enums import Role
from apps.placements import selectors as placements_selectors
from apps.placements.models import Placement

from .models import Assessment, AssessmentForm, FinalReport, PlacementResult


def assessment_forms_visible_to(user):
    queryset = AssessmentForm.objects.select_related("period").prefetch_related("criteria")
    role = getattr(user, "role", None)
    if role in (Role.COORDINATOR, Role.STUDENT):
        return queryset
    if role in (Role.WORKPLACE_SUPERVISOR, Role.ACADEMIC_SUPERVISOR):
        return queryset.filter(assessor_role=role)
    return queryset.none()


def get_form(form_id):
    return AssessmentForm.objects.filter(pk=form_id).prefetch_related("criteria").first()


def active_forms_for_period(period_id):
    return AssessmentForm.objects.filter(period_id=period_id, is_active=True).order_by(
        "assessor_role"
    )


def assessments_visible_to(user):
    queryset = Assessment.objects.select_related("form", "assessor", "placement").prefetch_related(
        "scores__criterion"
    )
    role = getattr(user, "role", None)
    if role == Role.COORDINATOR:
        return queryset
    if role in (Role.WORKPLACE_SUPERVISOR, Role.ACADEMIC_SUPERVISOR):
        return queryset.filter(assessor=user)
    if role == Role.STUDENT:  # only once the coordinator has finalized the result
        return queryset.filter(placement__student=user, placement__result__isnull=False)
    return queryset.none()


def get_assessment_for(placement, form):
    return Assessment.objects.filter(placement=placement, form=form).first()


def assessments_for_placement(placement):
    return Assessment.objects.filter(placement=placement).select_related("form")


def final_reports_visible_to(user):
    placements = placements_selectors.placements_visible_to(user)
    return FinalReport.objects.filter(placement__in=placements).select_related("placement")


def get_final_report_for(placement):
    return FinalReport.objects.filter(placement=placement).first()


def get_result(placement):
    return PlacementResult.objects.filter(placement=placement).first()


def pending_assessments_for(user) -> list:
    """Approved placements where this supervisor's active form is open and not yet submitted."""
    role = getattr(user, "role", None)
    if role not in (Role.WORKPLACE_SUPERVISOR, Role.ACADEMIC_SUPERVISOR):
        return []
    placements = placements_selectors.placements_visible_to(user).filter(
        status=Placement.Status.APPROVED
    )
    forms = {
        cast(Any, form).period_id: form
        for form in AssessmentForm.objects.filter(is_active=True, assessor_role=role)
    }
    done = set(
        Assessment.objects.filter(assessor=user, status=Assessment.Status.SUBMITTED).values_list(
            "placement_id", flat=True
        )
    )
    today = timezone.localdate()
    pending = []
    for placement in placements:
        opens = placement.period.assessment_opens_on
        window_open = opens is None or opens <= today
        if cast(Any, placement).period_id in forms and placement.id not in done and window_open:
            pending.append(placement)
    return pending


def final_report_counts(period) -> dict:
    counts = dict.fromkeys(FinalReport.Status.values, 0)
    for status in FinalReport.objects.filter(placement__period=period).values_list(
        "status", flat=True
    ):
        counts[status] += 1
    return counts


def assessment_counts(period) -> dict:
    """Submitted versus expected assessments for approved placements in a period."""
    forms = AssessmentForm.objects.filter(period=period, is_active=True).count()
    approved = Placement.objects.filter(period=period, status=Placement.Status.APPROVED).count()
    submitted = Assessment.objects.filter(
        placement__period=period,
        placement__status=Placement.Status.APPROVED,
        form__is_active=True,
        status=Assessment.Status.SUBMITTED,
    ).count()
    return {"submitted": submitted, "expected": forms * approved}


def placements_ready_for_result(period, require_report: bool = True) -> list:
    """Placements with every active form submitted (and the report accepted) but no result yet."""
    form_ids = set(active_forms_for_period(period.id).values_list("id", flat=True))
    if not form_ids:
        return []
    placements = (
        Placement.objects.filter(
            period=period, status__in=[Placement.Status.APPROVED, Placement.Status.COMPLETED]
        )
        .select_related("student", "final_report", "result")
        .prefetch_related("assessments")
    )
    ready = []
    for placement in placements:
        if hasattr(placement, "result"):
            continue
        submitted = {
            cast(Any, assessment).form_id
            for assessment in cast(Any, placement).assessments.all()
            if assessment.status == Assessment.Status.SUBMITTED
        }
        report = getattr(placement, "final_report", None)
        report_ok = report is not None and report.status == FinalReport.Status.ACCEPTED
        if form_ids <= submitted and (report_ok or not require_report):
            ready.append(placement)
    return ready
