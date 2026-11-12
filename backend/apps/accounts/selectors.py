import uuid
from collections.abc import Iterable

from apps.core.enums import Role

from .models import User


def _with_profiles(queryset):
    return queryset.select_related("student_profile", "supervisor_profile__organization")


def get_user(user_id: uuid.UUID):
    """Return the user or None."""
    return User.objects.filter(pk=user_id).first()


def get_users(user_ids: Iterable[uuid.UUID]):
    return User.objects.filter(pk__in=list(user_ids))


def users_with_role(role: str):
    """Active users with the role (for example every coordinator, for emails)."""
    return User.objects.filter(role=role, is_active=True)


def get_active_user_with_role(user_id, role: str):
    return User.objects.filter(pk=user_id, role=role, is_active=True).first()


def user_with_profiles(user_id):
    return _with_profiles(User.objects.all()).get(pk=user_id)


def users_visible_to(user):
    """Only coordinators manage users."""
    queryset = _with_profiles(User.objects.all())
    return queryset if getattr(user, "role", None) == Role.COORDINATOR else queryset.none()


def supervisors_visible_to(user):
    queryset = users_visible_to(user)
    return queryset.filter(
        role__in=[Role.WORKPLACE_SUPERVISOR, Role.ACADEMIC_SUPERVISOR], is_active=True
    )
