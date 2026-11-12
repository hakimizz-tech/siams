from rest_framework.exceptions import NotFound, ValidationError

from apps.core.exceptions import InvalidTransition, RuleViolation, api_exception_handler


def test_domain_error_becomes_envelope_with_its_status():
    response = api_exception_handler(RuleViolation("Too many hours.", code="hours_exceed"), {})
    assert response.status_code == 422
    assert response.data == {"code": "hours_exceed", "message": "Too many hours.", "details": {}}


def test_invalid_transition_is_409():
    response = api_exception_handler(InvalidTransition(), {})
    assert response.status_code == 409
    assert response.data["code"] == "invalid_transition"


def test_validation_error_keeps_field_details():
    response = api_exception_handler(ValidationError({"hours": ["Too big."]}), {})
    assert response.status_code == 400
    assert response.data["code"] == "validation_error"
    assert "hours" in response.data["details"]


def test_drf_errors_use_the_same_envelope():
    response = api_exception_handler(NotFound(), {})
    assert response.status_code == 404
    assert set(response.data) == {"code", "message", "details"}
