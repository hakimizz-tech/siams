from types import SimpleNamespace

from django.core import mail
from django.test import override_settings

from apps.notifications.channels import EmailChannel


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_email_channel_sends_to_recipient():
    recipient = SimpleNamespace(email="student@example.com")

    delivered = EmailChannel().send(recipient, "Subject", "Message")

    assert delivered == 1
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["student@example.com"]


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_email_channel_skips_recipient_without_email():
    assert EmailChannel().send(SimpleNamespace(email=""), "Subject", "Message") == 0
    assert mail.outbox == []
