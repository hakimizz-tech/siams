import django_filters
from django.db.models import Q

from .models import Placement


class PlacementFilter(django_filters.FilterSet):
    supervisor = django_filters.UUIDFilter(method="filter_supervisor")

    class Meta:
        model = Placement
        fields = ["period", "status", "student", "organization"]

    def filter_supervisor(self, queryset, name, value):
        return queryset.filter(Q(academic_supervisor_id=value) | Q(workplace_supervisor_id=value))
