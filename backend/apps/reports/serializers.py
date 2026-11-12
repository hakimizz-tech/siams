from rest_framework import serializers


class ExportRequestSerializer(serializers.Serializer):
    report = serializers.ChoiceField(choices=["period_summary"])
    period = serializers.UUIDField()
