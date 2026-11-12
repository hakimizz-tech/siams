"""Permission classes for logbook API actions."""

from apps.core.permissions import (
    IsAcademicSupervisor,
    IsCoordinator,
    IsStudent,
    IsSupervisor,
    IsWorkplaceSupervisor,
)

__all__ = [
    "IsAcademicSupervisor",
    "IsCoordinator",
    "IsStudent",
    "IsSupervisor",
    "IsWorkplaceSupervisor",
]
