"""Notification delivery channels."""

from typing import Protocol

from django.conf import settings
from django.core.mail import send_mail


class NotificationChannel(Protocol):
    """Interface implemented by notification delivery channels."""

    def send(self, recipient, subject: str, body: str) -> int:
        """Deliver a message and return the provider result."""
        ...


class EmailChannel:
    """Deliver notifications through Django's configured email backend."""

    def send(self, recipient, subject: str, body: str) -> int:
        if not recipient.email:
            return 0
        return send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [recipient.email],
            fail_silently=False,
        )
