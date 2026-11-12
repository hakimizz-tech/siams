"""Validation and integrity rules for weekly logbook entries."""

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.utils import timezone

from apps.core.exceptions import RuleViolation
from apps.core.utils.text import normalize_and_hash
from apps.core.utils.timeutils import week_start

from .models import FlagType, RuleOutcome


@dataclass(frozen=True)
class RuleResult:
    outcome: str
    reason: str = ""
    flag_type: str | None = None

    @classmethod
    def passed(cls):
        return cls(RuleOutcome.PASS)

    @classmethod
    def flagged(cls, flag_type: str, reason: str):
        return cls(RuleOutcome.FLAG, reason, flag_type)

    @classmethod
    def rejected(cls, reason: str):
        return cls(RuleOutcome.REJECT, reason)


@dataclass(frozen=True)
class RuleContext:
    placement: Any
    entry: Any
    activity: dict[str, Any] | None = None
    existing_hashes: frozenset[str] = frozenset()
    now: Any = None

    @property
    def current_time(self):
        return self.now or timezone.now()


class LogbookRule:
    """Interface implemented by each rule in the validation chain."""

    def evaluate(self, context: RuleContext) -> RuleResult:
        raise NotImplementedError


class DateWithinPlacementRule(LogbookRule):
    def evaluate(self, context: RuleContext) -> RuleResult:
        if not context.activity:
            return RuleResult.passed()
        start = getattr(context.placement, "start_date", None)
        end = getattr(context.placement, "end_date", None)
        work_date = context.activity["work_date"]
        if start and work_date < start or end and work_date > end:
            return RuleResult.rejected("Activity date must be inside the placement dates.")
        return RuleResult.passed()


class NoFutureDateRule(LogbookRule):
    def evaluate(self, context: RuleContext) -> RuleResult:
        if context.activity and context.activity["work_date"] > context.current_time.date():
            return RuleResult.rejected("Activity date cannot be in the future.")
        return RuleResult.passed()


class HoursPerDayRule(LogbookRule):
    def evaluate(self, context: RuleContext) -> RuleResult:
        if not context.activity:
            return RuleResult.passed()
        hours = Decimal(str(context.activity["hours"]))
        if hours <= 0 or hours > 12:
            return RuleResult.rejected("Daily hours must be greater than 0 and at most 12.")
        return RuleResult.passed()


class WeeklyTotalRule(LogbookRule):
    def evaluate(self, context: RuleContext) -> RuleResult:
        if not context.entry:
            return RuleResult.passed()
        activities = context.entry.get("activities", [])
        total = sum((Decimal(str(item["hours"])) for item in activities), Decimal("0"))
        if total > 60:
            return RuleResult.flagged(
                FlagType.HOURS_OUTLIER,
                "The claimed weekly hours exceed 60.",
            )
        return RuleResult.passed()


class MinimumDescriptionRule(LogbookRule):
    def evaluate(self, context: RuleContext) -> RuleResult:
        if context.activity and len(context.activity["description"].strip()) < 30:
            return RuleResult.rejected(
                "Each activity description must contain at least 30 characters."
            )
        return RuleResult.passed()


class DuplicateContentRule(LogbookRule):
    def evaluate(self, context: RuleContext) -> RuleResult:
        if not context.activity:
            return RuleResult.passed()
        content_hash = normalize_and_hash(context.activity["description"])
        if content_hash in context.existing_hashes:
            return RuleResult.flagged(
                FlagType.DUPLICATE_CONTENT,
                "This activity description matches an earlier logbook entry.",
            )
        return RuleResult.passed()


class OffDayRule(LogbookRule):
    def evaluate(self, context: RuleContext) -> RuleResult:
        if context.activity and context.activity["work_date"].weekday() >= 5:
            return RuleResult.flagged(
                FlagType.OFF_DAY_WORK,
                "The activity was recorded on a weekend.",
            )
        return RuleResult.passed()


class LateSubmissionRule(LogbookRule):
    def evaluate(self, context: RuleContext) -> RuleResult:
        if not context.entry:
            return RuleResult.passed()
        deadline = context.entry["week_start"] + timedelta(days=13)
        if context.current_time.date() > deadline:
            return RuleResult.flagged(
                FlagType.LATE_SUBMISSION,
                "The weekly entry was submitted more than seven days after the week ended.",
            )
        return RuleResult.passed()


DEFAULT_RULES = (
    DateWithinPlacementRule,
    NoFutureDateRule,
    HoursPerDayRule,
    MinimumDescriptionRule,
    DuplicateContentRule,
    OffDayRule,
    WeeklyTotalRule,
)


def validate_week(placement, week_start_date: date, activities: list[dict], existing_hashes=None):
    """Run all blocking and non-blocking rules for a proposed weekly entry."""
    if week_start(week_start_date) != week_start_date:
        raise RuleViolation("week_start must be a Monday.", code="invalid_week_start")

    context_entry = {"week_start": week_start_date, "activities": activities}
    results = []
    hashes = frozenset(existing_hashes or ())
    for activity in activities:
        context = RuleContext(
            placement=placement,
            entry=context_entry,
            activity=activity,
            existing_hashes=hashes,
        )
        for rule_class in DEFAULT_RULES:
            result = rule_class().evaluate(context)
            if result.outcome == RuleOutcome.REJECT:
                raise RuleViolation(result.reason)
            if result.outcome == RuleOutcome.FLAG:
                results.append(result)
        hashes = hashes | {normalize_and_hash(activity["description"])}
    return results
