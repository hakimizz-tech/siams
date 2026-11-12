from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import UserSummarySerializer
from apps.core.enums import Role

from .models import GradeBand, InternshipPeriod, Organization, Placement


class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternshipPeriod
        fields = (
            "id",
            "name",
            "type",
            "start_date",
            "end_date",
            "required_hours",
            "min_visits",
            "assessment_opens_on",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date must not be before start."})
        return attrs


class GradeBandSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeBand
        fields = ("min_percent", "label")


class OrganizationSerializer(serializers.ModelSerializer):
    HIDDEN_FROM_OTHER_STUDENTS = ("address", "contact_email", "contact_phone")

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "address",
            "county",
            "contact_email",
            "contact_phone",
            "is_verified",
            "created_at",
        )
        read_only_fields = ("id", "is_verified", "created_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        user = getattr(self.context.get("request"), "user", None)
        user_id = getattr(user, "id", None)
        if getattr(user, "role", None) == Role.STUDENT and instance.created_by_id != user_id:
            for name in self.HIDDEN_FROM_OTHER_STUDENTS:
                data.pop(name, None)
        return data


class PlacementSerializer(serializers.ModelSerializer):
    student = UserSummarySerializer(read_only=True)
    period = PeriodSerializer(read_only=True)
    organization = OrganizationSerializer(read_only=True)
    academic_supervisor = UserSummarySerializer(read_only=True, allow_null=True)
    workplace_supervisor = UserSummarySerializer(read_only=True, allow_null=True)

    class Meta:
        model = Placement
        fields = (
            "id",
            "status",
            "student",
            "period",
            "organization",
            "academic_supervisor",
            "workplace_supervisor",
            "role_title",
            "department",
            "task_description",
            "start_date",
            "end_date",
            "proposed_supervisor_name",
            "proposed_supervisor_email",
            "proposed_supervisor_phone",
            "coordinator_remarks",
            "submitted_at",
            "decided_at",
            "created_at",
        )
        read_only_fields = fields


class PlacementCreateSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=Role.STUDENT), required=False
    )
    period = serializers.PrimaryKeyRelatedField(queryset=InternshipPeriod.objects.all())
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())

    class Meta:
        model = Placement
        fields = (
            "student",
            "period",
            "organization",
            "role_title",
            "department",
            "task_description",
            "start_date",
            "end_date",
            "proposed_supervisor_name",
            "proposed_supervisor_email",
            "proposed_supervisor_phone",
        )
        validators = []  # uniqueness is enforced by PlacementService and the database


class PlacementUpdateSerializer(serializers.ModelSerializer):
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(), required=False
    )

    class Meta:
        model = Placement
        fields = (
            "organization",
            "role_title",
            "department",
            "task_description",
            "start_date",
            "end_date",
            "proposed_supervisor_name",
            "proposed_supervisor_email",
            "proposed_supervisor_phone",
        )
        validators = []


class ApproveSerializer(serializers.Serializer):
    academic_supervisor = serializers.UUIDField()
    workplace_supervisor = serializers.UUIDField(required=False, allow_null=True)
    invite_workplace_supervisor = serializers.BooleanField(required=False, default=False)
    remarks = serializers.CharField(required=False, allow_blank=True)


class RemarksSerializer(serializers.Serializer):
    remarks = serializers.CharField()


class TerminateSerializer(serializers.Serializer):
    reason = serializers.CharField()


class AssignSupervisorsSerializer(serializers.Serializer):
    academic_supervisor = serializers.UUIDField(required=False)
    workplace_supervisor = serializers.UUIDField(required=False)


class TimelineEventSerializer(serializers.Serializer):
    status = serializers.CharField()
    at = serializers.DateTimeField()
    by = serializers.CharField(allow_null=True)
    remarks = serializers.CharField(allow_blank=True)
