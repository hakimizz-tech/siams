"""Database models for academic supervisor visits."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class VisitMode(models.TextChoices):
    PHONE = "PHONE", "Phone"
    VIDEO = "VIDEO", "Video"
    ONSITE = "ONSITE", "On-site"


class VisitStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class Visit(BaseModel):
    """A scheduled or completed visit for one placement."""

    placement_id = models.UUIDField(db_index=True)
    student_id = models.UUIDField(db_index=True)
    academic_supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="academic_visits",
    )
    workplace_supervisor_id = models.UUIDField(null=True, blank=True, db_index=True)
    mode = models.CharField(max_length=16, choices=VisitMode.choices)
    scheduled_at = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=16,
        choices=VisitStatus.choices,
        default=VisitStatus.SCHEDULED,
    )
    meeting_link = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    findings = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["scheduled_at"]
        indexes = [
            models.Index(
                fields=["academic_supervisor", "status", "scheduled_at"],
                name="visit_sup_status_date_idx",
            ),
            models.Index(
                fields=["placement_id", "status"],
                name="visit_placement_status_idx",
            ),
        ]

    def __str__(self):
        return f"{self.mode} visit for placement {self.placement_id}"
