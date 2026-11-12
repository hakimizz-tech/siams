"""Periodic assessment tasks."""

from typing import Any, Protocol, cast

from celery import shared_task
from django.core.cache import cache
from django.utils import timezone

from apps.core.enums import Role
from apps.notifications.tasks import send_email
from apps.placements.models import Placement

from .models import Assessment, AssessmentForm


class AsyncTask(Protocol):
    def delay(self, *args: Any, **kwargs: Any) -> Any: ...


@shared_task(
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    max_retries=3,
)
def remind_assessments_due(_task) -> int:
    """Queue one idempotent email reminder for each missing supervisor assessment."""
    today = timezone.localdate()
    placements = (
        Placement.objects.filter(
            status=Placement.Status.APPROVED,
            period__assessment_opens_on__isnull=False,
            period__assessment_opens_on__lte=today,
        )
        .select_related("period", "academic_supervisor", "workplace_supervisor")
        .prefetch_related("period__assessment_forms")
    )
    task = cast(AsyncTask, send_email)
    queued = 0

    for placement in placements:
        submitted_forms = set(
            Assessment.objects.filter(
                placement=placement, status=Assessment.Status.SUBMITTED
            ).values_list("form_id", flat=True)
        )
        for form in cast(
            list[AssessmentForm],
            [
                form
                for form in getattr(placement.period, "assessment_forms").all()
                if form.is_active and form.id not in submitted_forms
            ],
        ):
            recipient = (
                placement.workplace_supervisor
                if form.assessor_role == Role.WORKPLACE_SUPERVISOR
                else placement.academic_supervisor
            )
            if recipient is None:
                continue
            cache_key = f"assessment-reminder:{today.isoformat()}:{placement.pk}:{form.pk}"
            if not cache.add(cache_key, True, timeout=60 * 60 * 24):
                continue
            task.delay(
                str(recipient.id),
                "assessment_due",
                {
                    "placement_id": str(placement.pk),
                    "form_id": str(form.pk),
                    "form_name": form.name,
                },
            )
            queued += 1
    return queued
