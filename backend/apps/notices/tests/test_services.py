from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.tests.factories import CoordinatorFactory, StudentFactory
from apps.core.enums import Role
from apps.core.exceptions import DomainError, RuleViolation
from apps.notices.models import NoticeAudience
from apps.notices.services import NoticeService


@pytest.mark.django_db
def test_coordinator_can_post_notice():
    coordinator = CoordinatorFactory()
    notice = NoticeService().post(
        coordinator,
        {
            "title": "Placement briefing",
            "body": "The briefing is on Monday.",
            "audience": NoticeAudience.STUDENT,
        },
    )

    assert notice.created_by == coordinator
    assert notice.audience == Role.STUDENT
    assert notice.published_at <= timezone.now()


@pytest.mark.django_db
def test_non_coordinator_cannot_post_notice():
    with pytest.raises(DomainError, match="Only a coordinator"):
        NoticeService().post(
            StudentFactory(),
            {
                "title": "Not allowed",
                "body": "This should fail.",
                "audience": NoticeAudience.ALL,
            },
        )


@pytest.mark.django_db
def test_notice_expiry_must_follow_publication():
    published_at = timezone.now()
    with pytest.raises(RuleViolation):
        NoticeService().post(
            CoordinatorFactory(),
            {
                "title": "Invalid window",
                "body": "This should fail.",
                "audience": NoticeAudience.ALL,
                "published_at": published_at,
                "expires_at": published_at - timedelta(minutes=1),
            },
        )
