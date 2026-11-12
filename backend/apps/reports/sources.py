from collections import defaultdict

from django.db.models import Count
from django.utils import timezone

from apps.accounts.models import StudentProfile
from apps.assessments.models import Assessment, AssessmentForm, FinalReport, PlacementResult
from apps.logbook import selectors as logbook_selectors  # noqa: F401  (used via sources.*)
from apps.notices import selectors as notices_selectors  # noqa: F401
from apps.placements import selectors as placements_selectors
from apps.placements.models import InternshipPeriod, Placement
from apps.visits import selectors as visits_selectors  # noqa: F401

DRAFT, SUBMITTED, RETURNED, APPROVED = "DRAFT", "SUBMITTED", "RETURNED", "APPROVED"
REJECTED, COMPLETED, TERMINATED = "REJECTED", "COMPLETED", "TERMINATED"
STATUSES = (DRAFT, SUBMITTED, RETURNED, APPROVED, REJECTED, COMPLETED, TERMINATED)
ACTIVE_STATUSES = (APPROVED, COMPLETED)
WORKPLACE, ACADEMIC = "WORKPLACE_SUPERVISOR", "ACADEMIC_SUPERVISOR"
DECISION_STATUSES = (RETURNED, REJECTED, APPROVED, TERMINATED)

_RELATED = ("student", "period", "organization", "academic_supervisor", "workplace_supervisor")


#  placements and periods -
def visible_placements(user):
    return placements_selectors.placements_visible_to(user).select_related(*_RELATED)


def get_period(period_id):
    return InternshipPeriod.objects.filter(pk=period_id).first()


def latest_period():
    return InternshipPeriod.objects.order_by("-start_date").first()


def get_visible_placement(user, placement_id):
    return visible_placements(user).filter(pk=placement_id).first()


def current_placement_for_student(user):
    return (
        visible_placements(user)
        .exclude(status__in=[REJECTED, TERMINATED])
        .order_by("-created_at")
        .first()
    )


def placements_for_period(user, period, statuses=None, exclude=None):
    queryset = visible_placements(user).filter(period=period)
    if statuses:
        queryset = queryset.filter(status__in=statuses)
    if exclude:
        queryset = queryset.exclude(status__in=exclude)
    return queryset.order_by("student__full_name")


def status_counts(period) -> dict:
    counts = dict.fromkeys(STATUSES, 0)
    rows = Placement.objects.filter(period=period).values("status").annotate(total=Count("id"))
    for row in rows:
        counts[row["status"]] = row["total"]
    return counts


def academic_workload(period) -> list:
    rows = (
        Placement.objects.filter(period=period, status=APPROVED)
        .values("academic_supervisor__full_name")
        .annotate(total=Count("id"))
        .order_by("-total")
    )
    return [
        {"supervisor": row["academic_supervisor__full_name"], "students": row["total"]}
        for row in rows
    ]


def timeline(placement) -> list:
    """One event per status change (from the placement's history table)."""
    history = getattr(placement, "history", None)
    if history is None:
        return []
    events, previous = [], None
    for record in history.select_related("history_user").order_by("history_date", "history_id"):
        if record.status == previous:
            continue
        previous = record.status
        remarks = (
            getattr(record, "coordinator_remarks", "") if record.status in DECISION_STATUSES else ""
        )
        events.append(
            {
                "status": record.status,
                "at": record.history_date,
                "by": record.history_user.full_name if record.history_user else None,
                "remarks": remarks,
            }
        )
    return events


#  batch lookups (one query each, keyed by placement id) -
def registration_numbers(user_ids) -> dict:
    return dict(
        StudentProfile.objects.filter(user_id__in=list(user_ids)).values_list(
            "user_id", "registration_number"
        )
    )


def submitted_assessments(placement_ids) -> list:
    return list(
        Assessment.objects.filter(
            placement_id__in=list(placement_ids), status="SUBMITTED"
        ).select_related("form")
    )


def final_reports_by_placement(placement_ids) -> dict:
    return {
        getattr(report, "placement_id", report.placement.pk): report
        for report in FinalReport.objects.filter(placement_id__in=list(placement_ids))
    }


def results_by_placement(placement_ids) -> dict:
    return {
        getattr(result, "placement_id", result.placement.pk): result
        for result in PlacementResult.objects.filter(placement_id__in=list(placement_ids))
    }


#  assessments and final reports (Alpha data, read here for dashboards)
def pending_assessments(user) -> list:
    """Approved placements where this supervisor's active form is open and unsubmitted."""
    role = getattr(user, "role", None)
    if role not in (WORKPLACE, ACADEMIC):
        return []
    placements = list(visible_placements(user).filter(status=APPROVED))
    forms = {
        getattr(form, "period_id", form.period.pk): form
        for form in AssessmentForm.objects.filter(is_active=True, assessor_role=role)
    }
    done = set(
        Assessment.objects.filter(assessor=user, status="SUBMITTED").values_list(
            "placement_id", flat=True
        )
    )
    today = timezone.localdate()
    return [
        p
        for p in placements
        if getattr(p, "period_id", p.period.pk) in forms
        and p.id not in done
        and (p.period.assessment_opens_on is None or p.period.assessment_opens_on <= today)
    ]


def reports_awaiting_review(user) -> list:
    return list(
        FinalReport.objects.filter(
            placement__in=visible_placements(user), status="SUBMITTED"
        ).select_related("placement__student")
    )


def ready_for_result(period, require_report: bool = True) -> list:
    """Placements with every active form submitted (and the report accepted), no result yet."""
    form_ids = set(
        AssessmentForm.objects.filter(period=period, is_active=True).values_list("id", flat=True)
    )
    if not form_ids:
        return []
    placements = list(
        Placement.objects.filter(period=period, status__in=ACTIVE_STATUSES).select_related(
            "student"
        )
    )
    ids = [p.id for p in placements]
    submitted = defaultdict(set)
    rows = Assessment.objects.filter(placement_id__in=ids, status="SUBMITTED").values_list(
        "placement_id", "form_id"
    )
    for placement_id, form_id in rows:
        submitted[placement_id].add(form_id)
    accepted = set(
        FinalReport.objects.filter(placement_id__in=ids, status="ACCEPTED").values_list(
            "placement_id", flat=True
        )
    )
    finalized = set(
        PlacementResult.objects.filter(placement_id__in=ids).values_list("placement_id", flat=True)
    )
    return [
        p
        for p in placements
        if p.id not in finalized
        and form_ids <= submitted[p.id]
        and (p.id in accepted or not require_report)
    ]


def assessment_counts(period) -> dict:
    forms = AssessmentForm.objects.filter(period=period, is_active=True).count()
    approved = Placement.objects.filter(period=period, status=APPROVED).count()
    submitted = Assessment.objects.filter(
        placement__period=period,
        placement__status=APPROVED,
        form__is_active=True,
        status="SUBMITTED",
    ).count()
    return {"submitted": submitted, "expected": forms * approved}


def final_report_counts(period) -> dict:
    counts = {"SUBMITTED": 0, "ACCEPTED": 0, "RETURNED": 0}
    rows = (
        FinalReport.objects.filter(placement__period=period)
        .values("status")
        .annotate(total=Count("id"))
    )
    for row in rows:
        counts[row["status"]] = row["total"]
    return counts


def finalized_count(period) -> int:
    return PlacementResult.objects.filter(placement__period=period).count()
