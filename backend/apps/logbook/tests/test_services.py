from datetime import date
from types import SimpleNamespace
from uuid import uuid4

import pytest

from apps.accounts.tests.factories import (
    StudentFactory,
    WorkplaceSupervisorFactory,
)
from apps.core.exceptions import RuleViolation
from apps.logbook.models import LogbookStatus
from apps.logbook.services import LogbookService


def make_placement(supervisor):
    return SimpleNamespace(
        id=uuid4(),
        status="APPROVED",
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 30),
        workplace_supervisor_id=supervisor.id,
    )


def data():
    return {
        "week_start": date(2026, 11, 2),
        "summary": "Completed the first placement week.",
        "activities": [
            {
                "work_date": date(2026, 11, 2),
                "hours": "8",
                "description": (
                    "Completed the assigned placement documentation and reviewed requirements."
                ),
            }
        ],
    }


@pytest.mark.django_db
def test_save_and_submit_week():
    student = StudentFactory()
    supervisor = WorkplaceSupervisorFactory()
    entry = LogbookService().save_week(make_placement(supervisor), student, data())

    assert entry.status == LogbookStatus.DRAFT
    assert entry.activities.count() == 1

    LogbookService().submit(entry, student)
    entry.refresh_from_db()
    assert entry.status == LogbookStatus.SUBMITTED
    assert entry.submitted_at is not None


@pytest.mark.django_db
def test_approval_requires_comment_when_hours_are_reduced():
    student = StudentFactory()
    supervisor = WorkplaceSupervisorFactory()
    entry = LogbookService().save_week(make_placement(supervisor), student, data())
    LogbookService().submit(entry, student)

    with pytest.raises(RuleViolation, match="comment"):
        LogbookService().approve(
            entry,
            supervisor,
            adjustments=[{"work_date": date(2026, 11, 2), "approved_hours": "7"}],
        )


@pytest.mark.django_db
def test_approval_counts_only_approved_hours():
    student = StudentFactory()
    supervisor = WorkplaceSupervisorFactory()
    entry = LogbookService().save_week(make_placement(supervisor), student, data())
    LogbookService().submit(entry, student)

    LogbookService().approve(
        entry,
        supervisor,
        adjustments=[{"work_date": date(2026, 11, 2), "approved_hours": "7"}],
        comment="Reduced to the hours verified by the workplace supervisor.",
    )
    entry.refresh_from_db()
    assert entry.status == LogbookStatus.APPROVED
    assert entry.approved_hours == 7
