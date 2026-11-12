import pytest

from apps.notifications.services import NotificationService


class RecordingChannel:
    def __init__(self):
        self.messages = []

    def send(self, recipient, subject, body):
        self.messages.append((recipient, subject, body))
        return 1


def test_notification_service_renders_template_and_dispatches():
    channel = RecordingChannel()
    recipient = object()

    delivered = NotificationService(channel).notify(
        recipient,
        "placement_returned",
        {"remarks": "Add the supervisor phone number."},
    )

    assert delivered == 1
    assert channel.messages == [
        (
            recipient,
            "Placement returned for changes",
            (
                "Your placement was returned for changes.\n\n"
                "Remarks: Add the supervisor phone number."
            ),
        )
    ]


def test_notification_service_rejects_unknown_type():
    with pytest.raises(ValueError, match="Unknown notification type"):
        NotificationService(RecordingChannel()).notify(object(), "unknown")
