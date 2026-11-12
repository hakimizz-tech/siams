from datetime import date
from types import SimpleNamespace

import pytest

from apps.core.exceptions import RuleViolation
from apps.logbook.rules import validate_week


def placement(**overrides):
    values = {"status": "APPROVED", "start_date": date(2026, 11, 1), "end_date": date(2026, 11, 30)}
    values.update(overrides)
    return SimpleNamespace(**values)


def activity(**overrides):
    values = {
        "work_date": date(2026, 11, 2),
        "hours": "8",
        "description": "Completed the assigned placement documentation and reviewed requirements.",
    }
    values.update(overrides)
    return values


def test_week_must_start_on_monday():
    with pytest.raises(RuleViolation, match="Monday"):
        validate_week(placement(), date(2026, 11, 3), [activity()])


def test_future_activity_is_rejected():
    with pytest.raises(RuleViolation, match="future"):
        validate_week(
            placement(end_date=date(2100, 1, 1)),
            date(2026, 11, 2),
            [activity(work_date=date(2099, 1, 1))],
        )


def test_short_description_is_rejected():
    with pytest.raises(RuleViolation, match="30 characters"):
        validate_week(placement(), date(2026, 11, 2), [activity(description="worked")])


def test_weekend_activity_is_flagged():
    results = validate_week(
        placement(),
        date(2026, 11, 2),
        [activity(work_date=date(2026, 11, 7))],
    )
    assert any(result.flag_type == "OFF_DAY_WORK" for result in results)
