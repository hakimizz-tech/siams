"""Pure date helpers (no database, no side effects). A week runs Monday to Sunday."""

from datetime import date, timedelta


def week_start(day: date) -> date:
    """The Monday of the week containing `day`."""
    return day - timedelta(days=day.weekday())


def weeks_between(start: date, end: date) -> list[date]:
    """Mondays of every week that overlaps the inclusive range [start, end]."""
    if end < start:
        return []
    weeks = []
    current = week_start(start)
    while current <= end:
        weeks.append(current)
        current += timedelta(days=7)
    return weeks
