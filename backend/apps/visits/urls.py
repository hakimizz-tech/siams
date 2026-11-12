from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import PlacementVisitView, VisitViewSet

router = SimpleRouter()
router.register("visits", VisitViewSet, basename="visit")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "placements/<uuid:placement_id>/visits/",
        PlacementVisitView.as_view(),
        name="placement-visits",
    ),
]
