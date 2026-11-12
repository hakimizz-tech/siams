from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import CoordinatorFactory, StudentFactory
from apps.notices.models import NoticeAudience


@pytest.mark.django_db
def test_coordinator_posts_and_student_reads_matching_notices():
    coordinator = CoordinatorFactory()
    student = StudentFactory()
    coordinator_client = APIClient()
    coordinator_client.force_authenticate(coordinator)
    response = coordinator_client.post(
        "/api/v1/notices/",
        {
            "title": "Important update",
            "body": "Please review the new placement schedule.",
            "audience": NoticeAudience.STUDENT,
            "expires_at": (timezone.now() + timedelta(days=1)).isoformat(),
        },
        format="json",
    )

    assert response.status_code == 201
    student_client = APIClient()
    student_client.force_authenticate(student)
    listing = student_client.get("/api/v1/notices/")

    assert listing.status_code == 200
    assert listing.data[0]["title"] == "Important update"


@pytest.mark.django_db
def test_student_cannot_post_notice():
    client = APIClient()
    client.force_authenticate(StudentFactory())

    response = client.post(
        "/api/v1/notices/",
        {
            "title": "Not allowed",
            "body": "Students cannot publish notices.",
            "audience": NoticeAudience.ALL,
        },
        format="json",
    )

    assert response.status_code == 403
