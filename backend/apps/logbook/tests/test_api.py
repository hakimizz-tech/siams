from uuid import uuid4

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StudentFactory


@pytest.mark.django_db
def test_student_can_create_and_read_weekly_entry():
    student = StudentFactory()
    client = APIClient()
    client.force_authenticate(student)
    placement_id = uuid4()
    payload = {
        "week_start": "2026-11-02",
        "summary": "Completed the first placement week.",
        "activities": [
            {
                "work_date": "2026-11-02",
                "hours": "8",
                "description": (
                    "Completed the assigned placement documentation and reviewed requirements."
                ),
            }
        ],
    }

    response = client.post(f"/api/v1/placements/{placement_id}/logbook/", payload, format="json")

    assert response.status_code == 201
    assert response.data["status"] == "DRAFT"
    assert response.data["activities"][0]["work_date"] == "2026-11-02"

    listing = client.get(f"/api/v1/placements/{placement_id}/logbook/")
    assert listing.status_code == 200
    assert len(listing.data) == 1
