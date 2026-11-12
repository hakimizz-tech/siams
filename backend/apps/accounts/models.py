from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models.functions import Lower

from apps.core.enums import Role
from apps.core.models import BaseModel

from .managers import UserManager


class User(BaseModel, AbstractBaseUser, PermissionsMixin):
    """Email-based login; one role per user. Deactivate with is_active, never delete."""

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=32, blank=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.STUDENT)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("email"), name="uniq_user_email_ci"),
        ]
        indexes = [models.Index(fields=["role", "is_active"], name="user_role_active_idx")]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class StudentProfile(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_profile"
    )
    registration_number = models.CharField(max_length=50, unique=True)
    programme = models.CharField(max_length=150, blank=True)
    year_of_study = models.PositiveSmallIntegerField(null=True, blank=True)

    def __str__(self):
        return self.registration_number


class SupervisorProfile(BaseModel):
    """Workplace supervisors belong to an organisation; academic supervisors do not."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="supervisor_profile"
    )
    organization = models.ForeignKey(
        "placements.Organization",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="supervisors",
    )
    job_title = models.CharField(max_length=150, blank=True)
    department = models.CharField(max_length=150, blank=True)

    def __str__(self):
        user_id = getattr(self, "user_id", self.user.pk)
        return f"{self.job_title or 'Supervisor'} ({user_id})"
