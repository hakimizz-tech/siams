"""Platform smoke tests: the scaffold boots, authenticates and documents itself."""

import pytest

from apps.accounts.tests.factories import DEFAULT_PASSWORD

pytestmark = pytest.mark.django_db


def test_health_endpoint_is_ok(api_client):
    response = api_client.get("/health/", HTTP_ACCEPT="application/json")
    assert response.status_code == 200


def test_openapi_schema_is_served(api_client):
    response = api_client.get("/api/schema/")
    assert response.status_code == 200


def test_swagger_ui_is_served(api_client):
    response = api_client.get("/api/docs/")
    assert response.status_code == 200


def test_protected_endpoint_returns_the_error_envelope(api_client):
    response = api_client.get("/api/v1/auth/user/")
    assert response.status_code == 401
    assert set(response.json()) == {"code", "message", "details"}


def test_login_returns_access_token_and_httponly_refresh_cookie(api_client, make_user):
    user = make_user(email="student@example.com")
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": DEFAULT_PASSWORD},
        format="json",
    )
    assert response.status_code == 200, response.content
    assert response.json()["access"]
    cookie = response.cookies["siams-refresh"]
    assert cookie["httponly"]
    assert cookie["samesite"] == "Strict"


def test_access_token_unlocks_the_current_user_endpoint(api_client, make_user):
    user = make_user(email="me@example.com")
    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": DEFAULT_PASSWORD},
        format="json",
    )
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")
    response = api_client.get("/api/v1/auth/user/")
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_wrong_password_is_rejected(api_client, make_user):
    user = make_user(email="wrong@example.com")
    response = api_client.post(
        "/api/v1/auth/login/", {"email": user.email, "password": "nope"}, format="json"
    )
    assert response.status_code == 400


def test_admin_login_page_renders(client):
    assert client.get("/admin/login/").status_code == 200
