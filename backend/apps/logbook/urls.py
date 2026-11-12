"""URL routes owned by the logbook app."""

from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    FlagViewSet,
    LogbookEntryViewSet,
    LogbookImageFileView,
    LogbookImageView,
    PendingReviewsView,
    PlacementLogbookTimelineView,
    PlacementLogbookView,
)

router = SimpleRouter()
router.register("logbook", LogbookEntryViewSet, basename="logbook-entry")
router.register("flags", FlagViewSet, basename="logbook-flag")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "placements/<uuid:placement_id>/logbook/",
        PlacementLogbookView.as_view(),
        name="placement-logbook",
    ),
    path(
        "placements/<uuid:placement_id>/logbook/timeline/",
        PlacementLogbookTimelineView.as_view(),
        name="placement-logbook-timeline",
    ),
    path("logbook/pending/", PendingReviewsView.as_view(), name="logbook-pending"),
    path(
        "logbook/images/<uuid:image_id>/",
        LogbookImageView.as_view(),
        name="logbook-image",
    ),
    path(
        "logbook/images/<uuid:image_id>/file/",
        LogbookImageFileView.as_view(),
        name="logbook-image-file",
    ),
]
