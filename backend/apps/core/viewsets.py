"""Base viewsets. They make the secure pattern the easy one.

Never write `queryset = Model.objects.all()` on a viewset. Implement
`get_scoped_queryset()` by calling a selector that returns only what the
requesting user may see. Objects outside the scope then return 404, not 403.
"""

from typing import Any

from django.db.models import QuerySet
from rest_framework import viewsets


class PermissionsByActionMixin:
    """permission_classes_by_action = {"approve": [IsCoordinator], "create": [IsStudent]}"""

    permission_classes_by_action: dict = {}
    permission_classes: list = []

    def get_permissions(self):
        action = getattr(self, "action", None)
        classes = self.permission_classes_by_action.get(action, self.permission_classes)
        return [permission() for permission in classes]


class ScopedQuerysetMixin:
    """Provide schema-safe, role-scoped querysets for shared viewsets.

    Subclasses must implement ``get_scoped_queryset`` using a selector that
    applies the current request user's visibility rules. During OpenAPI schema
    generation there is no authenticated request user, so an empty queryset
    is returned instead of evaluating a user-dependent selector.
    """

    serializer_class: Any

    def get_scoped_queryset(self) -> QuerySet[Any]:
        """Return objects visible to the current request user."""
        raise NotImplementedError("Implement get_scoped_queryset() with a role-scoped selector.")

    def get_queryset(self) -> QuerySet[Any]:
        """Return a scoped queryset, or an empty queryset during schema generation."""
        if getattr(self, "swagger_fake_view", False):
            return self.serializer_class.Meta.model.objects.none()
        return self.get_scoped_queryset()


class ScopedModelViewSet(PermissionsByActionMixin, ScopedQuerysetMixin, viewsets.ModelViewSet):
    pass


class ScopedReadOnlyViewSet(
    PermissionsByActionMixin, ScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet
):
    pass
