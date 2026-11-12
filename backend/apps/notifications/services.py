"""Notification composition and channel dispatch."""

from dataclasses import dataclass
from typing import Any

from .channels import EmailChannel, NotificationChannel


@dataclass(frozen=True)
class NotificationTemplate:
    subject: str
    body: str


TEMPLATES = {
    "placement_submitted": NotificationTemplate(
        "Placement submitted",
        "A student has submitted a placement for coordinator review.",
    ),
    "placement_approved": NotificationTemplate(
        "Placement approved",
        "Your placement has been approved.",
    ),
    "placement_returned": NotificationTemplate(
        "Placement returned for changes",
        "Your placement was returned for changes.\n\nRemarks: {remarks}",
    ),
    "placement_rejected": NotificationTemplate(
        "Placement rejected",
        "Your placement was rejected.\n\nRemarks: {remarks}",
    ),
    "workplace_supervisor_invited": NotificationTemplate(
        "Workplace supervisor invitation",
        "You have been invited as a workplace supervisor.",
    ),
    "logbook_submitted": NotificationTemplate(
        "Logbook awaiting review",
        "A student logbook entry is ready for your review.",
    ),
    "logbook_approved": NotificationTemplate(
        "Logbook approved",
        "Your logbook entry has been approved.",
    ),
    "logbook_returned": NotificationTemplate(
        "Logbook returned for changes",
        "Your logbook entry was returned for changes.\n\nComment: {comment}",
    ),
    "feedback_added": NotificationTemplate(
        "New logbook feedback",
        "New feedback has been added to your logbook entry.",
    ),
    "review_overdue": NotificationTemplate(
        "Logbook review overdue",
        "A logbook review is overdue. Please review it as soon as possible.",
    ),
    "week_missing": NotificationTemplate(
        "Missing logbook week",
        "A logbook week is missing from your placement record.",
    ),
    "visit_scheduled": NotificationTemplate(
        "Visit scheduled",
        "An academic supervisor visit has been scheduled for your placement.",
    ),
    "final_report_submitted": NotificationTemplate(
        "Final report awaiting review",
        "A final report is ready for your review.",
    ),
    "final_report_accepted": NotificationTemplate(
        "Final report accepted",
        "Your final report has been accepted.",
    ),
    "final_report_returned": NotificationTemplate(
        "Final report returned for changes",
        "Your final report was returned for changes.\n\nFeedback: {feedback}",
    ),
    "assessment_due": NotificationTemplate(
        "Assessment due",
        "The assessment form '{form_name}' is waiting for your submission.",
    ),
    "result_finalized": NotificationTemplate(
        "Internship result finalized",
        "Your internship result has been finalized and is available in the system.",
    ),
    "notice_posted": NotificationTemplate(
        "New notice",
        "{title}\n\n{body}",
    ),
}


class NotificationService:
    """Render a notification and deliver it through the selected channel."""

    def __init__(self, channel: NotificationChannel | None = None):
        self.channel = channel or EmailChannel()

    def notify(self, user, notification_type: str, context: dict[str, Any] | None = None) -> int:
        try:
            template = TEMPLATES[notification_type]
        except KeyError as exc:
            raise ValueError(f"Unknown notification type: {notification_type}") from exc
        values = context or {}
        subject = template.subject.format(**values)
        body = template.body.format(**values)
        return self.channel.send(user, subject, body)
