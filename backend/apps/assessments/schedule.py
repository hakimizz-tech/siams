"""Team Alpha. Periodic tasks for this app (merged automatically into Celery beat).
Must not import models. Example: daily assessment reminders at 08:00.

    from celery.schedules import crontab

    BEAT_SCHEDULE = {
        "remind-assessments-due": {
            "task": "apps.assessments.tasks.remind_assessments_due",
            "schedule": crontab(hour=8, minute=0),
        },
    }
"""

from celery.schedules import crontab

BEAT_SCHEDULE: dict = {
    "remind-assessments-due": {
        "task": "apps.assessments.tasks.remind_assessments_due",
        "schedule": crontab(hour=8, minute=0),
    },
}
