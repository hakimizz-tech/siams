from django.conf import settings
from django.db import models
from django.db.models import F, Q
from simple_history.models import HistoricalRecords

from apps.core.exceptions import InvalidTransition
from apps.core.models import BaseModel, SoftDeleteModel


class InternshipPeriod(BaseModel):
    class Type(models.TextChoices):
        INTERNSHIP = "INTERNSHIP", "Internship"
        ATTACHMENT = "ATTACHMENT", "Attachment"

    name = models.CharField(max_length=150)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.ATTACHMENT)
    start_date = models.DateField()
    end_date = models.DateField()
    required_hours = models.PositiveIntegerField(default=400)
    min_visits = models.PositiveSmallIntegerField(default=2)
    assessment_opens_on = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_date__gte=F("start_date")), name="period_dates_ordered"
            ),
        ]

    def __str__(self):
        return self.name


class GradeBand(BaseModel):
    """A grade starts at min_percent: e.g. 70 -> A, 60 -> B, 0 -> F."""

    period = models.ForeignKey(
        InternshipPeriod, on_delete=models.CASCADE, related_name="grade_bands"
    )
    min_percent = models.DecimalField(max_digits=5, decimal_places=2)
    label = models.CharField(max_length=20)

    class Meta:
        ordering = ["-min_percent"]
        constraints = [
            models.UniqueConstraint(fields=["period", "min_percent"], name="uniq_band_percent"),
            models.UniqueConstraint(fields=["period", "label"], name="uniq_band_label"),
            models.CheckConstraint(
                condition=Q(min_percent__gte=0, min_percent__lte=100), name="band_percent_range"
            ),
        ]

    def __str__(self):
        return f"{self.label} (from {self.min_percent}%)"


class Organization(SoftDeleteModel):
    """A host organisation. Students may submit new ones; a coordinator verifies them."""

    name = models.CharField(max_length=150)
    address = models.CharField(max_length=255, blank=True)
    county = models.CharField(max_length=80, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    is_verified = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_organizations",
    )

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["name"], name="organization_name_idx")]

    def __str__(self):
        return self.name


class Placement(SoftDeleteModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        RETURNED = "RETURNED", "Returned"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        COMPLETED = "COMPLETED", "Completed"
        TERMINATED = "TERMINATED", "Terminated"

    TRANSITIONS = {
        Status.DRAFT: {Status.SUBMITTED},
        Status.SUBMITTED: {Status.APPROVED, Status.RETURNED, Status.REJECTED},
        Status.RETURNED: {Status.SUBMITTED},
        Status.APPROVED: {Status.COMPLETED, Status.TERMINATED},
        Status.REJECTED: set(),
        Status.COMPLETED: set(),
        Status.TERMINATED: set(),
    }

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="placements"
    )
    period = models.ForeignKey(
        InternshipPeriod, on_delete=models.PROTECT, related_name="placements"
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="placements"
    )
    academic_supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="academic_placements",
    )
    workplace_supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="workplace_placements",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    role_title = models.CharField(max_length=150, blank=True)
    department = models.CharField(max_length=150, blank=True)
    task_description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    proposed_supervisor_name = models.CharField(max_length=150, blank=True)
    proposed_supervisor_email = models.EmailField(blank=True)
    proposed_supervisor_phone = models.CharField(max_length=32, blank=True)
    coordinator_remarks = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"], name="placement_status_idx"),
            models.Index(fields=["workplace_supervisor"], name="placement_workplace_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_date__gte=F("start_date")), name="placement_dates_ordered"
            ),
            models.CheckConstraint(
                condition=~Q(status__in=["APPROVED", "COMPLETED"])
                | Q(academic_supervisor__isnull=False, workplace_supervisor__isnull=False),
                name="approved_requires_supervisors",
            ),
            models.UniqueConstraint(
                fields=["student", "period"],
                condition=~Q(status__in=["REJECTED", "TERMINATED"]) & Q(deleted_at__isnull=True),
                name="uniq_active_placement_per_student_period",
            ),
        ]

    def __str__(self):
        student_id = getattr(self, "student_id", self.student.pk)
        organization_id = getattr(self, "organization_id", self.organization.pk)
        status_labels = {str(value): str(label) for value, label in self.Status.choices}
        status = status_labels.get(str(self.status), str(self.status))
        return f"{student_id} @ {organization_id} ({status})"

    def ensure_transition(self, new_status) -> None:
        """Raise InvalidTransition unless the lifecycle allows current -> new_status."""
        if new_status not in self.TRANSITIONS.get(self.Status(self.status), set()):
            raise InvalidTransition(
                f"A {self.status.lower()} placement cannot become {str(new_status).lower()}."
            )

    def can_log_on(self, day) -> bool:
        return self.status == self.Status.APPROVED and self.start_date <= day <= self.end_date
