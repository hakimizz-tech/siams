"""Role-based permission classes. Object-level scoping lives in each app's selectors."""

from rest_framework.permissions import BasePermission

from .enums import Role


class HasRole(BasePermission):
    """Allow authenticated users whose role is in `allowed_roles`."""

    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.allowed_roles)


def roles_required(*roles: str) -> type[HasRole]:
    """Build a permission class: permission_classes = [roles_required(Role.COORDINATOR)]."""
    return type("RolesRequired", (HasRole,), {"allowed_roles": tuple(roles)})


class IsStudent(HasRole):
    allowed_roles = (Role.STUDENT,)


class IsWorkplaceSupervisor(HasRole):
    allowed_roles = (Role.WORKPLACE_SUPERVISOR,)


class IsAcademicSupervisor(HasRole):
    allowed_roles = (Role.ACADEMIC_SUPERVISOR,)


class IsCoordinator(HasRole):
    allowed_roles = (Role.COORDINATOR,)


class IsSupervisor(HasRole):
    allowed_roles = (Role.WORKPLACE_SUPERVISOR, Role.ACADEMIC_SUPERVISOR)
