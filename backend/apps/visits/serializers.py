"""DRF serializers for visit requests and responses."""

from rest_framework import serializers

from .models import Visit, VisitMode


class VisitSerializer(serializers.ModelSerializer):
    academic_supervisor_name = serializers.CharField(
        source="academic_supervisor.full_name",
        read_only=True,
    )

    class Meta:
        model = Visit
        fields = (
            "id",
            "placement_id",
            "student_id",
            "academic_supervisor",
            "academic_supervisor_name",
            "workplace_supervisor_id",
            "mode",
            "scheduled_at",
            "status",
            "meeting_link",
            "notes",
            "findings",
            "completed_at",
        )
        read_only_fields = (
            "id",
            "placement_id",
            "student_id",
            "academic_supervisor",
            "academic_supervisor_name",
            "workplace_supervisor_id",
            "status",
            "findings",
            "completed_at",
        )


class VisitWriteSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=VisitMode.choices)
    scheduled_at = serializers.DateTimeField()
    meeting_link = serializers.URLField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class VisitUpdateSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=VisitMode.choices, required=False)
    scheduled_at = serializers.DateTimeField(required=False)
    meeting_link = serializers.URLField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class VisitCompleteSerializer(serializers.Serializer):
    findings = serializers.CharField()
