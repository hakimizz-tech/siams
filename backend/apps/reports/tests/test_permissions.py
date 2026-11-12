"""Role matrix for the reports endpoints: wrong role 403, anonymous 401, right role not 403."""

import uuid

import pytest

from apps.core.enums import Role

pytestmark = pytest.mark.django_db

S, WS, AS, C = (
    Role.STUDENT.value,
    Role.WORKPLACE_SUPERVISOR.value,
    Role.ACADEMIC_SUPERVISOR.value,
    Role.COORDINATOR.value,
)
ALL_ROLES = {S, WS, AS, C}

ENDPOINTS = [
    ("get", "/api/v1/dashboard/student/", {S}),
    ("get", "/api/v1/dashboard/academic-supervisor/", {AS}),
    ("get", "/api/v1/dashboard/workplace-supervisor/", {WS}),
    ("get", "/api/v1/dashboard/coordinator/", {C}),
    ("get", "/api/v1/reports/periods/{id}/summary/", {C, AS}),
    ("post", "/api/v1/reports/export/", {C, AS}),
    ("get", "/api/v1/reports/export/{id}/", {C, AS}),
    ("get", "/api/v1/reports/export/{id}/file/", {C, AS}),
]


@pytest.mark.parametrize(("method", "template", "allowed"), ENDPOINTS)
def test_permission_matrix(api_client, auth_client, make_user, beta, method, template, allowed):
    url = template.replace("{id}", str(uuid.uuid4()))

    assert getattr(api_client, method)(url).status_code == 401

    for role in sorted(ALL_ROLES - allowed):
        response = getattr(auth_client(make_user(role=role)), method)(url)
        assert response.status_code == 403, f"{role} on {method.upper()} {url}"

    for role in sorted(allowed):
        response = getattr(auth_client(make_user(role=role)), method)(url)
        assert response.status_code not in (401, 403), f"{role} on {method.upper()} {url}"


def test_placement_summary_requires_login(api_client):
    url = f"/api/v1/placements/{uuid.uuid4()}/summary/"
    assert api_client.get(url).status_code == 401
