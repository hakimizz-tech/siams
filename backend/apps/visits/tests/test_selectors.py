from datetime import timedelta
from uuid import uuid4

import pytest
from django.utils import timezone

from apps.accounts.tests.factories import (
    AcademicSupervisorFactory,
    StudentFactory,
)
from apps.visits.models import Visit
from apps.visits.selectors import completed_visit_counts, upcoming_visits_for


@pytest.mark.django_db
def test_upcoming_visits_are_scoped_to_academic_supervisor():
    supervisor = AcademicSupervisorFactory()
    other_supervisor = AcademicSupervisorFactory()
    student = StudentFactory()
    common = {
        "placement_id": uuid4(),
        "student_id": student.id,
        "mode": "PHONE",
        "scheduled_at": timezone.now() + timedelta(days=1),
    }
    Visit.objects.create(academic_supervisor=supervisor, **common)
    Visit.objects.create(
        academic_supervisor=other_supervisor,
        **{**common, "placement_id": uuid4()},
    )

    visits = upcoming_visits_for(supervisor)

    assert list(visits.values_list("academic_supervisor_id", flat=True)) == [supervisor.id]


@pytest.mark.django_db
def test_completed_visit_counts_are_grouped_by_placement():
    supervisor = AcademicSupervisorFactory()
    student = StudentFactory()
    placement_id = uuid4()
    for status in ("COMPLETED", "COMPLETED", "CANCELLED"):
        Visit.objects.create(
            placement_id=placement_id,
            student_id=student.id,
            academic_supervisor=supervisor,
            mode="ONSITE",
            scheduled_at=timezone.now() + timedelta(days=1),
            status=status,
        )

    assert completed_visit_counts([placement_id]) == {placement_id: 2}
