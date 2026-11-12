from decimal import Decimal

import pytest

from apps.accounts.tests.factories import AcademicSupervisorFactory
from apps.placements.tests.factories import (
    ApprovedPlacementFactory,
    PeriodFactory,
    PlacementFactory,
    SubmittedPlacementFactory,
)
from apps.reports.tests.helpers import make_form, make_report, submit_assessment

pytestmark = pytest.mark.django_db

WORKPLACE, ACADEMIC = "WORKPLACE_SUPERVISOR", "ACADEMIC_SUPERVISOR"
STUDENT_URL = "/api/v1/dashboard/student/"
ACADEMIC_URL = "/api/v1/dashboard/academic-supervisor/"
WORKPLACE_URL = "/api/v1/dashboard/workplace-supervisor/"
COORDINATOR_URL = "/api/v1/dashboard/coordinator/"


def _types(body):
    return {entry["type"]: entry["count"] for entry in body["action_items"]}


# ------------------------------------------------------------------ student -----------
def test_student_without_a_placement_is_asked_to_submit_one(auth_client, student, beta):
    body = auth_client(student).get(STUDENT_URL).json()
    assert body["role"] == "STUDENT"
    assert body["widgets"]["placement"] is None
    assert _types(body) == {"submit_placement": 1}


def test_student_draft_and_returned_placements(auth_client, beta):
    draft = PlacementFactory()
    assert "complete_placement" in _types(auth_client(draft.student).get(STUDENT_URL).json())

    returned = SubmittedPlacementFactory(
        status="RETURNED", coordinator_remarks="Add a phone number"
    )
    body = auth_client(returned.student).get(STUDENT_URL).json()
    assert "fix_placement" in _types(body)
    assert "Add a phone number" in body["action_items"][0]["message"]


def test_student_with_an_approved_placement_sees_progress_feedback_and_notices(auth_client, beta):
    placement = ApprovedPlacementFactory(period__required_hours=400)
    beta.hours[placement.id] = Decimal("120")
    beta.weeks[placement.id] = {
        "approved": 3,
        "submitted": 1,
        "returned": 1,
        "missing": 2,
        "expected": 7,
    }
    beta.feedback.append({"id": "f1", "comment": "Good week"})
    beta.visits.append({"id": "v1", "mode": "VIDEO"})
    beta.notices.append({"id": "n1", "title": "Reports due", "body": "Friday", "pinned": True})

    body = auth_client(placement.student).get(STUDENT_URL).json()
    widgets = body["widgets"]
    assert widgets["placement"]["status"] == "APPROVED"
    assert widgets["progress"]["approved_hours"] == 120.0
    assert widgets["progress"]["required_hours"] == 400
    assert widgets["progress"]["weeks"]["missing"] == 2
    assert widgets["recent_feedback"][0]["comment"] == "Good week"
    assert widgets["upcoming_visits"][0]["mode"] == "VIDEO"
    assert [event["status"] for event in widgets["timeline"]][-1] == "APPROVED"
    assert body["notices"][0]["title"] == "Reports due"
    assert body["unavailable"] == []
    types = _types(body)
    assert types["fix_returned_weeks"] == 1
    assert types["submit_missing_weeks"] == 2
    assert "upload_final_report" in types


def test_student_report_and_result_widgets(auth_client, beta):
    from apps.reports.tests.helpers import make_result

    placement = ApprovedPlacementFactory()
    make_report(placement, "RETURNED")
    body = auth_client(placement.student).get(STUDENT_URL).json()
    assert body["widgets"]["final_report"]["status"] == "RETURNED"
    assert "fix_final_report" in _types(body)

    make_result(placement, "81.50", "A")
    result = auth_client(placement.student).get(STUDENT_URL).json()["widgets"]["result"]
    assert float(result["total_percent"]) == 81.5
    assert result["grade"] == "A"


def test_dashboards_degrade_gracefully_until_beta_delivers(auth_client, beta_missing):
    placement = ApprovedPlacementFactory()
    response = auth_client(placement.student).get(STUDENT_URL)
    assert response.status_code == 200
    body = response.json()
    assert body["widgets"]["recent_feedback"] == []
    assert body["notices"] == []
    assert {
        "logbook.recent_feedback_for_student",
        "visits.upcoming_visits_for",
        "notices.notices_visible_to",
        "logbook.approved_hours_by_placement",
    } <= set(body["unavailable"])


