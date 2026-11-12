from datetime import timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import AcademicSupervisorFactory, StudentFactory
from apps.visits.models import Visit


@pytest.mark.django_db
def test_academic_supervisor_can_list_and_filter_visits():
    supervisor = AcademicSupervisorFactory()
    student = StudentFactory()
    Visit.objects.create(
        placement_id=uuid4(),
        student_id=student.id,
        academic_supervisor=supervisor,
        mode="VIDEO",
        scheduled_at=timezone.now() + timedelta(days=2),
    )
    client = APIClient()
    client.force_authenticate(supervisor)

    response = client.get("/api/v1/visits/?status=SCHEDULED")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["mode"] == "VIDEO"
