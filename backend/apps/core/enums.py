"""Enumerations shared by every app. Import roles from here, never redefine them."""

from django.db import models


class Role(models.TextChoices):
    STUDENT = "STUDENT", "Student"
    WORKPLACE_SUPERVISOR = "WORKPLACE_SUPERVISOR", "Workplace Supervisor"
    ACADEMIC_SUPERVISOR = "ACADEMIC_SUPERVISOR", "Academic Supervisor"
    COORDINATOR = "COORDINATOR", "Coordinator"
