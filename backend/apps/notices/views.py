"""HTTP endpoints for role-based announcements."""

from typing import Any, cast

from django.http import Http404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notice
from .permissions import IsCoordinator
from .selectors import notices_visible_to
from .serializers import NoticeSerializer, NoticeWriteSerializer
from .services import NoticeService


class NoticeViewSet(viewsets.GenericViewSet):
    """Expose role-scoped announcements and coordinator publishing.

    Authenticated users can list and retrieve notices currently published for
    everyone or for their own role. Expired and future notices are excluded
    from reads. Coordinators can create announcements for a selected audience,
    optionally schedule publication or expiry, and optionally request email
    delivery.
    """

    serializer_class = NoticeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notice.objects.none()
        return notices_visible_to(self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return NoticeWriteSerializer
        return NoticeSerializer

    def list(self, request):
        """Return active notices visible to the authenticated user's role."""
        return Response(self.get_serializer(notices_visible_to(request.user), many=True).data)

    def retrieve(self, request, pk=None):
        """Return one active notice if it is visible to the current user."""
        notice = notices_visible_to(request.user).filter(pk=pk).first()
        if notice is None:
            raise Http404
        return Response(self.get_serializer(notice).data)

    def create(self, request):
        """Publish a notice for an audience; restricted to coordinators.

        The request accepts a title, body, audience, optional publication and
        expiry timestamps, and a ``send_email`` flag. The response contains the
        created notice, including its identifier, author, and publication data.
        """
        if not IsCoordinator().has_permission(request, self):
            return Response(
                {"detail": "Only coordinators can post notices."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        notice = NoticeService().post(request.user, data)
        return Response(NoticeSerializer(notice).data, status=status.HTTP_201_CREATED)
