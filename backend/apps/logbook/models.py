"""Database models for weekly logbooks and their review evidence."""

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import BaseModel
from apps.core.storage import dated_upload_path


class LogbookStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    APPROVED = "APPROVED", "Approved"
    RETURNED = "RETURNED", "Returned"


class FeedbackKind(models.TextChoices):
    WORKPLACE = "WORKPLACE", "Workplace supervisor"
    ACADEMIC = "ACADEMIC", "Academic supervisor"
    COORDINATOR = "COORDINATOR", "Coordinator"


class FlagType(models.TextChoices):
    HOURS_OUTLIER = "HOURS_OUTLIER", "Hours outlier"
    DUPLICATE_CONTENT = "DUPLICATE_CONTENT", "Duplicate content"
    LATE_SUBMISSION = "LATE_SUBMISSION", "Late submission"
    HOURS_ADJUSTED = "HOURS_ADJUSTED", "Hours adjusted"
    OFF_DAY_WORK = "OFF_DAY_WORK", "Off-day work"
    MISSING_WEEK = "MISSING_WEEK", "Missing week"


class RuleOutcome(models.TextChoices):
    PASS = "PASS", "Pass"
    FLAG = "FLAG", "Flag"
    REJECT = "REJECT", "Reject"


class LogbookEntry(BaseModel):
    """One student's weekly logbook entry."""

    placement_id = models.UUIDField(db_index=True)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="logbook_entries",
    )
    workplace_supervisor_id = models.UUIDField(null=True, blank=True, db_index=True)
    academic_supervisor_id = models.UUIDField(null=True, blank=True, db_index=True)
    week_start = models.DateField()
    summary = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=LogbookStatus.choices,
        default=LogbookStatus.DRAFT,
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["placement_id", "week_start"],
                name="unique_logbook_week",
            ),
        ]
        indexes = [
            models.Index(
                fields=["status", "submitted_at"],
                name="logbook_status_submitted_idx",
            ),
        ]
        ordering = ["week_start"]

    def __str__(self):
        return f"{self.student_id} - {self.week_start}"

    @property
    def claimed_hours(self) -> Decimal:
        return sum((activity.hours for activity in self.activities.all()), Decimal("0"))

    @property
    def approved_hours(self) -> Decimal:
        return sum(
            (activity.approved_hours for activity in self.activities.all()),
            Decimal("0"),
        )


class DailyActivity(BaseModel):
    """A dated activity line inside a weekly entry."""

    entry = models.ForeignKey(
        LogbookEntry,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    work_date = models.DateField()
    hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    approved_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    description = models.TextField()
    content_hash = models.CharField(max_length=64, blank=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["entry", "work_date"],
                name="unique_daily_activity_date",
            ),
            models.CheckConstraint(
                condition=models.Q(hours__gt=0) & models.Q(hours__lte=12),
                name="daily_hours_between_zero_and_twelve",
            ),
            models.CheckConstraint(
                condition=models.Q(approved_hours__gte=0)
                & models.Q(approved_hours__lte=models.F("hours")),
                name="approved_hours_not_above_claimed",
            ),
        ]
        ordering = ["work_date"]

    def __str__(self):
        return f"{self.entry_id} - {self.work_date}"


class LogbookImage(BaseModel):
    """An optional, processed image attached to a weekly entry."""

    entry = models.ForeignKey(
        LogbookEntry,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to=dated_upload_path("logbook"))
    original_name = models.CharField(max_length=255)
    size_bytes = models.PositiveIntegerField()
    caption = models.CharField(max_length=255, blank=True)
    work_date = models.DateField(null=True, blank=True)


class LogbookFeedback(BaseModel):
    """A review comment attached to a weekly entry."""

    entry = models.ForeignKey(
        LogbookEntry,
        on_delete=models.CASCADE,
        related_name="feedback",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="logbook_feedback",
    )
    kind = models.CharField(max_length=16, choices=FeedbackKind.choices)
    comment = models.TextField()

    class Meta:
        ordering = ["created_at"]


class IntegrityFlag(BaseModel):
    """A non-blocking signal for a supervisor or coordinator."""

    placement_id = models.UUIDField(db_index=True)
    entry = models.ForeignKey(
        LogbookEntry,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="flags",
    )
    type = models.CharField(max_length=32, choices=FlagType.choices)
    detail = models.TextField()
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="resolved_logbook_flags",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["placement_id", "type", "entry"],
                name="unique_logbook_flag",
            ),
        ]
        indexes = [
            models.Index(fields=["resolved", "type"], name="logbook_flag_resolved_type_idx"),
        ]
