"""Domain events: the ONLY way one team's code reacts to the other team's actions.

Emit from a service, after the state change, like this:

    from apps.core import events
    events.emit(events.placement_approved, sender=PlacementService,
                placement_id=placement.id, actor_id=actor.id)

React in `apps/notifications/receivers.py` (or any app's own receivers):

    @receiver(events.placement_approved)
    def on_placement_approved(sender, placement_id, actor_id, **kwargs): ...

Rules
  * Delivery is deferred with transaction.on_commit, so receivers never see
    uncommitted data and never run if the transaction rolls back.
  * Payloads carry ids and primitives only (UUIDs, strings), never model instances.
    Receivers fetch what they need through the owning app's selectors.
  * Receivers must be fast and must not raise; enqueue a Celery task for real work.
  * Adding or changing a payload is a contract change: update docs/CONTRACTS.md.
"""

from django.db import transaction
from django.dispatch import Signal


def emit(signal: Signal, *, sender, **payload) -> None:
    """Send `signal` once the surrounding transaction commits."""
    transaction.on_commit(lambda: signal.send(sender=sender, **payload))


#  placements (Team Alpha emits)
placement_submitted = Signal()  # placement_id, actor_id
placement_approved = Signal()  # placement_id, actor_id
placement_returned = Signal()  # placement_id, actor_id, remarks
placement_rejected = Signal()  # placement_id, actor_id, remarks
workplace_supervisor_invited = Signal()  # user_id, placement_id

#  logbook (Team Beta emits)
logbook_submitted = Signal()  # entry_id, placement_id, actor_id
logbook_approved = Signal()  # entry_id, placement_id, actor_id
logbook_returned = Signal()  # entry_id, placement_id, actor_id, comment
feedback_added = Signal()  # entry_id, placement_id, actor_id
review_overdue = Signal()  # entry_id, placement_id, level ("reminder" | "escalation")
week_missing = Signal()  # placement_id, week_start

#  visits, notices (Team Beta emits)
visit_scheduled = Signal()  # visit_id, placement_id, actor_id
notice_posted = Signal()  # notice_id, actor_id

#  assessments (Team Alpha emits)
final_report_submitted = Signal()  # placement_id, report_id, actor_id
final_report_accepted = Signal()  # placement_id, report_id, actor_id
final_report_returned = Signal()  # placement_id, report_id, actor_id, feedback
result_finalized = Signal()  # placement_id, actor_id

ALL_EVENTS = (
    placement_submitted,
    placement_approved,
    placement_returned,
    placement_rejected,
    workplace_supervisor_invited,
    logbook_submitted,
    logbook_approved,
    logbook_returned,
    feedback_added,
    review_overdue,
    week_missing,
    visit_scheduled,
    notice_posted,
    final_report_submitted,
    final_report_accepted,
    final_report_returned,
    result_finalized,
)
