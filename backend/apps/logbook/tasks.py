"""Periodic jobs for review reminders and missing-week flags."""

from datetime import date, timedelta
from typing import Protocol, cast
from uuid import UUID

from celery import shared_task
from django.utils import timezone

from apps.core import events

from .models import FlagType, IntegrityFlag, LogbookEntry, LogbookStatus


class PlacementLike(Protocol):
    """Fields used by missing-week checks from the placements boundary."""

    id: UUID
    start_date: date
    end_date: date


@shared_task
def remind_pending_reviews():
    """Mark submitted entries older than the review reminder threshold."""
    threshold = timezone.now() - timedelta(hours=48)
    entries = LogbookEntry.objects.filter(
        status=LogbookStatus.SUBMITTED,
        submitted_at__lte=threshold,
        reminder_sent_at__isnull=True,
    )
    count = 0
    for entry in entries:
        entry.reminder_sent_at = timezone.now()
        entry.save(update_fields=["reminder_sent_at", "updated_at"])
        events.emit(
            events.review_overdue,
            sender=remind_pending_reviews,
            entry_id=entry.id,
            placement_id=entry.placement_id,
            level="reminder",
        )
        count += 1
    return count


@shared_task
def escalate_overdue():
    """Mark submitted entries older than the escalation threshold."""
    threshold = timezone.now() - timedelta(hours=72)
    entries = LogbookEntry.objects.filter(
        status=LogbookStatus.SUBMITTED,
        submitted_at__lte=threshold,
        escalated_at__isnull=True,
    )
    count = 0
    for entry in entries:
        entry.escalated_at = timezone.now()
        entry.save(update_fields=["escalated_at", "updated_at"])
        events.emit(
            events.review_overdue,
            sender=escalate_overdue,
            entry_id=entry.id,
            placement_id=entry.placement_id,
            level="escalation",
        )
        count += 1
    return count


@shared_task
def flag_missing_weeks():
    """Create idempotent missing-week flags when placement data is available."""
    try:
        from django.apps import apps

        from apps.core.utils.timeutils import weeks_between

        placement_model = apps.get_model("placements", "Placement")
    except LookupError:
        return 0

    count = 0
    placements = placement_model.objects.filter(status="APPROVED")
    for raw_placement in placements:
        placement = cast(PlacementLike, raw_placement)
        existing = set(
            LogbookEntry.objects.filter(placement_id=placement.id).values_list(
                "week_start",
                flat=True,
            )
        )
        for week in weeks_between(
            placement.start_date,
            min(placement.end_date, timezone.now().date()),
        ):
            if week in existing:
                continue
            _, created = IntegrityFlag.objects.get_or_create(
                placement_id=placement.id,
                entry=None,
                type=FlagType.MISSING_WEEK,
                defaults={"detail": f"No submitted entry was found for week {week}."},
            )
            if created:
                events.emit(
                    events.week_missing,
                    sender=flag_missing_weeks,
                    placement_id=placement.id,
                    week_start=week,
                )
                count += 1
    return count
