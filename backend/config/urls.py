"""Root URLconf. It only wires platform endpoints and includes `config.api_v1`.

Do not add feature routes here. Each app owns its own `urls.py`.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny, IsAdminUser

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", include("health_check.urls")),
    path("api/v1/", include("config.api_v1")),
]

if settings.ENABLE_API_DOCS:
    _docs_permissions = [AllowAny] if settings.API_DOCS_PUBLIC else [IsAdminUser]
    urlpatterns += [
        path(
            "api/schema/",
            SpectacularAPIView.as_view(permission_classes=_docs_permissions),
            name="schema",
        ),
        path(
            "api/docs/",
            SpectacularSwaggerView.as_view(url_name="schema", permission_classes=_docs_permissions),
            name="swagger-ui",
        ),
        path(
            "api/redoc/",
            SpectacularRedocView.as_view(url_name="schema", permission_classes=_docs_permissions),
            name="redoc",
        ),
    ]
