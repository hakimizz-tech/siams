"""Fixtures available to every test in every app (shared by both teams)."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    AcademicSupervisorFactory,
    CoordinatorFactory,
    StudentFactory,
    UserFactory,
    WorkplaceSupervisorFactory,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def make_user(db):
    """make_user(role="STUDENT", email=..., password=...) -> User"""
    return UserFactory


@pytest.fixture
def auth_client():
    """auth_client(user) -> APIClient authenticated as that user (no login round-trip)."""

    def _auth_client(user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    return _auth_client


@pytest.fixture
def student(db):
    return StudentFactory()


@pytest.fixture
def workplace_supervisor(db):
    return WorkplaceSupervisorFactory()


@pytest.fixture
def academic_supervisor(db):
    return AcademicSupervisorFactory()


@pytest.fixture
def coordinator(db):
    return CoordinatorFactory()
