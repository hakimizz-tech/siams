"""Django admin registrations for logbook records."""

from django.contrib import admin

from .models import (
    DailyActivity,
    IntegrityFlag,
    LogbookEntry,
    LogbookFeedback,
    LogbookImage,
)


@admin.register(LogbookEntry)
class LogbookEntryAdmin(admin.ModelAdmin):
    list_display = ("placement_id", "student", "week_start", "status", "submitted_at")
    list_filter = ("status",)
    search_fields = ("student__email", "student__full_name", "placement_id")


@admin.register(DailyActivity)
class DailyActivityAdmin(admin.ModelAdmin):
    list_display = ("entry", "work_date", "hours", "approved_hours")


@admin.register(LogbookImage)
class LogbookImageAdmin(admin.ModelAdmin):
    list_display = ("entry", "original_name", "size_bytes", "work_date")


@admin.register(LogbookFeedback)
class LogbookFeedbackAdmin(admin.ModelAdmin):
    list_display = ("entry", "author", "kind", "created_at")


@admin.register(IntegrityFlag)
class IntegrityFlagAdmin(admin.ModelAdmin):
    list_display = ("placement_id", "type", "resolved", "created_at")
    list_filter = ("type", "resolved")
