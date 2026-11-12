from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import NoticeViewSet

router = SimpleRouter()
router.register("notices", NoticeViewSet, basename="notice")

urlpatterns = [
    path("", include(router.urls)),
]
