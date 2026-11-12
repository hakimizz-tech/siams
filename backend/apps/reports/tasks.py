"""Celery tasks for reports (routed to the `reports` queue by task name)."""

from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils.text import slugify

from apps.core.storage import dated_upload_path

from . import sources
from .exports import rows_to_csv
from .jobs import update_job
from .selectors import period_summary


@shared_task(name="apps.reports.tasks.export_period_summary")
def export_period_summary(job_id: str, period_id: str, user_id: str) -> None:
    """Build the period summary CSV for `user_id` (their own scope) and store it privately."""
    update_job(job_id, status="RUNNING")
    try:
        user = get_user_model().objects.filter(pk=user_id).first()
        period = sources.get_period(period_id)
        if user is None or period is None:
            raise ValueError("The user or the period no longer exists.")
        content = rows_to_csv(period_summary(user, period)["results"])
        path = default_storage.save(
            dated_upload_path("exports")(None, "export.csv"), ContentFile(content)
        )
        update_job(
            job_id,
            status="SUCCESS",
            path=path,
            filename=f"period-summary-{slugify(period.name) or 'export'}.csv",
        )
    except Exception as exc:
        update_job(job_id, status="FAILURE", error=str(exc))
