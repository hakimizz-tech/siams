from decimal import Decimal
from types import SimpleNamespace

import pytest

BETA_SELECTORS = [
    "apps.logbook.selectors.approved_hours_by_placement",
    "apps.logbook.selectors.weeks_summary_by_placement",
    "apps.logbook.selectors.pending_reviews_for_supervisor",
    "apps.logbook.selectors.recent_feedback_for_student",
    "apps.logbook.selectors.open_flags_for_user",
    "apps.visits.selectors.upcoming_visits_for",
    "apps.visits.selectors.completed_visit_counts",
    "apps.notices.selectors.notices_visible_to",
]


@pytest.fixture
def beta(monkeypatch):
    """Beta data you control: fill `beta.hours[placement.id] = Decimal('120')`, `beta.weeks`,
    `beta.pending`, `beta.feedback`, `beta.flags`, `beta.visits`, `beta.visit_counts`,
    `beta.notices` before calling the API."""
    state = SimpleNamespace(
        hours={},
        weeks={},
        pending=[],
        feedback=[],
        flags=[],
        visits=[],
        visit_counts={},
        notices=[],
    )
    patch = monkeypatch.setattr
    patch(
        "apps.logbook.selectors.approved_hours_by_placement",
        lambda ids: {i: state.hours.get(i, Decimal("0")) for i in ids},
    )
    patch(
        "apps.logbook.selectors.weeks_summary_by_placement",
        lambda ids: {i: state.weeks[i] for i in ids if i in state.weeks},
    )
    patch("apps.logbook.selectors.pending_reviews_for_supervisor", lambda user: state.pending)
    patch(
        "apps.logbook.selectors.recent_feedback_for_student", lambda user, limit=5: state.feedback
    )
    patch("apps.logbook.selectors.open_flags_for_user", lambda user: state.flags)
    patch("apps.visits.selectors.upcoming_visits_for", lambda user, limit=5: state.visits)
    patch(
        "apps.visits.selectors.completed_visit_counts",
        lambda ids: {i: state.visit_counts.get(i, 0) for i in ids},
    )
    patch("apps.notices.selectors.notices_visible_to", lambda user: state.notices)
    return state


@pytest.fixture
def beta_missing(monkeypatch):
    """Every Beta selector still raises NotImplementedError (as before Team Beta delivers)."""

    def not_implemented(*args, **kwargs):
        raise NotImplementedError("Team Beta")

    for dotted in BETA_SELECTORS:
        monkeypatch.setattr(dotted, not_implemented)
