"""DRF serializers for logbook requests and responses."""

from rest_framework import serializers

from .models import (
    DailyActivity,
    IntegrityFlag,
    LogbookEntry,
    LogbookFeedback,
    LogbookImage,
)


class DailyActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyActivity
        fields = (
            "id",
            "work_date",
            "hours",
            "approved_hours",
            "description",
        )
        read_only_fields = ("id", "approved_hours")


class LogbookImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogbookImage
        fields = ("id", "original_name", "size_bytes", "caption", "work_date", "image")
        read_only_fields = ("id", "original_name", "size_bytes", "image")


class LogbookFeedbackSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = LogbookFeedback
        fields = ("id", "author", "author_name", "kind", "comment", "created_at")
        read_only_fields = ("id", "author", "author_name", "kind", "created_at")


class IntegrityFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrityFlag
        fields = (
            "id",
            "placement_id",
            "entry",
            "type",
            "detail",
            "resolved",
            "resolved_by",
            "resolved_at",
            "resolution_note",
        )
        read_only_fields = (
            "id",
            "placement_id",
            "entry",
            "type",
            "detail",
            "resolved_by",
            "resolved_at",
        )


class LogbookEntrySerializer(serializers.ModelSerializer):
    activities = DailyActivitySerializer(many=True)
    images = LogbookImageSerializer(many=True, read_only=True)
    feedback = LogbookFeedbackSerializer(many=True, read_only=True)
    flags = IntegrityFlagSerializer(many=True, read_only=True)
    claimed_hours = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        read_only=True,
    )
    approved_hours = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = LogbookEntry
        fields = (
            "id",
            "placement_id",
            "week_start",
            "summary",
            "status",
            "submitted_at",
            "reviewed_at",
            "claimed_hours",
            "approved_hours",
            "activities",
            "images",
            "feedback",
            "flags",
        )
        read_only_fields = (
            "id",
            "placement_id",
            "status",
            "submitted_at",
            "reviewed_at",
            "claimed_hours",
            "approved_hours",
        )


class LogbookWriteSerializer(serializers.Serializer):
    week_start = serializers.DateField()
    summary = serializers.CharField(required=False, allow_blank=True)
    activities = DailyActivitySerializer(many=True)


class ApproveSerializer(serializers.Serializer):
    adjustments = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class CommentSerializer(serializers.Serializer):
    comment = serializers.CharField()


class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()
    caption = serializers.CharField(required=False, allow_blank=True, default="")
    work_date = serializers.DateField(required=False)
