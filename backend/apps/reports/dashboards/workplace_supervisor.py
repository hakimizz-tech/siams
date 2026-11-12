"""Industrial (workplace) supervisor: approve weekly entries, evaluate interns."""

from apps.reports import sources
from apps.reports.summaries import build_rows, plain_list

from .base import DashboardBuilder, item


class WorkplaceSupervisorDashboard(DashboardBuilder):
    role = "WORKPLACE_SUPERVISOR"

    def widgets(self) -> dict:
        placements = list(
            sources.visible_placements(self.user).filter(status__in=sources.ACTIVE_STATUSES)
        )
        rows = build_rows(placements, self.safe)
        pending = plain_list(
            self.safe.call(
                "logbook.pending_reviews_for_supervisor",
                sources.logbook_selectors.pending_reviews_for_supervisor,
                self.user,
                default=[],
            )
        )
        return {
            "interns": [
                {
                    "placement_id": row["placement_id"],
                    "student": row["student"],
                    "approved_hours": row["approved_hours"],
                    "required_hours": row["required_hours"],
                    "weeks": row["weeks"],
                }
                for row in rows
            ],
            "pending_reviews": pending,
            "overdue_reviews": sum(1 for entry in pending if entry.get("overdue")),
            "evaluations_due": [
                {"placement_id": str(p.id), "student": p.student.full_name}
                for p in sources.pending_assessments(self.user)
            ],
        }

    def action_items(self, widgets: dict) -> list:
        items = []
        pending = len(widgets["pending_reviews"])
        if pending:
            overdue = widgets["overdue_reviews"]
            suffix = f" ({overdue} overdue)" if overdue else ""
            items.append(
                item("review_weekly_entries", f"{pending} weekly entries waiting{suffix}.", pending)
            )
        due = len(widgets["evaluations_due"])
        if due:
            items.append(item("evaluate_interns", "Evaluate your interns.", due))
        return items
