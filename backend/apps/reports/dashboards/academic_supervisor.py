"""Academic supervisor: follow students, schedule visits, review logbooks, record assessments."""

from collections import Counter

from apps.reports import sources
from apps.reports.summaries import build_rows, plain_list, status_indicator

from .base import DashboardBuilder, item


class AcademicSupervisorDashboard(DashboardBuilder):
    role = "ACADEMIC_SUPERVISOR"

    def widgets(self) -> dict:
        placements = list(
            sources.visible_placements(self.user).filter(status__in=sources.ACTIVE_STATUSES)
        )
        rows = build_rows(placements, self.safe)
        flags = plain_list(
            self.safe.call(
                "logbook.open_flags_for_user",
                sources.logbook_selectors.open_flags_for_user,
                self.user,
                default=[],
            )
        )
        flag_counts = Counter(str(flag.get("placement_id")) for flag in flags)
        students = []
        for row in rows:
            count = flag_counts.get(row["placement_id"], 0)
            students.append({**row, "flags": count, "indicator": status_indicator(row, count)})
        return {
            "students": students,
            "logbook_monitor": [
                {"placement_id": row["placement_id"], "student": row["student"], **row["weeks"]}
                for row in rows
            ],
            "visits": {
                "upcoming": plain_list(
                    self.safe.call(
                        "visits.upcoming_visits_for",
                        sources.visits_selectors.upcoming_visits_for,
                        self.user,
                        default=[],
                    )
                ),
                "due": [
                    {
                        "placement_id": row["placement_id"],
                        "student": row["student"],
                        "done": row["visits_done"],
                        "required": row["visits_required"],
                    }
                    for row in rows
                    if row["visits_done"] < row["visits_required"]
                ],
            },
            "assessments_due": [
                {"placement_id": str(p.id), "student": p.student.full_name}
                for p in sources.pending_assessments(self.user)
            ],
            "final_reports": [
                {
                    "report_id": str(report.id),
                    "placement_id": str(report.placement_id),
                    "student": report.placement.student.full_name,
                }
                for report in sources.reports_awaiting_review(self.user)
            ],
            "flags": flags,
        }

    def action_items(self, widgets: dict) -> list:
        items = []
        for due in widgets["visits"]["due"]:
            items.append(
                item(
                    "schedule_visit",
                    f"Schedule a visit for {due['student']} "
                    f"({due['done']} of {due['required']} done).",
                )
            )
        if widgets["final_reports"]:
            items.append(
                item(
                    "review_final_reports",
                    "Review submitted final reports.",
                    len(widgets["final_reports"]),
                )
            )
        if widgets["assessments_due"]:
            items.append(
                item(
                    "record_assessments",
                    "Record your assessments.",
                    len(widgets["assessments_due"]),
                )
            )
        if widgets["flags"]:
            items.append(item("resolve_flags", "Look at unresolved flags.", len(widgets["flags"])))
        return items
