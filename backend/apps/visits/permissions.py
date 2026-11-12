"""Permission classes used by visit endpoints."""

from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import (
    IsAcademicSupervisor,
)

__all__ = ["IsAcademicSupervisor", "IsAuthenticated"]
