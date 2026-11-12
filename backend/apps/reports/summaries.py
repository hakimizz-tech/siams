"""Shared row building for dashboards, summaries and exports (batch queries, no N+1)."""

from collections import defaultdict

from . import sources

WEEK_KEYS = ("approved", "submitted", "returned", "missing", "expected")


def to_plain(obj) -> dict:
    """Turn a dict, namedtuple or simple object from another app into a JSON-friendly dict."""
    if isinstance(obj, dict):
        return dict(obj)
    if hasattr(obj, "_asdict"):
        return dict(obj._asdict())
    return {key: value for key, value in vars(obj).items() if not key.startswith("_")}


def plain_list(items) -> list:
    return [to_plain(item) for item in (items or [])]


def lookup(mapping, key, default=None):
    """Beta may key by UUID or by str; accept both."""
    if not mapping:
        return default
    if key in mapping:
        return mapping[key]
    return mapping.get(str(key), default)


def weeks_dict(value) -> dict:
    if value is None:
        return dict.fromkeys(WEEK_KEYS, 0)
    if isinstance(value, dict):
        return {key: int(value.get(key, 0) or 0) for key in WEEK_KEYS}
    return {key: int(getattr(value, key, 0) or 0) for key in WEEK_KEYS}


def status_indicator(row: dict, flags: int = 0) -> str:
    if flags > 0:
        return "flagged"
    if row["weeks"]["missing"] > 0 or row["weeks"]["returned"] > 0:
        return "behind"
    return "on_track"


def _name(user):
    return user.full_name if user else None


def build_rows(placements, safe) -> list[dict]:
    placements = list(placements)
    ids = [placement.id for placement in placements]
    hours = safe.call(
        "logbook.approved_hours_by_placement",
        sources.logbook_selectors.approved_hours_by_placement,
        ids,
        default={},
    )
    weeks = safe.call(
        "logbook.weeks_summary_by_placement",
        sources.logbook_selectors.weeks_summary_by_placement,
        ids,
        default={},
    )
    visits = safe.call(
        "visits.completed_visit_counts",
        sources.visits_selectors.completed_visit_counts,
        ids,
        default={},
    )
    registrations = sources.registration_numbers([p.student_id for p in placements])
    percents = defaultdict(dict)
    for assessment in sources.submitted_assessments(ids):
        percents[assessment.placement_id][assessment.form.assessor_role] = assessment.percent
    reports = sources.final_reports_by_placement(ids)
    results = sources.results_by_placement(ids)

    rows = []
    for placement in placements:
        report = reports.get(placement.id)
        result = results.get(placement.id)
        by_role = percents.get(placement.id, {})
        rows.append(
            {
                "placement_id": str(placement.id),
                "student_id": str(placement.student_id),
                "student": placement.student.full_name,
                "registration_number": registrations.get(placement.student_id, ""),
                "organization": placement.organization.name,
                "status": placement.status,
                "academic_supervisor": _name(placement.academic_supervisor),
                "workplace_supervisor": _name(placement.workplace_supervisor),
                "required_hours": placement.period.required_hours,
                "approved_hours": float(lookup(hours, placement.id, 0) or 0),
                "weeks": weeks_dict(lookup(weeks, placement.id)),
                "visits_done": int(lookup(visits, placement.id, 0) or 0),
                "visits_required": placement.period.min_visits,
                "workplace_percent": by_role.get(sources.WORKPLACE),
                "academic_percent": by_role.get(sources.ACADEMIC),
                "final_report": report.status if report else None,
                "total_percent": result.total_percent if result else None,
                "grade": result.grade if result else None,
            }
        )
    return rows
