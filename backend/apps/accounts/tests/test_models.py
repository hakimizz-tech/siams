import pytest
from django.db import IntegrityError

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.enums import Role

pytestmark = pytest.mark.django_db


def test_user_gets_uuid_pk_and_default_role():
    user = UserFactory()
    assert len(str(user.pk)) == 36
    assert user.role == Role.STUDENT


def test_email_is_unique_case_insensitively():
    UserFactory(email="Case@Example.com")
    with pytest.raises(IntegrityError):
        UserFactory(email="case@example.com")


def test_create_superuser_is_coordinator():
    admin = User.objects.create_superuser("boss@example.com", "Password123!", full_name="Boss")
    assert admin.role == Role.COORDINATOR
    assert admin.is_staff and admin.is_superuser


def test_natural_key_lookup_ignores_case():
    user = UserFactory(email="lower@example.com")
    assert User.objects.get_by_natural_key("LOWER@example.com") == user
