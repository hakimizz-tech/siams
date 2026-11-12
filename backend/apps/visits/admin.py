"""Django admin registration for visits."""

from django.contrib import admin

from .models import Visit


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = (
        "placement_id",
        "academic_supervisor",
        "mode",
        "scheduled_at",
        "status",
    )
    list_filter = ("mode", "status")
    search_fields = (
        "placement_id",
        "academic_supervisor__email",
        "academic_supervisor__full_name",
    )
