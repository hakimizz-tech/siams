"""Domain-event receivers that enqueue email delivery."""

import logging
from collections.abc import Iterable
from typing import Any, Protocol, cast

from django.dispatch import receiver

from apps.accounts.selectors import get_user, users_with_role
from apps.core import events
from apps.core.enums import Role
from apps.placements.selectors import placement_participants

from .tasks import send_email, send_notice_emails

logger = logging.getLogger(__name__)


class AsyncTask(Protocol):
    def delay(self, *args: Any, **kwargs: Any) -> Any: ...


def _enqueue(user: Any, notification_type: str, context: dict[str, Any] | None = None):
    if user is not None:
        task = cast(AsyncTask, send_email)
        task.delay(str(user.id), notification_type, context or {})


def _enqueue_many(
    users: Iterable[Any],
    notification_type: str,
    context: dict[str, Any] | None = None,
):
    for user in users:
        _enqueue(user, notification_type, context)


def _participant(placement_id, name):
    participants = placement_participants(placement_id)
    return getattr(participants, name, None)


@receiver(events.placement_submitted)
def on_placement_submitted(sender, placement_id, actor_id, **kwargs):
    _enqueue_many(
        cast(Iterable[Any], users_with_role(Role.COORDINATOR)),
        "placement_submitted",
        {"placement_id": placement_id},
    )


@receiver(events.placement_approved)
def on_placement_approved(sender, placement_id, actor_id, **kwargs):
    participants = placement_participants(placement_id)
    _enqueue_many(
        [
            getattr(participants, name, None)
            for name in ("student", "academic_supervisor", "workplace_supervisor")
        ],
        "placement_approved",
        {"placement_id": placement_id},
    )


@receiver(events.placement_returned)
def on_placement_returned(sender, placement_id, actor_id, remarks, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "placement_returned",
        {"placement_id": placement_id, "remarks": remarks},
    )


@receiver(events.placement_rejected)
def on_placement_rejected(sender, placement_id, actor_id, remarks, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "placement_rejected",
        {"placement_id": placement_id, "remarks": remarks},
    )


@receiver(events.workplace_supervisor_invited)
def on_workplace_supervisor_invited(sender, user_id, placement_id, **kwargs):
    _enqueue(get_user(user_id), "workplace_supervisor_invited", {"placement_id": placement_id})


@receiver(events.logbook_submitted)
def on_logbook_submitted(sender, placement_id, entry_id, actor_id, **kwargs):
    _enqueue(
        _participant(placement_id, "workplace_supervisor"),
        "logbook_submitted",
        {"placement_id": placement_id, "entry_id": entry_id},
    )


@receiver(events.logbook_approved)
def on_logbook_approved(sender, placement_id, entry_id, actor_id, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "logbook_approved",
        {"placement_id": placement_id, "entry_id": entry_id},
    )


@receiver(events.logbook_returned)
def on_logbook_returned(sender, placement_id, entry_id, actor_id, comment, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "logbook_returned",
        {"placement_id": placement_id, "entry_id": entry_id, "comment": comment},
    )


@receiver(events.feedback_added)
def on_feedback_added(sender, placement_id, entry_id, actor_id, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "feedback_added",
        {"placement_id": placement_id, "entry_id": entry_id},
    )


@receiver(events.review_overdue)
def on_review_overdue(sender, placement_id, entry_id, level, **kwargs):
    recipient = (
        _participant(placement_id, "academic_supervisor")
        if level == "escalation"
        else _participant(placement_id, "workplace_supervisor")
    )
    _enqueue(
        recipient,
        "review_overdue",
        {"placement_id": placement_id, "entry_id": entry_id, "level": level},
    )


@receiver(events.week_missing)
def on_week_missing(sender, placement_id, week_start, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "week_missing",
        {"placement_id": placement_id, "week_start": week_start},
    )


@receiver(events.visit_scheduled)
def on_visit_scheduled(sender, placement_id, visit_id, actor_id, **kwargs):
    participants = placement_participants(placement_id)
    _enqueue_many(
        [
            getattr(participants, "student", None),
            getattr(participants, "workplace_supervisor", None),
        ],
        "visit_scheduled",
        {"placement_id": placement_id, "visit_id": visit_id},
    )


@receiver(events.final_report_submitted)
def on_final_report_submitted(sender, placement_id, report_id, actor_id, **kwargs):
    _enqueue(
        _participant(placement_id, "academic_supervisor"),
        "final_report_submitted",
        {"placement_id": placement_id, "report_id": report_id},
    )


@receiver(events.final_report_accepted)
def on_final_report_accepted(sender, placement_id, report_id, actor_id, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "final_report_accepted",
        {"placement_id": placement_id, "report_id": report_id},
    )


@receiver(events.final_report_returned)
def on_final_report_returned(sender, placement_id, report_id, actor_id, feedback, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "final_report_returned",
        {"placement_id": placement_id, "report_id": report_id, "feedback": feedback},
    )


@receiver(events.result_finalized)
def on_result_finalized(sender, placement_id, actor_id, **kwargs):
    _enqueue(
        _participant(placement_id, "student"),
        "result_finalized",
        {"placement_id": placement_id},
    )


@receiver(events.notice_posted)
def on_notice_posted(sender, notice_id, actor_id, **kwargs):
    send_notice_emails.delay(str(notice_id))
