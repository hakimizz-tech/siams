from decimal import Decimal

import pytest

from apps.accounts.tests.factories import StudentFactory
from apps.placements.tests.factories import (
    ApprovedPlacementFactory,
    PeriodFactory,
    PlacementFactory,
    SubmittedPlacementFactory,
)
from apps.reports.tests.helpers import make_form, make_report, make_result, submit_assessment

pytestmark = pytest.mark.django_db

WORKPLACE, ACADEMIC = "WORKPLACE_SUPERVISOR", "ACADEMIC_SUPERVISOR"


def _summary_url(period):
    return f"/api/v1/reports/periods/{period.id}/summary/"


def test_period_summary_has_one_row_per_non_draft_placement(auth_client, coordinator, beta):
    period = PeriodFactory()
    placement = ApprovedPlacementFactory(period=period)
    SubmittedPlacementFactory(period=period)
    PlacementFactory(period=period)  # draft: excluded
    make_submitted = make_form(period, WORKPLACE, 60)
    submit_assessment(placement, make_submitted, placement.workplace_supervisor, "90.00")
    make_report(placement, "ACCEPTED")
    make_result(placement, "78.00", "A")
    beta.hours[placement.id] = Decimal("200")
    beta.weeks[placement.id] = {
        "approved": 5,
        "submitted": 5,
        "returned": 0,
        "missing": 0,
        "expected": 6,
    }
    beta.visit_counts[placement.id] = 1

    body = auth_client(coordinator).get(_summary_url(period)).json()
    assert body["count"] == 2
    assert body["unavailable"] == []
    row = next(r for r in body["results"] if r["placement_id"] == str(placement.id))
    assert row["student"] == placement.student.full_name
    assert row["registration_number"] == placement.student.student_profile.registration_number
    assert row["approved_hours"] == 200.0
    assert row["required_hours"] == period.required_hours
    assert row["weeks"]["approved"] == 5
    assert row["visits_done"] == 1
    assert row["visits_required"] == period.min_visits
    assert float(row["workplace_percent"]) == 90.0
    assert row["academic_percent"] is None
    assert row["final_report"] == "ACCEPTED"
    assert float(row["total_percent"]) == 78.0
    assert row["grade"] == "A"


def test_period_summary_lists_unavailable_beta_selectors(auth_client, coordinator, beta_missing):
    period = PeriodFactory()
    ApprovedPlacementFactory(period=period)
    body = auth_client(coordinator).get(_summary_url(period)).json()
    assert body["count"] == 1
    assert "logbook.approved_hours_by_placement" in body["unavailable"]
    assert body["results"][0]["approved_hours"] == 0.0


def test_academic_supervisors_only_see_their_own_students_in_the_summary(auth_client, beta):
    period = PeriodFactory()
    mine = ApprovedPlacementFactory(period=period)
    ApprovedPlacementFactory(period=period)
    body = auth_client(mine.academic_supervisor).get(_summary_url(period)).json()
    assert [row["placement_id"] for row in body["results"]] == [str(mine.id)]


def test_unknown_period_is_404(auth_client, coordinator):
    assert (
        auth_client(coordinator)
        .get("/api/v1/reports/periods/00000000-0000-0000-0000-000000000000/summary/")
        .status_code
        == 404
    )


def test_placement_summary_is_scoped(auth_client, coordinator, beta):
    placement = ApprovedPlacementFactory()
    beta.flags.append({"id": "f", "placement_id": str(placement.id), "type": "HOURS_OUTLIER"})
    beta.flags.append({"id": "g", "placement_id": "someone-else", "type": "LATE_SUBMISSION"})
    url = f"/api/v1/placements/{placement.id}/summary/"

    body = auth_client(placement.student).get(url).json()
    assert body["placement_id"] == str(placement.id)
    assert [flag["type"] for flag in body["open_flags"]] == ["HOURS_OUTLIER"]
    assert body["timeline"][-1]["status"] == "APPROVED"

    assert auth_client(coordinator).get(url).status_code == 200
    assert auth_client(placement.workplace_supervisor).get(url).status_code == 200
    assert auth_client(StudentFactory()).get(url).status_code == 404


# ------------------------------------------------------------------ export --------------
def test_export_job_produces_a_private_csv(auth_client, coordinator, beta):
    placement = ApprovedPlacementFactory()
    client = auth_client(coordinator)
    created = client.post(
        "/api/v1/reports/export/",
        {"report": "period_summary", "period": str(placement.period_id)},
        format="json",
    )
    assert created.status_code == 202, created.content
    task_id = created.json()["task_id"]

    status = client.get(f"/api/v1/reports/export/{task_id}/").json()
    assert status["status"] == "SUCCESS", status
    assert status["filename"].endswith(".csv")

    download = client.get(status["download_url"])
    assert download.status_code == 200
    text = b"".join(download.streaming_content).decode("utf-8-sig")
    assert text.splitlines()[0].startswith("Placement ID,Student")
    assert placement.student.full_name in text


def test_export_jobs_belong_to_the_user_who_started_them(auth_client, coordinator, make_user, beta):
    placement = ApprovedPlacementFactory()
    task_id = (
        auth_client(coordinator)
        .post(
            "/api/v1/reports/export/",
            {"report": "period_summary", "period": str(placement.period_id)},
            format="json",
        )
        .json()["task_id"]
    )
    other = make_user(role="COORDINATOR")
    assert auth_client(other).get(f"/api/v1/reports/export/{task_id}/").status_code == 404
    assert auth_client(other).get(f"/api/v1/reports/export/{task_id}/file/").status_code == 404


def test_export_rejects_unknown_reports_and_periods(auth_client, coordinator):
    client = auth_client(coordinator)
    assert (
        client.post(
            "/api/v1/reports/export/", {"report": "nope", "period": "x"}, format="json"
        ).status_code
        == 400
    )
    missing = client.post(
        "/api/v1/reports/export/",
        {"report": "period_summary", "period": "00000000-0000-0000-0000-000000000000"},
        format="json",
    )
    assert missing.status_code == 422
    assert missing.json()["code"] == "period_not_found"
