"""Demo data: one period, one organisation, and two placements."""

from datetime import date, timedelta

from apps.accounts.models import User
from apps.accounts.services import UserService
from apps.core.enums import Role

from .models import InternshipPeriod, Organization, Placement
from .services import PeriodService


def seed():
    today = date.today()
    period, created = InternshipPeriod.objects.get_or_create(
        name="Demo Attachment",
        defaults={
            "type": InternshipPeriod.Type.ATTACHMENT,
            "start_date": today - timedelta(days=30),
            "end_date": today + timedelta(days=120),
            "required_hours": 400,
            "min_visits": 2,
            "assessment_opens_on": today,
        },
    )
    if created:
        PeriodService.set_grade_bands(
            period,
            [
                {"min_percent": "70", "label": "A"},
                {"min_percent": "60", "label": "B"},
                {"min_percent": "50", "label": "C"},
                {"min_percent": "40", "label": "D"},
                {"min_percent": "0", "label": "E"},
            ],
        )
    organization, _ = Organization.objects.get_or_create(
        name="Demo Tech Ltd", defaults={"county": "Nairobi", "is_verified": True}
    )
    academic = User.objects.filter(email="academic@siams.local").first()
    student1 = User.objects.filter(email="student1@siams.local").first()
    student2 = User.objects.filter(email="student2@siams.local").first()
    if not (academic and student1 and student2):
        return
    if not User.objects.filter(email="mentor@siams.local").exists():
        UserService.create_user(
            email="mentor@siams.local",
            full_name="Morgan Mentor",
            role=Role.WORKPLACE_SUPERVISOR,
            organization_id=organization.pk,
            password="Password123!",
            send_invite=False,
        )
    mentor = User.objects.get(email="mentor@siams.local")
    common = {
        "period": period,
        "organization": organization,
        "role_title": "Software Intern",
        "department": "Engineering",
        "task_description": "Build and test internal tools.",
        "start_date": period.start_date + timedelta(days=7),
        "end_date": period.end_date - timedelta(days=7),
        "proposed_supervisor_name": "Morgan Mentor",
        "proposed_supervisor_email": "mentor@siams.local",
    }
    Placement.objects.get_or_create(
        student=student1,
        period=period,
        defaults={
            **common,
            "status": Placement.Status.APPROVED,
            "academic_supervisor": academic,
            "workplace_supervisor": mentor,
        },
    )
    Placement.objects.get_or_create(
        student=student2, period=period, defaults={**common, "status": Placement.Status.SUBMITTED}
    )
