import uuid
from collections import namedtuple
from datetime import date

from django.db.models import Count, Q

from apps.core.enums import Role

from .models import GradeBand, InternshipPeriod, Organization, Placement

Participants = namedtuple("Participants", "student academic_supervisor workplace_supervisor")

DECISION_STATUSES = (
    Placement.Status.RETURNED,
    Placement.Status.REJECTED,
    Placement.Status.APPROVED,
    Placement.Status.TERMINATED,
)


def _placements():
    return Placement.objects.select_related(
        "student", "period", "organization", "academic_supervisor", "workplace_supervisor"
    )


def get_placement(placement_id: uuid.UUID):
    """Return the placement or None."""
    return _placements().filter(pk=placement_id).first()


def placement_participants(placement_id: uuid.UUID):
    """Participants(student, academic_supervisor, workplace_supervisor), or None."""
    placement = get_placement(placement_id)
    if placement is None:
        return None
    return Participants(
        placement.student, placement.academic_supervisor, placement.workplace_supervisor
    )


def placements_visible_to(user):
    """Role-scoped queryset. Use it to scope every viewset and every cross-app read."""
    queryset = _placements()
    role = getattr(user, "role", None)
    if role == Role.COORDINATOR:
        return queryset
    if role == Role.STUDENT:
        return queryset.filter(student=user)
    if role == Role.WORKPLACE_SUPERVISOR:
        return queryset.filter(workplace_supervisor=user)
    if role == Role.ACADEMIC_SUPERVISOR:
        return queryset.filter(academic_supervisor=user)
    return queryset.none()


def open_placements_on(day: date):
    """APPROVED placements active on `day` (used by Beta's missing-week job)."""
    return _placements().filter(
        status=Placement.Status.APPROVED, start_date__lte=day, end_date__gte=day
    )


def can_log_on(placement_id: uuid.UUID, day: date) -> bool:
    placement = Placement.objects.filter(pk=placement_id).first()
    return bool(placement and placement.can_log_on(day))


def periods_visible_to(user):
    """Reference data: every authenticated user may read periods."""
    return (
        InternshipPeriod.objects.all()
        if getattr(user, "is_authenticated", False)
        else (InternshipPeriod.objects.none())
    )


def get_period(period_id):
    return InternshipPeriod.objects.filter(pk=period_id).first()


def latest_period():
    return InternshipPeriod.objects.order_by("-start_date").first()


def grade_bands_for(period):
    return GradeBand.objects.filter(period=period).order_by("-min_percent")


def organizations_visible_to(user):
    queryset = Organization.objects.all()
    role = getattr(user, "role", None)
    if role in (Role.COORDINATOR, Role.ACADEMIC_SUPERVISOR):
        return queryset
    if role == Role.STUDENT:
        return queryset.filter(Q(is_verified=True) | Q(created_by=user))
    if role == Role.WORKPLACE_SUPERVISOR:
        return queryset.filter(
            Q(placements__workplace_supervisor=user) | Q(supervisors__user=user)
        ).distinct()
    return queryset.none()


def latest_placement_for_student(user):
    """The student's current placement (ignores rejected and terminated ones)."""
    return (
        placements_visible_to(user)
        .exclude(status__in=[Placement.Status.REJECTED, Placement.Status.TERMINATED])
        .order_by("-created_at")
        .first()
    )


def placements_in_period(period, statuses=None):
    queryset = _placements().filter(period=period)
    if statuses:
        queryset = queryset.filter(status__in=statuses)
    return queryset


def status_counts(period) -> dict:
    rows = Placement.objects.filter(period=period).values("status").annotate(total=Count("id"))
    counts = dict.fromkeys(Placement.Status.values, 0)
    counts.update({row["status"]: row["total"] for row in rows})
    return counts


def academic_workload(period) -> list:
    rows = (
        Placement.objects.filter(period=period, status=Placement.Status.APPROVED)
        .values("academic_supervisor__full_name")
        .annotate(total=Count("id"))
        .order_by("-total")
    )
    return [
        {"supervisor": row["academic_supervisor__full_name"], "students": row["total"]}
        for row in rows
    ]


def placement_timeline(placement) -> list:
    """Status history: one event per status change, with who decided and any remarks."""
    events = []
    previous = None
    records = placement.history.select_related("history_user").order_by(
        "history_date", "history_id"
    )
    for record in records:
        if record.status == previous:
            continue
        previous = record.status
        events.append(
            {
                "status": record.status,
                "at": record.history_date,
                "by": record.history_user.full_name if record.history_user else None,
                "remarks": record.coordinator_remarks if record.status in DECISION_STATUSES else "",
            }
        )
    return events
