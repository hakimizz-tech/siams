from . import sources
from .safe import SafeSelectors
from .summaries import build_rows, plain_list


def period_summary(user, period) -> dict:
    """The coordinator's one-page view: one row per (non-draft) placement in the user's scope."""
    safe = SafeSelectors()
    placements = sources.placements_for_period(user, period, exclude=[sources.DRAFT])
    rows = build_rows(placements, safe)
    return {
        "period": {
            "id": str(period.id),
            "name": period.name,
            "required_hours": period.required_hours,
            "min_visits": period.min_visits,
        },
        "count": len(rows),
        "unavailable": sorted(safe.unavailable),
        "results": rows,
    }


def placement_summary(user, placement_id):
    """One placement's progress, flags and timeline, or None when it is outside the user's scope."""
    placement = sources.get_visible_placement(user, placement_id)
    if placement is None:
        return None
    safe = SafeSelectors()
    row = build_rows([placement], safe)[0]
    flags = plain_list(
        safe.call(
            "logbook.open_flags_for_user",
            sources.logbook_selectors.open_flags_for_user,
            user,
            default=[],
        )
    )
    return {
        **row,
        "timeline": sources.timeline(placement),
        "open_flags": [f for f in flags if str(f.get("placement_id")) == row["placement_id"]],
        "unavailable": sorted(safe.unavailable),
    }
