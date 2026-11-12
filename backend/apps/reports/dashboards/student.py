"""Student: submit placement details, fill in weekly logbooks, upload the final report."""

from apps.reports import sources
from apps.reports.summaries import build_rows, plain_list

from .base import DashboardBuilder, item


class StudentDashboard(DashboardBuilder):
    role = "STUDENT"

    def widgets(self) -> dict:
        placement = sources.current_placement_for_student(self.user)
        if placement is None:
            return {
                "placement": None,
                "timeline": [],
                "progress": None,
                "recent_feedback": [],
                "upcoming_visits": [],
                "final_report": None,
                "result": None,
            }
        row = build_rows([placement], self.safe)[0]
        report = sources.final_reports_by_placement([placement.id]).get(placement.id)
        result = sources.results_by_placement([placement.id]).get(placement.id)
        return {
            "placement": {
                "id": str(placement.id),
                "status": placement.status,
                "remarks": placement.coordinator_remarks,
                "period": placement.period.name,
                "organization": placement.organization.name,
                "start_date": placement.start_date,
                "end_date": placement.end_date,
                "academic_supervisor": row["academic_supervisor"],
                "workplace_supervisor": row["workplace_supervisor"],
            },
            "timeline": sources.timeline(placement),
            "progress": {
                "required_hours": row["required_hours"],
                "approved_hours": row["approved_hours"],
                "weeks": row["weeks"],
            },
            "recent_feedback": plain_list(
                self.safe.call(
                    "logbook.recent_feedback_for_student",
                    sources.logbook_selectors.recent_feedback_for_student,
                    self.user,
                    default=[],
                )
            ),
            "upcoming_visits": plain_list(
                self.safe.call(
                    "visits.upcoming_visits_for",
                    sources.visits_selectors.upcoming_visits_for,
                    self.user,
                    default=[],
                )
            ),
            "final_report": (
                {"id": str(report.id), "status": report.status, "feedback": report.feedback}
                if report
                else None
            ),
            "result": (
                {
                    "total_percent": result.total_percent,
                    "grade": result.grade,
                    "finalized_at": result.finalized_at,
                }
                if result
                else None
            ),
        }

    def action_items(self, widgets: dict) -> list:
        placement = widgets["placement"]
        if placement is None:
            return [item("submit_placement", "Submit your placement details.")]
        status = placement["status"]
        if status == sources.DRAFT:
            return [item("complete_placement", "Complete and submit your placement details.")]
        if status == sources.RETURNED:
            return [item("fix_placement", f"Placement returned: {placement['remarks']}".strip())]
        if status != sources.APPROVED:
            return []
        items = []
        weeks = widgets["progress"]["weeks"]
        if weeks["returned"]:
            items.append(
                item("fix_returned_weeks", "Fix your returned logbook weeks.", weeks["returned"])
            )
        if weeks["missing"]:
            items.append(
                item("submit_missing_weeks", "Submit your missing logbook weeks.", weeks["missing"])
            )
        report = widgets["final_report"]
        if report is None:
            items.append(item("upload_final_report", "Upload your final report."))
        elif report["status"] == "RETURNED":
            items.append(
                item("fix_final_report", "Your final report was returned. Upload a new version.")
            )
        return items
