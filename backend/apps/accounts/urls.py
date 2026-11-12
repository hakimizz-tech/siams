from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    MeView,
    SupervisorViewSet,
    UserImportStatusView,
    UserImportView,
    UserViewSet,
)

router = SimpleRouter()
router.register("users", UserViewSet, basename="user")
router.register("supervisors", SupervisorViewSet, basename="supervisor")

urlpatterns = [
    path("auth/", include("dj_rest_auth.urls")),
    # explicit routes first, so "me" and "import" are never read as a user id
    path("users/me/", MeView.as_view(), name="user-me"),
    path("users/import/", UserImportView.as_view(), name="user-import"),
    path("users/import/<str:task_id>/", UserImportStatusView.as_view(), name="user-import-status"),
    path("", include(router.urls)),
]
