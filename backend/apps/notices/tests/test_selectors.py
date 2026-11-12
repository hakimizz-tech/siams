from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.tests.factories import (
    AcademicSupervisorFactory,
    CoordinatorFactory,
    StudentFactory,
    WorkplaceSupervisorFactory,
)
from apps.notices.models import Notice, NoticeAudience
from apps.notices.selectors import notices_visible_to


def _notice(coordinator, audience, **kwargs):
    return Notice.objects.create(
        title=f"{audience} notice",
        body="Notice body",
        audience=audience,
        published_at=kwargs.get("published_at", timezone.now()),
        expires_at=kwargs.get("expires_at"),
        created_by=coordinator,
    )


@pytest.mark.django_db
def test_visible_notices_are_scoped_by_role_and_active_window():
    coordinator = CoordinatorFactory()
    student = StudentFactory()
    academic = AcademicSupervisorFactory()
    workplace = WorkplaceSupervisorFactory()
    _notice(coordinator, NoticeAudience.ALL)
    _notice(coordinator, NoticeAudience.STUDENT)
    _notice(coordinator, NoticeAudience.ACADEMIC_SUPERVISOR)
    _notice(coordinator, NoticeAudience.WORKPLACE_SUPERVISOR)
    _notice(
        coordinator,
        NoticeAudience.STUDENT,
        expires_at=timezone.now() - timedelta(minutes=1),
    )

    assert {notice.id for notice in notices_visible_to(student)} == {
        notice.id
        for notice in Notice.objects.filter(
            audience__in=[NoticeAudience.ALL, NoticeAudience.STUDENT],
            expires_at__isnull=True,
        )
    }
    assert all(
        notice.audience in {NoticeAudience.ALL, NoticeAudience.ACADEMIC_SUPERVISOR}
        for notice in notices_visible_to(academic)
    )
    assert all(
        notice.audience in {NoticeAudience.ALL, NoticeAudience.WORKPLACE_SUPERVISOR}
        for notice in notices_visible_to(workplace)
    )
