from django.urls import reverse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.core.enums import Role

from .models import Assessment, AssessmentForm, AssessmentScore, Criterion, FinalReport


class CriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Criterion
        fields = (
            "id",
            "code",
            "section",
            "name",
            "type",
            "max_score",
            "weight",
            "required",
            "position",
        )
        read_only_fields = fields


class CriterionInputSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=150, required=False, allow_blank=True)
    name = serializers.CharField(max_length=255)
    type = serializers.ChoiceField(choices=Criterion.Type.choices, default=Criterion.Type.SCORE)
    max_score = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    weight = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, default=1)
    required = serializers.BooleanField(default=True)


class AssessmentFormSerializer(serializers.ModelSerializer):
    criteria = CriterionSerializer(many=True, read_only=True)

    class Meta:
        model = AssessmentForm
        fields = (
            "id",
            "period",
            "name",
            "assessor_role",
            "version",
            "weight_percent",
            "is_active",
            "is_locked",
            "criteria",
        )
        read_only_fields = fields


class AssessmentFormWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    assessor_role = serializers.ChoiceField(
        choices=[Role.WORKPLACE_SUPERVISOR.value, Role.ACADEMIC_SUPERVISOR.value]
    )
    weight_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100
    )
    is_active = serializers.BooleanField(required=False, default=True)
    criteria = CriterionInputSerializer(many=True, allow_empty=False)


class AssessmentFormPatchSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False)
    weight_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100, required=False
    )
    is_active = serializers.BooleanField(required=False)


class AssessmentFormImportSerializer(AssessmentFormWriteSerializer):
    period = serializers.UUIDField()


class ScoreSerializer(serializers.ModelSerializer):
    criterion_code = serializers.CharField(source="criterion.code", read_only=True)
    criterion_name = serializers.CharField(source="criterion.name", read_only=True)

    class Meta:
        model = AssessmentScore
        fields = ("criterion", "criterion_code", "criterion_name", "score", "remark")
        read_only_fields = fields


class ScoreInputSerializer(serializers.Serializer):
    criterion = serializers.UUIDField()
    score = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    remark = serializers.CharField(required=False, allow_blank=True, default="")


class AssessmentSerializer(serializers.ModelSerializer):
    form_name = serializers.CharField(source="form.name", read_only=True)
    form_version = serializers.IntegerField(source="form.version", read_only=True)
    assessor_name = serializers.CharField(source="assessor.full_name", read_only=True)
    scores = ScoreSerializer(many=True, read_only=True)

    class Meta:
        model = Assessment
        fields = (
            "id",
            "placement",
            "form",
            "form_name",
            "form_version",
            "assessor",
            "assessor_name",
            "status",
            "comment",
            "percent",
            "submitted_at",
            "scores",
        )
        read_only_fields = fields


class AssessmentCreateSerializer(serializers.Serializer):
    form = serializers.UUIDField()
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    scores = ScoreInputSerializer(many=True, required=False)


class AssessmentUpdateSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)
    scores = ScoreInputSerializer(many=True, required=False)


class FinalReportSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = FinalReport
        fields = (
            "id",
            "placement",
            "title",
            "original_name",
            "size_bytes",
            "status",
            "feedback",
            "reviewed_at",
            "created_at",
            "updated_at",
            "download_url",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_download_url(self, obj):
        return reverse("final-report-file", kwargs={"pk": obj.pk})


class FinalReportUploadSerializer(serializers.Serializer):
    document = serializers.FileField()
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)


class FinalReportReturnSerializer(serializers.Serializer):
    feedback = serializers.CharField()
