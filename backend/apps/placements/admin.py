from django.contrib import admin

from .models import GradeBand, InternshipPeriod, Organization, Placement


class GradeBandInline(admin.TabularInline):
    model = GradeBand
    extra = 0


@admin.register(InternshipPeriod)
class InternshipPeriodAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "start_date", "end_date", "required_hours", "min_visits")
    inlines = [GradeBandInline]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "county", "is_verified", "created_by")
    list_filter = ("is_verified", "county")
    search_fields = ("name",)


@admin.register(Placement)
class PlacementAdmin(admin.ModelAdmin):
    list_display = ("student", "organization", "period", "status", "start_date", "end_date")
    list_filter = ("status", "period")
    raw_id_fields = ("student", "academic_supervisor", "workplace_supervisor", "decided_by")
