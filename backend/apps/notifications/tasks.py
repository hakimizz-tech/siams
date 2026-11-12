"""Celery tasks for asynchronous notification delivery."""

import logging
import uuid
from collections.abc import Iterable
from typing import Any, cast

from celery import shared_task

from apps.accounts.selectors import get_user, users_with_role
from apps.core.enums import Role
from apps.notices.models import Notice, NoticeAudience

from .services import NotificationService

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    max_retries=3,
)
def send_email(
    _task,
    user_id: str,
    notification_type: str,
    context: dict[str, Any] | None = None,
):
    """Send one notification email after resolving the recipient."""
    user = get_user(uuid.UUID(user_id))
    if user is None:
        logger.warning("Skipping notification for missing user %s", user_id)
        return 0
    return NotificationService().notify(user, notification_type, context)


@shared_task
def send_notice_emails(notice_id: str):
    """Email every active user in a notice's selected audience."""
    notice = Notice.objects.select_related("created_by").filter(pk=notice_id).first()
    if notice is None or not notice.send_email:
        return 0

    roles = (
        [Role.STUDENT, Role.WORKPLACE_SUPERVISOR, Role.ACADEMIC_SUPERVISOR, Role.COORDINATOR]
        if notice.audience == NoticeAudience.ALL
        else [notice.audience]
    )
    delivered = 0
    context = {"title": notice.title, "body": notice.body}
    for role in roles:
        for user in cast(Iterable[Any], users_with_role(role)):
            delivered += NotificationService().notify(user, "notice_posted", context)
    return delivered
