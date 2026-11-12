"""Celery Beat schedule for logbook review and compliance jobs."""

from celery.schedules import crontab

BEAT_SCHEDULE = {
    "flag-missing-logbook-weeks": {
        "task": "apps.logbook.tasks.flag_missing_weeks",
        "schedule": crontab(hour=8, minute=0, day_of_week="mon"),
    },
    "remind-pending-logbook-reviews": {
        "task": "apps.logbook.tasks.remind_pending_reviews",
        "schedule": crontab(minute=0),
    },
    "escalate-overdue-logbook-reviews": {
        "task": "apps.logbook.tasks.escalate_overdue",
        "schedule": crontab(minute=15),
    },
}
