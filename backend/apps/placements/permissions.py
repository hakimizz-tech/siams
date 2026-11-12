"""Role combinations used by placement endpoints."""

from apps.core.enums import Role
from apps.core.permissions import roles_required

IsStudentOrCoordinator = roles_required(Role.STUDENT, Role.COORDINATOR)
IsCoordinatorOrAcademicSupervisor = roles_required(Role.COORDINATOR, Role.ACADEMIC_SUPERVISOR)
