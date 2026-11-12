"""Transactional write use cases for role-based announcements."""

from django.db import transaction
from django.utils import timezone

from apps.core import events
from apps.core.enums import Role
from apps.core.exceptions import DomainError, RuleViolation

from .models import Notice


class NoticeService:
    """Owns coordinator notice publication."""

    @transaction.atomic
    def post(self, coordinator, data):
        self._require_coordinator(coordinator)
        published_at = data.get("published_at", timezone.now())
        expires_at = data.get("expires_at")
        if expires_at is not None and expires_at <= published_at:
            raise RuleViolation("A notice must expire after it is published.")

        notice = Notice.objects.create(
            title=data["title"].strip(),
            body=data["body"].strip(),
            audience=data["audience"],
            published_at=published_at,
            expires_at=expires_at,
            send_email=data.get("send_email", False),
            created_by=coordinator,
        )
        events.emit(
            events.notice_posted,
            sender=type(self),
            notice_id=notice.id,
            actor_id=coordinator.id,
        )
        return notice

    @staticmethod
    def _require_coordinator(user):
        if getattr(user, "role", None) != Role.COORDINATOR:
            raise DomainError(
                "Only a coordinator can post notices.",
                code="forbidden",
            )
