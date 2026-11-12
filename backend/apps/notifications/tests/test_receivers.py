from types import SimpleNamespace
from uuid import uuid4

import pytest

from apps.accounts.tests.factories import (
    AcademicSupervisorFactory,
    CoordinatorFactory,
    StudentFactory,
    WorkplaceSupervisorFactory,
)
from apps.core import events
from apps.notifications import receivers


@pytest.mark.django_db
def test_placement_approved_enqueues_all_placement_participants(monkeypatch):
    student = StudentFactory()
    academic = AcademicSupervisorFactory()
    workplace = WorkplaceSupervisorFactory()
    calls = []
    monkeypatch.setattr(
        receivers,
        "placement_participants",
        lambda placement_id: SimpleNamespace(
            student=student,
            academic_supervisor=academic,
            workplace_supervisor=workplace,
        ),
    )
    monkeypatch.setattr(
        receivers.send_email,
        "delay",
        lambda *args: calls.append(args),
    )

    events.placement_approved.send(
        sender=object,
        placement_id=uuid4(),
        actor_id=uuid4(),
    )

    assert {call[0] for call in calls} == {
        str(student.id),
        str(academic.id),
        str(workplace.id),
    }
    assert all(call[1] == "placement_approved" for call in calls)


@pytest.mark.django_db
def test_review_escalation_is_sent_to_academic_supervisor(monkeypatch):
    academic = AcademicSupervisorFactory()
    calls = []
    monkeypatch.setattr(
        receivers,
        "placement_participants",
        lambda placement_id: SimpleNamespace(academic_supervisor=academic),
    )
    monkeypatch.setattr(
        receivers.send_email,
        "delay",
        lambda *args: calls.append(args),
    )

    events.review_overdue.send(
        sender=object,
        placement_id=uuid4(),
        entry_id=uuid4(),
        level="escalation",
    )

    assert len(calls) == 1
    assert calls[0][0:2] == (str(academic.id), "review_overdue")
    assert calls[0][2]["level"] == "escalation"


@pytest.mark.django_db
def test_placement_submitted_enqueues_all_coordinators(monkeypatch):
    coordinator = CoordinatorFactory()
    calls = []
    monkeypatch.setattr(receivers, "users_with_role", lambda role: [coordinator])
    monkeypatch.setattr(receivers.send_email, "delay", lambda *args: calls.append(args))

    events.placement_submitted.send(
        sender=object,
        placement_id=uuid4(),
        actor_id=uuid4(),
    )

    assert calls[0][0] == str(coordinator.id)
    assert calls[0][1] == "placement_submitted"
    assert calls[0][2]["placement_id"]
