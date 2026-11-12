"""Role-scoped read queries for notices."""

from django.db.models import Q
from django.utils import timezone

from apps.core.enums import Role

from .models import Notice, NoticeAudience


def notices_visible_to(user):
    """Return currently active notices matching the user's role."""
    now = timezone.now()
    audience = Q(audience=NoticeAudience.ALL)
    if user.role != Role.COORDINATOR:
        audience |= Q(audience=user.role)
    return (
        Notice.objects.filter(
            audience,
            published_at__lte=now,
        )
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
        .select_related("created_by")
    )
