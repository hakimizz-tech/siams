"""Role-scoped read queries for logbook data."""

from collections import defaultdict
from collections.abc import Iterable
from datetime import date
from decimal import Decimal
from typing import Protocol, cast
from uuid import UUID

from django.db.models import Q, Sum

from apps.core.enums import Role
from apps.core.utils.timeutils import weeks_between

from .models import IntegrityFlag, LogbookEntry, LogbookStatus

# from typing import TYPE_CHECKING
# if TYPE_CHECKING:
# from apps.placements.models import Placement


class PlacementLike(Protocol):
    """Fields used by the timeline without importing the placements app."""

    id: UUID
    start_date: date
    end_date: date


def entries_visible_to(user):
    queryset = LogbookEntry.objects.select_related("student").prefetch_related(
        "activities",
        "images",
        "feedback__author",
        "flags",
    )
    if user.role == Role.STUDENT:
        return queryset.filter(student=user)
    if user.role == Role.WORKPLACE_SUPERVISOR:
        return queryset.filter(workplace_supervisor_id=user.id)
    if user.role == Role.ACADEMIC_SUPERVISOR:
        return queryset.filter(academic_supervisor_id=user.id)
    return queryset


def pending_reviews_for_supervisor(user):
    """Submitted entries waiting for a workplace supervisor, oldest first."""
    return (
        entries_visible_to(user)
        .filter(
            status=LogbookStatus.SUBMITTED,
        )
        .order_by("submitted_at")
    )


def approved_hours_by_placement(placement_ids: Iterable) -> dict:
    totals = (
        LogbookEntry.objects.filter(
            placement_id__in=placement_ids,
            status=LogbookStatus.APPROVED,
        )
        .values("placement_id")
        .annotate(total=Sum("activities__approved_hours"))
    )
    return {row["placement_id"]: row["total"] or Decimal("0") for row in totals}


def weeks_summary_by_placement(placement_ids: Iterable) -> dict:
    summary = defaultdict(
        lambda: {
            "approved": 0,
            "submitted": 0,
            "returned": 0,
            "missing": 0,
            "expected": 0,
        }
    )
    entries = LogbookEntry.objects.filter(placement_id__in=placement_ids)
    for entry in entries:
        key = str(entry.placement_id)
        summary[key][entry.status.lower()] += 1
    return dict(summary)


def recent_feedback_for_student(user, limit=5):
    return (
        LogbookEntry.objects.filter(student=user)
        .values(
            "id",
            "week_start",
            "feedback__author_id",
            "feedback__author__full_name",
            "feedback__kind",
            "feedback__comment",
            "feedback__created_at",
        )
        .order_by("-feedback__created_at")[:limit]
    )


def open_flags_for_user(user):
    entry_filter = Q(entry__student=user)
    if user.role == Role.WORKPLACE_SUPERVISOR:
        entry_filter = Q(entry__workplace_supervisor_id=user.id)
    elif user.role == Role.ACADEMIC_SUPERVISOR:
        entry_filter = Q(entry__academic_supervisor_id=user.id)
    elif user.role == Role.COORDINATOR:
        entry_filter = Q()
    return IntegrityFlag.objects.filter(resolved=False).filter(entry_filter).select_related("entry")


def timeline_for_placement(placement_id, user):
    entries = entries_visible_to(user).filter(placement_id=placement_id)
    by_week = {entry.week_start: entry for entry in entries}
    expected_weeks = []
    placement = _get_placement(placement_id)
    if (
        placement
        and getattr(placement, "start_date", None)
        and getattr(placement, "end_date", None)
    ):
        typed_placement = cast(PlacementLike, placement)
        expected_weeks = weeks_between(
            typed_placement.start_date,
            typed_placement.end_date,
        )
    else:
        expected_weeks = sorted(by_week)
    return [
        {
            "week_start": week,
            "status": by_week[week].status if week in by_week else "MISSING",
            "entry": by_week.get(week),
        }
        for week in expected_weeks
    ]


def _get_placement(placement_id):
    try:
        from django.apps import apps

        model = apps.get_model("placements", "Placement")
    except LookupError:
        return None
    return model.objects.filter(pk=placement_id).first()
