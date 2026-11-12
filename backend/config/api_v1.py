"""Version 1 of the API: one include() per app.

Every app owns its routes in `apps/<app>/urls.py`;
"""

from django.urls import include, path

urlpatterns = [
    path("", include("apps.accounts.urls")),
    path("", include("apps.placements.urls")),
    path("", include("apps.assessments.urls")),
    path("", include("apps.reports.urls")),
    path("", include("apps.logbook.urls")),
    path("", include("apps.visits.urls")),
    path("", include("apps.notices.urls")),
]
