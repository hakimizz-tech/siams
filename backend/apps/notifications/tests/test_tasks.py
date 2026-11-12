import pytest
from django.core import mail
from django.utils import timezone

from apps.accounts.tests.factories import CoordinatorFactory, StudentFactory
from apps.notices.models import Notice, NoticeAudience
from apps.notifications.tasks import send_email, send_notice_emails


@pytest.mark.django_db
def test_send_email_resolves_user_and_delivers_message(monkeypatch):
    user = StudentFactory(email="student@example.com")
    monkeypatch.setattr("apps.notifications.tasks.get_user", lambda user_id: user)

    result = send_email(str(user.id), "result_finalized", {})

    assert result == 1
    assert mail.outbox[0].to == ["student@example.com"]
    assert mail.outbox[0].subject == "Internship result finalized"


@pytest.mark.django_db
def test_send_notice_emails_delivers_to_selected_audience(monkeypatch):
    coordinator = CoordinatorFactory()
    student = StudentFactory(email="student@example.com")
    notice = Notice.objects.create(
        title="Briefing",
        body="Attend the briefing.",
        audience=NoticeAudience.STUDENT,
        published_at=timezone.now(),
        send_email=True,
        created_by=coordinator,
    )
    monkeypatch.setattr(
        "apps.notifications.tasks.users_with_role",
        lambda role: [student] if role == NoticeAudience.STUDENT else [],
    )

    assert send_notice_emails(str(notice.id)) == 1
    assert mail.outbox[0].to == ["student@example.com"]
    assert mail.outbox[0].subject == "New notice"
