"""HTTP endpoints for account administration and the current user profile."""

from typing import Any, cast

from django.core.files.uploadedfile import UploadedFile
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import RuleViolation
from apps.core.jobs import create_job, get_job
from apps.core.permissions import IsCoordinator
from apps.core.viewsets import ScopedModelViewSet, ScopedReadOnlyViewSet

from . import selectors
from .serializers import (
    MeSerializer,
    SupervisorSerializer,
    UserImportUploadSerializer,
    UserReadSerializer,
    UserWriteSerializer,
)
from .services import UserService
from .tasks import import_users_csv

MAX_CSV_BYTES = 2 * 1024 * 1024


@extend_schema_view(
    create=extend_schema(request=UserWriteSerializer, responses={201: UserReadSerializer}),
    update=extend_schema(request=UserWriteSerializer, responses=UserReadSerializer),
    partial_update=extend_schema(request=UserWriteSerializer, responses=UserReadSerializer),
)
class UserViewSet(ScopedModelViewSet):
    """Manage user accounts for coordinators.

    Coordinators can list, search, filter, create, and update users within the
    selector's permitted scope. User roles are immutable after creation;
    profile fields and organization assignments can be updated through the
    write serializer.
    """

    serializer_class = UserReadSerializer
    permission_classes = [IsCoordinator]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]
    filterset_fields = ["role", "is_active"]
    search_fields = ["email", "full_name"]
    ordering_fields = ["email", "full_name", "created_at"]
    ordering = ["email"]

    def get_scoped_queryset(self):
        return selectors.users_visible_to(self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a user and optionally send an invitation email."""
        serializer = UserWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        data["organization_id"] = data.pop("organization", None)
        user = UserService.create_user(**data)
        return Response(UserReadSerializer(user).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update an existing user without allowing a role change."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = UserWriteSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        role = data.pop("role", None)
        if role is not None and role != instance.role:
            raise RuleViolation("A user's role cannot be changed.", code="role_immutable")
        data.pop("send_invite", None)
        if "organization" in data:
            data["organization_id"] = data.pop("organization")
        user = UserService.update_user(instance, **data)
        return Response(UserReadSerializer(user).data)


class SupervisorViewSet(ScopedReadOnlyViewSet):
    """Provide coordinator-only supervisor choices for assignment pickers."""

    serializer_class = SupervisorSerializer
    permission_classes = [IsCoordinator]
    filterset_fields = ["role"]
    search_fields = ["email", "full_name"]
    ordering = ["full_name"]

    def get_scoped_queryset(self):
        return selectors.supervisors_visible_to(self.request.user)


class MeView(generics.RetrieveUpdateAPIView):
    """Return and update the authenticated user's editable profile fields."""

    serializer_class = MeSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        """Resolve the profile belonging to the authenticated user."""
        return selectors.user_with_profiles(self.request.user.pk)


class UserImportView(APIView):
    """Start an asynchronous coordinator-only CSV user import."""

    permission_classes = [IsCoordinator]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request=UserImportUploadSerializer, responses={202: OpenApiTypes.OBJECT})
    def post(self, request):
        """Validate a UTF-8 CSV upload and return its background task ID."""
        serializer = UserImportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        upload = cast(UploadedFile, data["file"])
        if upload.size > MAX_CSV_BYTES:
            raise RuleViolation("CSV is larger than 2 MB.", code="file_too_large")
        if not upload.name.lower().endswith(".csv"):
            raise RuleViolation("Upload a .csv file.", code="bad_csv")
        try:
            text = upload.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            raise RuleViolation("The CSV must be UTF-8 encoded.", code="bad_csv") from None
        send_invites = str(request.data.get("send_invites", "true")).lower() not in (
            "false",
            "0",
            "no",
        )
        task_id = create_job("user_import", request.user.pk)
        cast(Any, import_users_csv).delay(task_id, text, send_invites)
        return Response({"task_id": task_id, "status": "PENDING"}, status=status.HTTP_202_ACCEPTED)


class UserImportStatusView(APIView):
    """Return the status of an import task created by the current coordinator."""

    permission_classes = [IsCoordinator]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request, task_id):
        """Return task progress without exposing another coordinator's job."""
        job = get_job(task_id)
        if (
            not job
            or job.get("kind") != "user_import"
            or job.get("user_id") != str(request.user.pk)
        ):
            raise NotFound()
        payload = {key: value for key, value in job.items() if key != "user_id"}
        return Response({"task_id": task_id, **payload})
