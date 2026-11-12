from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import GradeBandsView, OrganizationViewSet, PeriodViewSet, PlacementViewSet

router = SimpleRouter()
router.register("periods", PeriodViewSet, basename="period")
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("placements", PlacementViewSet, basename="placement")

urlpatterns = [
    path("periods/<uuid:period_id>/grade-bands/", GradeBandsView.as_view(), name="grade-bands"),
    path("", include(router.urls)),
]
