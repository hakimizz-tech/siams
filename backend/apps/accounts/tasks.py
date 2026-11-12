from celery import shared_task

from apps.core.jobs import update_job

from .services import UserService


@shared_task(name="apps.accounts.tasks.import_users_csv")
def import_users_csv(job_id: str, csv_text: str, send_invites: bool = True) -> None:
    update_job(job_id, status="RUNNING")
    try:
        report = UserService.bulk_import(csv_text, send_invites=send_invites)
    except Exception as exc:
        update_job(job_id, status="FAILURE", error=getattr(exc, "message", str(exc)))
        return
    update_job(job_id, status="SUCCESS", created=report.created, errors=report.errors)