# ------------------------------------------------------------------ workplace supervisor
def test_workplace_supervisor_sees_pending_reviews_and_evaluations(auth_client, beta):
    placement = ApprovedPlacementFactory()
    form = make_form(placement.period, WORKPLACE, 60)
    beta.pending.extend(
        [
            {"id": "e1", "placement_id": str(placement.id), "overdue": True},
            {"id": "e2", "placement_id": str(placement.id), "overdue": False},
        ]
    )
    supervisor = placement.workplace_supervisor
    body = auth_client(supervisor).get(WORKPLACE_URL).json()
    widgets = body["widgets"]
    assert [i["student"] for i in widgets["interns"]] == [placement.student.full_name]
    assert len(widgets["pending_reviews"]) == 2
    assert widgets["overdue_reviews"] == 1
    assert len(widgets["evaluations_due"]) == 1
    types = _types(body)
    assert types["review_weekly_entries"] == 2
    assert (
        "(1 overdue)"
        in next(i for i in body["action_items"] if i["type"] == "review_weekly_entries")["message"]
    )
    assert types["evaluate_interns"] == 1

    submit_assessment(placement, form, supervisor)
    again = auth_client(supervisor).get(WORKPLACE_URL).json()
    assert again["widgets"]["evaluations_due"] == []


def test_workplace_supervisor_only_sees_their_own_interns(auth_client, beta):
    mine = ApprovedPlacementFactory()
    ApprovedPlacementFactory()
    body = auth_client(mine.workplace_supervisor).get(WORKPLACE_URL).json()
    assert len(body["widgets"]["interns"]) == 1


# ------------------------------------------------------------------ academic supervisor
def test_academic_supervisor_follows_students(auth_client, beta):
    supervisor = AcademicSupervisorFactory()
    flagged = ApprovedPlacementFactory(academic_supervisor=supervisor)
    behind = ApprovedPlacementFactory(academic_supervisor=supervisor, period=flagged.period)
    ApprovedPlacementFactory()  # someone else's student
    beta.flags.append({"id": "x", "placement_id": str(flagged.id), "type": "LATE_SUBMISSION"})
    beta.weeks[behind.id] = {
        "approved": 1,
        "submitted": 1,
        "returned": 0,
        "missing": 1,
        "expected": 3,
    }
    beta.visit_counts[flagged.id] = 2  # visits complete for this one (min_visits is 2)
    make_report(flagged, "SUBMITTED")

    body = auth_client(supervisor).get(ACADEMIC_URL).json()
    widgets = body["widgets"]
    by_id = {row["placement_id"]: row for row in widgets["students"]}
    assert set(by_id) == {str(flagged.id), str(behind.id)}
    assert by_id[str(flagged.id)]["indicator"] == "flagged"
    assert by_id[str(behind.id)]["indicator"] == "behind"
    assert [row["placement_id"] for row in widgets["visits"]["due"]] == [str(behind.id)]
    assert len(widgets["final_reports"]) == 1
    types = _types(body)
    assert [i["type"] for i in body["action_items"]].count("schedule_visit") == 1
    assert types["review_final_reports"] == 1
    assert types["resolve_flags"] == 1


# ------------------------------------------------------------------ coordinator ----------
def test_coordinator_pipeline_workload_and_ready_results(auth_client, coordinator, beta):
    period = PeriodFactory()
    approved = ApprovedPlacementFactory(period=period)
    SubmittedPlacementFactory(period=period)
    SubmittedPlacementFactory(period=period)
    workplace_form = make_form(period, WORKPLACE, 60)
    academic_form = make_form(period, ACADEMIC, 40)
    submit_assessment(approved, workplace_form, approved.workplace_supervisor)
    submit_assessment(approved, academic_form, approved.academic_supervisor)
    make_report(approved, "ACCEPTED")

    body = auth_client(coordinator).get(COORDINATOR_URL, {"period": str(period.id)}).json()
    widgets = body["widgets"]
    assert widgets["period"]["id"] == str(period.id)
    assert widgets["pipeline"]["counts"]["SUBMITTED"] == 2
    assert widgets["pipeline"]["counts"]["APPROVED"] == 1
    assert len(widgets["pipeline"]["awaiting_approval"]) == 2
    assert widgets["supervisor_assignment"]["workload"][0]["students"] == 1
    assert widgets["assessments"] == {"submitted": 2, "expected": 2}
    assert widgets["final_reports"]["ACCEPTED"] == 1
    assert [r["placement_id"] for r in widgets["results"]["ready_to_finalize"]] == [
        str(approved.id)
    ]
    types = _types(body)
    assert types["approve_placements"] == 2
    assert types["finalize_results"] == 1


def test_coordinator_dashboard_defaults_to_the_latest_period_and_survives_a_bad_param(
    auth_client, coordinator, beta
):
    PeriodFactory()
    body = auth_client(coordinator).get(COORDINATOR_URL, {"period": "not-a-uuid"}).json()
    assert body["widgets"]["period"] is not None


def test_coordinator_dashboard_without_any_period_is_empty(auth_client, coordinator, beta):
    body = auth_client(coordinator).get(COORDINATOR_URL).json()
    assert body["widgets"] == {"period": None}
    assert body["action_items"] == []
