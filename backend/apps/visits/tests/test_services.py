from datetime import datetime, time, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from django.utils import timezone

from apps.accounts.tests.factories import (
    AcademicSupervisorFactory,
    StudentFactory,
    WorkplaceSupervisorFactory,
)
from apps.core.exceptions import InvalidTransition, RuleViolation
from apps.visits.models import VisitStatus
from apps.visits.services import VisitService


def make_placement(student, workplace_supervisor):
    return SimpleNamespace(
        id=uuid4(),
        student_id=student.id,
        workplace_supervisor_id=(workplace_supervisor.id if workplace_supervisor else None),
        status="APPROVED",
    )


def future_time():
    tomorrow = timezone.localdate() + timedelta(days=1)
    return timezone.make_aware(datetime.combine(tomorrow, time(10)))


@pytest.mark.django_db
def test_academic_supervisor_can_schedule_and_complete_visit():
    student = StudentFactory()
    workplace_supervisor = WorkplaceSupervisorFactory()
    academic_supervisor = AcademicSupervisorFactory()
    visit = VisitService().schedule(
        make_placement(student, workplace_supervisor),
        academic_supervisor,
        {
            "mode": "VIDEO",
            "scheduled_at": future_time(),
            "meeting_link": "https://example.com/visit",
            "notes": "Review progress and discuss the next assignment.",
        },
    )

    assert visit.status == VisitStatus.SCHEDULED
    completed = VisitService().complete(
        visit,
        academic_supervisor,
        "The student demonstrated progress and received feedback.",
    )
    assert completed.status == VisitStatus.COMPLETED
    assert completed.completed_at is not None


@pytest.mark.django_db
def test_scheduling_in_the_past_is_rejected():
    student = StudentFactory()
    academic_supervisor = AcademicSupervisorFactory()
    with pytest.raises(RuleViolation, match="future"):
        VisitService().schedule(
            make_placement(student, None),
            academic_supervisor,
            {"mode": "PHONE", "scheduled_at": timezone.now() - timedelta(minutes=1)},
        )


@pytest.mark.django_db
def test_completed_visit_cannot_be_completed_again():
    student = StudentFactory()
    academic_supervisor = AcademicSupervisorFactory()
    visit = VisitService().schedule(
        make_placement(student, None),
        academic_supervisor,
        {"mode": "ONSITE", "scheduled_at": future_time()},
    )
    VisitService().complete(visit, academic_supervisor, "Visit findings recorded.")

    with pytest.raises(InvalidTransition):
        VisitService().complete(visit, academic_supervisor, "Another finding.")
