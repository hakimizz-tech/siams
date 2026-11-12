"""Coordinator: approve placements, assign supervisors, post notices, monitor progress."""

import uuid
from collections import Counter

from django.conf import settings

from apps.reports import sources
from apps.reports.summaries import build_rows, plain_list

from .base import DashboardBuilder, item


class CoordinatorDashboard(DashboardBuilder):
    role = "COORDINATOR"

    def _period(self):
        raw = self.params.get("period")
        if raw:
            try:
                period = sources.get_period(uuid.UUID(str(raw)))
            except ValueError:
                period = None
            if period is not None:
                return period
        return sources.latest_period()

    def widgets(self) -> dict:
        period = self._period()
        if period is None:
            return {"period": None}
        require_report = getattr(settings, "REQUIRE_FINAL_REPORT_FOR_RESULT", True)
        submitted = sources.placements_for_period(self.user, period, statuses=[sources.SUBMITTED])
        awaiting = [
            {
                "placement_id": str(p.id),
                "student": p.student.full_name,
                "organization": p.organization.name,
                "submitted_at": p.submitted_at,
            }
            for p in submitted
        ]
        active = list(
            sources.placements_for_period(self.user, period, statuses=sources.ACTIVE_STATUSES)
        )
        rows = build_rows(active, self.safe)
        flags = plain_list(
            self.safe.call(
                "logbook.open_flags_for_user",
                sources.logbook_selectors.open_flags_for_user,
                self.user,
                default=[],
            )
        )
        expected_weeks = sum(row["weeks"]["expected"] for row in rows)
        approved_weeks = sum(row["weeks"]["approved"] for row in rows)
        ready = sources.ready_for_result(period, require_report=require_report)
        return {
            "period": {"id": str(period.id), "name": period.name},
            "pipeline": {
                "counts": sources.status_counts(period),
                "awaiting_approval": awaiting,
            },
            "supervisor_assignment": {
                "pending_assignment": len(awaiting),
                "workload": sources.academic_workload(period),
            },
            "progress": {
                "approved_hours": sum(row["approved_hours"] for row in rows),
                "required_hours": sum(row["required_hours"] for row in rows),
                "weeks_approved": approved_weeks,
                "weeks_expected": expected_weeks,
                "logbook_compliance_percent": (
                    round(approved_weeks / expected_weeks * 100, 1) if expected_weeks else None
                ),
                "visits_done": sum(row["visits_done"] for row in rows),
                "visits_required": sum(row["visits_required"] for row in rows),
            },
            "flags": {"total": len(flags), "by_type": dict(Counter(f.get("type") for f in flags))},
            "assessments": sources.assessment_counts(period),
            "final_reports": sources.final_report_counts(period),
            "results": {
                "ready_to_finalize": [
                    {"placement_id": str(p.id), "student": p.student.full_name} for p in ready
                ],
                "finalized": sources.finalized_count(period),
            },
        }

    def action_items(self, widgets: dict) -> list:
        if widgets.get("period") is None:
            return []
        items = []
        awaiting = len(widgets["pipeline"]["awaiting_approval"])
        if awaiting:
            items.append(
                item("approve_placements", f"{awaiting} placements awaiting approval.", awaiting)
            )
        ready = len(widgets["results"]["ready_to_finalize"])
        if ready:
            items.append(item("finalize_results", f"{ready} placements ready to finalize.", ready))
        if widgets["flags"]["total"]:
            items.append(
                item("review_flags", "Review unresolved flags.", widgets["flags"]["total"])
            )
        return items
