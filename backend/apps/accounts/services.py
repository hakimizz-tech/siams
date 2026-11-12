import csv
import io
import secrets
from dataclasses import dataclass, field
from typing import cast

from django.apps import apps as django_apps
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.core import events
from apps.core.enums import Role
from apps.core.exceptions import DomainError, RuleViolation

from . import selectors
from .managers import UserManager
from .models import StudentProfile, SupervisorProfile, User

REQUIRED_CSV_COLUMNS = {"email", "full_name", "role"}


def send_set_password_email(user: User) -> None:
    """Email a one-time link to the frontend's reset-password page."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{uid}/{token}/"
    body = render_to_string("accounts/invite_email.txt", {"user": user, "link": link})
    send_mail("Set your SIAMS password", body, settings.DEFAULT_FROM_EMAIL, [user.email])


def _resolve_organization(organization_id):
    if not organization_id:
        return None
    organization_model = django_apps.get_model("placements", "Organization")
    organization = organization_model.objects.filter(pk=organization_id).first()
    if organization is None:
        raise RuleViolation("Organisation not found.", code="organization_not_found")
    return organization


def _validate_new_user(*, email: str, role: str, registration_number: str) -> None:
    if role not in Role.values:
        raise RuleViolation("Unknown role.", code="invalid_role")
    try:
        validate_email(email)
    except DjangoValidationError:
        raise RuleViolation("Enter a valid email address.", code="invalid_email") from None
    if User.objects.filter(email__iexact=email).exists():
        raise RuleViolation("A user with this email already exists.", code="email_taken")
    if role == Role.STUDENT:
        registration_number = registration_number.strip()
        if not registration_number:
            raise RuleViolation(
                "Students need a registration number.",
                code="registration_required",
            )
        if StudentProfile.objects.filter(registration_number__iexact=registration_number).exists():
            raise RuleViolation("Registration number already in use.", code="registration_taken")


@dataclass
class ImportReport:
    created: int = 0
    errors: list = field(default_factory=list)


def _int_or_none(value):
    return int(value) if str(value).strip() else None


def _row_kwargs(row: dict) -> dict:
    organization_id = None
    if row.get("organization"):
        organization_model = django_apps.get_model("placements", "Organization")
        organization = organization_model.objects.filter(name__iexact=row["organization"]).first()
        if organization is None:
            raise RuleViolation(f"Unknown organization '{row['organization']}'.")
        organization_id = organization.pk
    return {
        "email": row.get("email", ""),
        "full_name": row.get("full_name", ""),
        "role": row.get("role", "").upper(),
        "phone": row.get("phone", ""),
        "registration_number": row.get("registration_number", ""),
        "programme": row.get("programme", ""),
        "year_of_study": _int_or_none(row.get("year_of_study", "")),
        "organization_id": organization_id,
        "job_title": row.get("job_title", ""),
        "department": row.get("department", ""),
    }


def _message(exc: Exception) -> str:
    if isinstance(exc, DomainError):
        return exc.message
    if isinstance(exc, DjangoValidationError):
        return "; ".join(exc.messages)
    return str(exc)


class UserService:
    @staticmethod
    def create_user(
        *,
        email,
        full_name,
        role,
        phone="",
        is_active=True,
        send_invite=True,
        password=None,
        registration_number="",
        programme="",
        year_of_study=None,
        organization_id=None,
        job_title="",
        department="",
    ) -> User:
        """Create a user and profile. Invited users get a random password nobody knows,
        and an email with a link to set their own (the normal reset flow also works)."""
        email = (email or "").strip().lower()
        _validate_new_user(email=email, role=role, registration_number=registration_number)
        organization = _resolve_organization(organization_id)
        with transaction.atomic():
            manager = cast(UserManager, User.objects)
            user = manager.create_user(
                email,
                password or secrets.token_urlsafe(32),
                full_name=full_name.strip(),
                phone=phone,
                role=role,
                is_active=is_active,
            )
            if role == Role.STUDENT:
                StudentProfile.objects.create(
                    user=user,
                    registration_number=registration_number.strip(),
                    programme=programme,
                    year_of_study=year_of_study,
                )
            elif role in (Role.WORKPLACE_SUPERVISOR, Role.ACADEMIC_SUPERVISOR):
                SupervisorProfile.objects.create(
                    user=user, organization=organization, job_title=job_title, department=department
                )
            if send_invite and is_active:
                transaction.on_commit(lambda: send_set_password_email(user))
        return user

    @staticmethod
    def update_user(user: User, **fields) -> User:
        with transaction.atomic():
            email = fields.get("email")
            if email is not None:
                email = email.strip().lower()
                if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                    raise RuleViolation(
                        "A user with this email already exists.",
                        code="email_taken",
                    )
                user.email = email
            for name in ("full_name", "phone", "is_active"):
                if fields.get(name) is not None:
                    setattr(user, name, fields[name])
            user.save()

            student_profile = getattr(user, "student_profile", None)
            if student_profile is not None:
                reg = (fields.get("registration_number") or "").strip()
                if reg and reg != student_profile.registration_number:
                    clash = StudentProfile.objects.filter(registration_number__iexact=reg)
                    if clash.exclude(pk=student_profile.pk).exists():
                        raise RuleViolation("Registration number already in use.")
                    student_profile.registration_number = reg
                if fields.get("programme") is not None:
                    student_profile.programme = fields["programme"]
                if "year_of_study" in fields:
                    student_profile.year_of_study = fields["year_of_study"]
                student_profile.save()

            supervisor_profile = getattr(user, "supervisor_profile", None)
            if supervisor_profile is not None:
                if "organization_id" in fields:
                    supervisor_profile.organization = _resolve_organization(
                        fields["organization_id"]
                    )
                for name in ("job_title", "department"):
                    if fields.get(name) is not None:
                        setattr(supervisor_profile, name, fields[name])
                supervisor_profile.save()
        return selectors.user_with_profiles(user.pk)

    @staticmethod
    def invite_workplace_supervisor(*, name, email, phone="", organization, placement_id) -> User:
        """Return the workplace supervisor with this email, creating and inviting if new."""
        email = (email or "").strip().lower()
        existing = User.objects.filter(email__iexact=email).first()
        if existing is not None:
            if existing.role != Role.WORKPLACE_SUPERVISOR:
                raise RuleViolation(
                    "This email belongs to an account that is not a workplace supervisor.",
                    code="email_taken",
                )
            return existing
        user = UserService.create_user(
            email=email,
            full_name=name,
            role=Role.WORKPLACE_SUPERVISOR,
            phone=phone,
            organization_id=organization.pk,
        )
        events.emit(
            events.workplace_supervisor_invited,
            sender=UserService,
            user_id=user.pk,
            placement_id=placement_id,
        )
        return user

    @staticmethod
    def bulk_import(csv_text: str, *, send_invites: bool = True) -> ImportReport:
        """Columns: email, full_name, role (required); phone, registration_number, programme,
        year_of_study, organization, job_title, department (optional). One bad row never
        stops the others; errors are reported with their CSV line number."""
        reader = csv.DictReader(io.StringIO(csv_text))
        headers = {(name or "").strip().lower() for name in (reader.fieldnames or [])}
        missing = REQUIRED_CSV_COLUMNS - headers
        if missing:
            raise RuleViolation(
                f"Missing required column(s): {', '.join(sorted(missing))}.", code="bad_csv"
            )
        report = ImportReport()
        for line, raw in enumerate(reader, start=2):
            row = {
                key.strip().lower(): (value or "").strip()
                for key, value in raw.items()
                if key is not None and not isinstance(value, list)
            }
            try:
                UserService.create_user(**_row_kwargs(row), send_invite=send_invites)
                report.created += 1
            except (DomainError, DjangoValidationError, ValueError) as exc:
                report.errors.append(
                    {"row": line, "email": row.get("email", ""), "error": _message(exc)}
                )
        return report
