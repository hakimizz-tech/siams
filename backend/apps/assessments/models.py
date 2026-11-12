from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q
from simple_history.models import HistoricalRecords

from apps.core.enums import Role
from apps.core.models import BaseModel
from apps.core.storage import dated_upload_path

ASSESSOR_ROLES = [
    (Role.WORKPLACE_SUPERVISOR.value, "Industrial Supervisor"),
    (Role.ACADEMIC_SUPERVISOR.value, "Academic Supervisor"),
]


class AssessmentForm(BaseModel):
    """One evaluation form of the official rubric. Versioned: locked once used."""

    period = models.ForeignKey(
        "placements.InternshipPeriod", on_delete=models.PROTECT, related_name="assessment_forms"
    )
    name = models.CharField(max_length=200)
    assessor_role = models.CharField(max_length=32, choices=ASSESSOR_ROLES)
    version = models.PositiveIntegerField(default=1)
    weight_percent = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default=True)
    is_locked = models.BooleanField(default=False)

    class Meta:
        ordering = ["assessor_role", "-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["period", "assessor_role", "version"], name="uniq_form_version"
            ),
            models.UniqueConstraint(
                fields=["period", "assessor_role"],
                condition=Q(is_active=True),
                name="uniq_active_form_per_role",
            ),
            models.CheckConstraint(
                condition=Q(weight_percent__gte=0, weight_percent__lte=100),
                name="form_weight_range",
            ),
        ]

    def __str__(self):
        return f"{self.name} v{self.version}"


class Criterion(BaseModel):
    class Type(models.TextChoices):
        SCORE = "SCORE", "Score"
        COMMENT = "COMMENT", "Comment only"

    form = models.ForeignKey(AssessmentForm, on_delete=models.CASCADE, related_name="criteria")
    code = models.CharField(max_length=20)
    section = models.CharField(max_length=150, blank=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.SCORE)
    max_score = models.PositiveIntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("1"))
    required = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["form", "code"], name="uniq_criterion_code"),
            models.CheckConstraint(
                condition=~Q(type="SCORE") | Q(max_score__isnull=False, max_score__gt=0),
                name="score_criterion_has_max",
            ),
        ]

    def __str__(self):
        return f"{self.code} {self.name}"


class Assessment(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"

    placement = models.ForeignKey(
        "placements.Placement", on_delete=models.PROTECT, related_name="assessments"
    )
    form = models.ForeignKey(AssessmentForm, on_delete=models.PROTECT, related_name="assessments")
    assessor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="assessments_made"
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    comment = models.TextField(blank=True)
    percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["placement", "form"], name="uniq_assessment_per_form"),
        ]

    def __str__(self):
        placement_id = getattr(self, "placement_id", self.placement.pk)
        return f"{self.form} for {placement_id} ({self.status})"


class AssessmentScore(BaseModel):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="scores")
    criterion = models.ForeignKey(Criterion, on_delete=models.PROTECT, related_name="scores")
    score = models.PositiveIntegerField(null=True, blank=True)
    remark = models.TextField(blank=True)

    class Meta:
        ordering = ["criterion__position"]
        constraints = [
            models.UniqueConstraint(
                fields=["assessment", "criterion"], name="uniq_score_per_criterion"
            ),
        ]

    def __str__(self):
        criterion_id = getattr(self, "criterion_id", self.criterion.pk)
        return f"{criterion_id}: {self.score}"


class FinalReport(BaseModel):
    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        ACCEPTED = "ACCEPTED", "Accepted"
        RETURNED = "RETURNED", "Returned"

    placement = models.OneToOneField(
        "placements.Placement", on_delete=models.PROTECT, related_name="final_report"
    )
    title = models.CharField(max_length=200, blank=True)
    document = models.FileField(upload_to=dated_upload_path("final_reports"), max_length=255)
    original_name = models.CharField(max_length=255)
    size_bytes = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SUBMITTED)
    feedback = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    history = HistoricalRecords()

    def __str__(self):
        placement_id = getattr(self, "placement_id", self.placement.pk)
        return f"Final report of {placement_id} ({self.status})"


class PlacementResult(BaseModel):
    """Snapshot written when the coordinator finalizes a placement's result."""

    placement = models.OneToOneField(
        "placements.Placement", on_delete=models.PROTECT, related_name="result"
    )
    total_percent = models.DecimalField(max_digits=5, decimal_places=2)
    grade = models.CharField(max_length=20, blank=True)
    breakdown = models.JSONField(default=list)
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    finalized_at = models.DateTimeField()

    history = HistoricalRecords()

    def __str__(self):
        return f"{self.total_percent}% ({self.grade})"
