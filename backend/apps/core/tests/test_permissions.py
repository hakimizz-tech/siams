from types import SimpleNamespace

from apps.core.enums import Role
from apps.core.permissions import IsCoordinator, roles_required


def _request(role=None, authenticated=True):
    user = SimpleNamespace(is_authenticated=authenticated, role=role)
    return SimpleNamespace(user=user)


def test_role_allowed_and_denied():
    assert IsCoordinator().has_permission(_request(Role.COORDINATOR), None)
    assert not IsCoordinator().has_permission(_request(Role.STUDENT), None)


def test_anonymous_is_denied():
    assert not IsCoordinator().has_permission(_request(Role.COORDINATOR, authenticated=False), None)


def test_roles_required_builds_a_class_for_several_roles():
    permission = roles_required(Role.STUDENT, Role.COORDINATOR)()
    assert permission.has_permission(_request(Role.STUDENT), None)
    assert permission.has_permission(_request(Role.COORDINATOR), None)
    assert not permission.has_permission(_request(Role.ACADEMIC_SUPERVISOR), None)
