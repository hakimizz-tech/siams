from dj_rest_auth.serializers import LoginSerializer
from dj_rest_auth.serializers import PasswordResetSerializer as BasePasswordResetSerializer
from django.conf import settings
from rest_framework import serializers

from apps.core.enums import Role

from .models import StudentProfile, SupervisorProfile, User


class EmailLoginSerializer(LoginSerializer):
    """Log in with email and password only (no username field)."""

    username = None
    email = serializers.EmailField()


class PasswordResetSerializer(BasePasswordResetSerializer):
    """Reset emails link to the frontend page (FRONTEND_URL/reset-password/<uid>/<token>/)."""

    def get_email_options(self):
        return {
            "email_template_name": "accounts/password_reset_email.txt",
            "subject_template_name": "accounts/password_reset_subject.txt",
            "extra_email_context": {"frontend_url": settings.FRONTEND_URL.rstrip("/")},
        }


class UserDetailsSerializer(serializers.ModelSerializer):
    """Used by dj-rest-auth for /auth/user/ and the login response."""

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone", "role")
        read_only_fields = ("id", "email", "role")


class UserSummarySerializer(serializers.ModelSerializer):
    """Small nested representation used by other apps' serializers."""

    class Meta:
        model = User
        fields = ("id", "full_name", "email", "phone")
        read_only_fields = fields


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ("registration_number", "programme", "year_of_study")


class SupervisorProfileSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(
        source="organization.name", read_only=True, default=None, allow_null=True
    )

    class Meta:
        model = SupervisorProfile
        fields = ("organization", "organization_name", "job_title", "department")


class UserReadSerializer(serializers.ModelSerializer):
    student_profile = StudentProfileSerializer(read_only=True, allow_null=True)
    supervisor_profile = SupervisorProfileSerializer(read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "is_active",
            "created_at",
            "student_profile",
            "supervisor_profile",
        )
        read_only_fields = fields


class MeSerializer(UserReadSerializer):
    """The current user: only name and phone may be changed."""

    class Meta(UserReadSerializer.Meta):
        read_only_fields = ("id", "email", "role", "is_active", "created_at")


class UserWriteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=Role.choices)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    send_invite = serializers.BooleanField(required=False, default=True)
    registration_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    programme = serializers.CharField(max_length=150, required=False, allow_blank=True)
    year_of_study = serializers.IntegerField(
        min_value=1, max_value=10, required=False, allow_null=True
    )
    organization = serializers.UUIDField(required=False, allow_null=True)
    job_title = serializers.CharField(max_length=150, required=False, allow_blank=True)
    department = serializers.CharField(max_length=150, required=False, allow_blank=True)


class SupervisorSerializer(serializers.ModelSerializer):
    organization = serializers.UUIDField(
        source="supervisor_profile.organization_id", read_only=True, default=None, allow_null=True
    )
    organization_name = serializers.CharField(
        source="supervisor_profile.organization.name",
        read_only=True,
        default=None,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = ("id", "full_name", "email", "role", "organization", "organization_name")
        read_only_fields = fields


class UserImportUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
