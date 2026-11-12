"""Database models for role-based announcements."""

from django.conf import settings
from django.db import models

from apps.core.enums import Role
from apps.core.models import BaseModel


class NoticeAudience(models.TextChoices):
    ALL = "ALL", "Everyone"
    STUDENT = Role.STUDENT, "Students"
    WORKPLACE_SUPERVISOR = Role.WORKPLACE_SUPERVISOR, "Workplace supervisors"
    ACADEMIC_SUPERVISOR = Role.ACADEMIC_SUPERVISOR, "Academic supervisors"
    COORDINATOR = Role.COORDINATOR, "Coordinators"


class Notice(BaseModel):
    """An announcement posted by a coordinator for one audience."""

    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(
        max_length=32,
        choices=NoticeAudience.choices,
        db_index=True,
    )
    published_at = models.DateTimeField(db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    send_email = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="posted_notices",
    )

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(
                fields=["audience", "published_at"],
                name="notice_audience_published_idx",
            ),
        ]

    def __str__(self):
        return self.title
