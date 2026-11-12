"""DashboardBuilder (template method). Each role implements widgets() and action_items();
the base class adds the envelope, notices, graceful degradation and short-lived caching."""

import hashlib
from abc import ABC, abstractmethod

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from apps.reports import sources
from apps.reports.safe import SafeSelectors
from apps.reports.summaries import plain_list


class DashboardBuilder(ABC):
    role: str = ""

    def __init__(self, user, params=None):
        self.user = user
        self.params = params or {}
        self.safe = SafeSelectors()

    @abstractmethod
    def widgets(self) -> dict:
        """The role's widgets, as plain JSON-friendly data."""

    @abstractmethod
    def action_items(self, widgets: dict) -> list:
        """What needs this user's attention now: [{"type", "message", "count"}]."""

    def notices(self) -> list:
        return plain_list(
            self.safe.call(
                "notices.notices_visible_to",
                sources.notices_selectors.notices_visible_to,
                self.user,
                default=[],
            )
        )

    def _cache_key(self) -> str:
        raw = f"{self.role}:{self.user.pk}:{sorted(self.params.items())}"
        return "dashboard:" + hashlib.md5(raw.encode(), usedforsecurity=False).hexdigest()

    def build(self) -> dict:
        ttl = getattr(settings, "DASHBOARD_CACHE_SECONDS", 0)
        if ttl > 0:
            cached = cache.get(self._cache_key())
            if cached is not None:
                return cached
        widgets = self.widgets()
        payload = {
            "role": self.role,
            "generated_at": timezone.now().isoformat(),
            "widgets": widgets,
            "action_items": self.action_items(widgets),
            "notices": self.notices(),
            "unavailable": sorted(self.safe.unavailable),
        }
        if ttl > 0:
            cache.set(self._cache_key(), payload, ttl)
        return payload


def item(kind: str, message: str, count: int = 1) -> dict:
    return {"type": kind, "message": message, "count": count}
