"""Role-scoped read queries for visits."""

from collections.abc import Iterable

from django.db.models import Count

from apps.core.enums import Role

from .models import Visit, VisitStatus


def visits_visible_to(user):
    queryset = Visit.objects.select_related("academic_supervisor")
    if user.role == Role.STUDENT:
        return queryset.filter(student_id=user.id)
    if user.role == Role.WORKPLACE_SUPERVISOR:
        return queryset.filter(workplace_supervisor_id=user.id)
    if user.role == Role.ACADEMIC_SUPERVISOR:
        return queryset.filter(academic_supervisor=user)
    return queryset


def upcoming_visits_for(user, limit: int = 5):
    """Scheduled visits the user takes part in, soonest first."""
    return (
        visits_visible_to(user)
        .filter(status=VisitStatus.SCHEDULED)
        .order_by("scheduled_at")[:limit]
    )


def completed_visit_counts(placement_ids: Iterable) -> dict:
    """Return completed visit counts keyed by placement UUID."""
    rows = (
        Visit.objects.filter(
            placement_id__in=placement_ids,
            status=VisitStatus.COMPLETED,
        )
        .values("placement_id")
        .annotate(total=Count("id"))
    )
    return {row["placement_id"]: row["total"] for row in rows}


def visits_for_placement(placement_id, user):
    """Return visits for a placement after applying the user's scope."""
    return visits_visible_to(user).filter(placement_id=placement_id)
