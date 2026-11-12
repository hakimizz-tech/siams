"""DRF serializers for notice requests and responses."""

from django.utils import timezone
from rest_framework import serializers

from .models import Notice, NoticeAudience


class NoticeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = Notice
        fields = (
            "id",
            "title",
            "body",
            "audience",
            "published_at",
            "expires_at",
            "send_email",
            "created_by",
            "created_by_name",
            "created_at",
        )
        read_only_fields = ("id", "created_by", "created_by_name", "created_at")


class NoticeWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    body = serializers.CharField()
    audience = serializers.ChoiceField(choices=NoticeAudience.choices)
    published_at = serializers.DateTimeField(required=False, default=timezone.now)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    send_email = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not attrs["title"].strip():
            raise serializers.ValidationError({"title": "Title must not be blank."})
        if not attrs["body"].strip():
            raise serializers.ValidationError({"body": "Body must not be blank."})
        if attrs.get("expires_at") is not None and attrs["expires_at"] <= attrs["published_at"]:
            raise serializers.ValidationError(
                {"expires_at": "Expiry must be after the publication time."}
            )
        return attrs
