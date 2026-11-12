"""Scoring strategies: pure functions, no database. Swap via settings.SCORING_STRATEGY.

form percent  = sum(score / max_score * weight) / sum(weight) * 100   (scored criteria only)
total percent = sum(form percent * form weight_percent) / 100
grade         = the band with the highest min_percent not above the total
"""

from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.utils.module_loading import import_string

TWO_PLACES = Decimal("0.01")
HUNDRED = Decimal(100)


def quantize(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class ScoredCriterion:
    score: Decimal
    max_score: Decimal
    weight: Decimal


class ScoringStrategy(ABC):
    @abstractmethod
    def form_percent(self, items: Sequence[ScoredCriterion]) -> Decimal:
        """Percent (0-100) for one form."""

    @abstractmethod
    def combine(self, parts: Sequence[tuple[Decimal, Decimal]]) -> Decimal:
        """Combine [(form_percent, form_weight_percent), ...] into the total percent."""

    def grade(self, percent: Decimal, bands: Sequence[tuple[Decimal, str]]) -> str | None:
        """bands: [(min_percent, label), ...] in any order."""
        for minimum, label in sorted(bands, key=lambda band: band[0], reverse=True):
            if percent >= minimum:
                return label
        return None


class WeightedPercentStrategy(ScoringStrategy):
    def form_percent(self, items):
        total_weight = sum((item.weight for item in items), Decimal(0))
        if total_weight == 0:
            return Decimal("0.00")
        earned = sum((item.score / item.max_score * item.weight for item in items), Decimal(0))
        return quantize(earned / total_weight * HUNDRED)

    def combine(self, parts):
        return quantize(sum((percent * weight for percent, weight in parts), Decimal(0)) / HUNDRED)


def get_strategy() -> ScoringStrategy:
    path = getattr(settings, "SCORING_STRATEGY", "apps.assessments.scoring.WeightedPercentStrategy")
    return import_string(path)()
