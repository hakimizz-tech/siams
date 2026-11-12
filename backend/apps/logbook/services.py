"""Transactional write use cases for weekly logbooks."""

from decimal import Decimal

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from apps.core import events
from apps.core.enums import Role
from apps.core.exceptions import DomainError, InvalidTransition, RuleViolation
from apps.core.utils.text import normalize_and_hash
from apps.core.validators import validate_image

from .images import ImageProcessor
from .models import (
    FeedbackKind,
    FlagType,
    IntegrityFlag,
    LogbookEntry,
    LogbookFeedback,
    LogbookImage,
    LogbookStatus,
)
from .rules import LateSubmissionRule, RuleContext, validate_week


def _placement_id(placement) -> str:
    value = getattr(placement, "id", placement)
    return str(value)


def _placement_status(placement) -> str:
    return str(getattr(placement, "status", "APPROVED")).upper()


def _is_assigned_supervisor(placement, user) -> bool:
    return str(getattr(placement, "workplace_supervisor_id", "")) == str(user.id)


class LogbookService:
    """Owns all state-changing logbook operations."""

    def __init__(self, *, clock=timezone.now, rules=None, image_processor=None):
        self.clock = clock
        self.rules = rules
        self.image_processor = image_processor or ImageProcessor()

    @transaction.atomic
    def save_week(self, placement, student, data, entry=None):
        if _placement_status(placement) != "APPROVED":
            raise RuleViolation("Logbook entries require an approved placement.")
        if entry and entry.student_id != student.id:
            raise DomainError("You may only edit your own logbook entries.", code="not_owner")
        if entry and entry.status not in (LogbookStatus.DRAFT, LogbookStatus.RETURNED):
            raise InvalidTransition("Only draft or returned entries can be edited.")

        activities = self._normalize_activities(data.get("activities", []))
        hashes = set(
            LogbookEntry.objects.filter(student=student)
            .exclude(pk=getattr(entry, "pk", None))
            .values_list("activities__content_hash", flat=True)
        )
        flag_results = validate_week(
            placement,
            data["week_start"],
            activities,
            existing_hashes=hashes,
        )
        if entry is None:
            entry = LogbookEntry.objects.create(
                placement_id=_placement_id(placement),
                student=student,
                workplace_supervisor_id=getattr(placement, "workplace_supervisor_id", None),
                academic_supervisor_id=getattr(placement, "academic_supervisor_id", None),
                week_start=data["week_start"],
                summary=data.get("summary", ""),
            )
        else:
            entry.summary = data.get("summary", "")
            entry.week_start = data["week_start"]
            entry.save(update_fields=["summary", "week_start", "updated_at"])
            entry.activities.all().delete()

        for activity in activities:
            entry.activities.model.objects.create(
                entry=entry,
                work_date=activity["work_date"],
                hours=activity["hours"],
                approved_hours=Decimal("0"),
                description=activity["description"],
                content_hash=normalize_and_hash(activity["description"]),
            )

        self._create_flags(entry, flag_results)
        return entry

    @transaction.atomic
    def submit(self, entry, actor):
        if entry.student_id != actor.id:
            raise DomainError("You may only submit your own logbook entry.", code="not_owner")
        if entry.status not in (LogbookStatus.DRAFT, LogbookStatus.RETURNED):
            raise InvalidTransition("Only draft or returned entries can be submitted.")
        if not entry.activities.exists():
            raise RuleViolation("A weekly entry must contain at least one activity.")

        now = self.clock()
        entry.status = LogbookStatus.SUBMITTED
        entry.submitted_at = now
        entry.reviewed_at = None
        entry.save(update_fields=["status", "submitted_at", "reviewed_at", "updated_at"])
        late_result = LateSubmissionRule().evaluate(
            RuleContext(
                placement=None,
                entry={"week_start": entry.week_start},
                now=now,
            )
        )
        if late_result.flag_type:
            self._create_flag(entry, late_result.flag_type, late_result.reason)
        events.emit(
            events.logbook_submitted,
            sender=type(self),
            entry_id=entry.id,
            placement_id=entry.placement_id,
            actor_id=actor.id,
        )
        return entry

    @transaction.atomic
    def approve(self, entry, reviewer, adjustments=None, comment=""):
        if entry.status != LogbookStatus.SUBMITTED:
            raise InvalidTransition("Only submitted entries can be approved.")
        if not _is_assigned_supervisor(self._get_placement(entry), reviewer):
            raise DomainError("You are not assigned to this placement.", code="not_assigned")

        adjustments = {
            str(item["work_date"]): Decimal(str(item["approved_hours"]))
            for item in (adjustments or [])
        }
        adjusted = False
        for activity in entry.activities.all():
            approved = adjustments.get(str(activity.work_date), activity.hours)
            if approved < 0 or approved > activity.hours:
                raise RuleViolation("Approved hours must be between zero and claimed hours.")
            if approved != activity.hours:
                adjusted = True
            activity.approved_hours = approved
            activity.save(update_fields=["approved_hours", "updated_at"])

        if adjusted and not comment.strip():
            raise RuleViolation("A comment is required when hours are adjusted.")
        if adjusted:
            self._create_flag(
                entry,
                FlagType.HOURS_ADJUSTED,
                "The workplace supervisor adjusted claimed hours.",
            )
        if comment.strip():
            self.add_feedback(entry, reviewer, comment, FeedbackKind.WORKPLACE)

        entry.status = LogbookStatus.APPROVED
        entry.reviewed_at = self.clock()
        entry.save(update_fields=["status", "reviewed_at", "updated_at"])
        events.emit(
            events.logbook_approved,
            sender=type(self),
            entry_id=entry.id,
            placement_id=entry.placement_id,
            actor_id=reviewer.id,
        )
        return entry

    @transaction.atomic
    def return_for_edit(self, entry, reviewer, comment):
        if entry.status != LogbookStatus.SUBMITTED:
            raise InvalidTransition("Only submitted entries can be returned.")
        if not comment.strip():
            raise RuleViolation("A return comment is required.")
        if not _is_assigned_supervisor(self._get_placement(entry), reviewer):
            raise DomainError("You are not assigned to this placement.", code="not_assigned")
        self.add_feedback(entry, reviewer, comment, FeedbackKind.WORKPLACE)
        entry.status = LogbookStatus.RETURNED
        entry.reviewed_at = self.clock()
        entry.save(update_fields=["status", "reviewed_at", "updated_at"])
        events.emit(
            events.logbook_returned,
            sender=type(self),
            entry_id=entry.id,
            placement_id=entry.placement_id,
            actor_id=reviewer.id,
            comment=comment,
        )
        return entry

    @transaction.atomic
    def reopen(self, entry, coordinator, reason):
        if entry.status != LogbookStatus.APPROVED:
            raise InvalidTransition("Only approved entries can be reopened.")
        if getattr(coordinator, "role", None) != Role.COORDINATOR:
            raise DomainError("Only a coordinator can reopen an approved entry.", code="forbidden")
        if not reason.strip():
            raise RuleViolation("A reason is required to reopen an entry.")
        entry.status = LogbookStatus.RETURNED
        entry.reviewed_at = None
        entry.save(update_fields=["status", "reviewed_at", "updated_at"])
        self.add_feedback(entry, coordinator, reason, FeedbackKind.COORDINATOR)
        return entry

    @transaction.atomic
    def add_feedback(self, entry, author, comment, kind=None):
        if not comment.strip():
            raise RuleViolation("Feedback cannot be empty.")
        kind = kind or self._feedback_kind(author)
        feedback = LogbookFeedback.objects.create(
            entry=entry,
            author=author,
            kind=kind,
            comment=comment.strip(),
        )
        events.emit(
            events.feedback_added,
            sender=type(self),
            entry_id=entry.id,
            placement_id=entry.placement_id,
            actor_id=author.id,
        )
        return feedback

    @transaction.atomic
    def add_image(self, entry, student, image, caption="", work_date=None):
        if entry.student_id != student.id:
            raise DomainError("You may only add images to your own entry.", code="not_owner")
        if entry.status not in (LogbookStatus.DRAFT, LogbookStatus.RETURNED):
            raise InvalidTransition("Images can only be added to editable entries.")
        if entry.images.count() >= 5:
            raise RuleViolation("A weekly entry may contain at most five images.")

        validate_image(image, 5)
        processed = self.image_processor.process(image)
        stored = LogbookImage(
            entry=entry,
            original_name=image.name,
            size_bytes=len(processed.content),
            caption=caption,
            work_date=work_date,
        )
        stored.image.save(processed.name, ContentFile(processed.content), save=False)
        stored.save()
        return stored

    def _normalize_activities(self, activities):
        normalized = []
        seen_dates = set()
        for activity in activities:
            work_date = activity["work_date"]
            if work_date in seen_dates:
                raise RuleViolation("Each work date may appear only once.")
            seen_dates.add(work_date)
            normalized.append(
                {
                    "work_date": work_date,
                    "hours": Decimal(str(activity["hours"])),
                    "description": activity["description"],
                }
            )
        return normalized

    def _create_flags(self, entry, results):
        for result in results:
            self._create_flag(entry, result.flag_type, result.reason)

    @staticmethod
    def _create_flag(entry, flag_type, detail):
        return IntegrityFlag.objects.get_or_create(
            placement_id=entry.placement_id,
            entry=entry,
            type=flag_type,
            defaults={"detail": detail},
        )[0]

    @staticmethod
    def _get_placement(entry):
        try:
            from django.apps import apps

            model = apps.get_model("placements", "Placement")
        except LookupError:
            return entry
        try:
            return model.objects.get(pk=entry.placement_id)
        except model.DoesNotExist:
            return entry

    @staticmethod
    def _feedback_kind(author):
        return {
            Role.WORKPLACE_SUPERVISOR: FeedbackKind.WORKPLACE,
            Role.ACADEMIC_SUPERVISOR: FeedbackKind.ACADEMIC,
            Role.COORDINATOR: FeedbackKind.COORDINATOR,
        }.get(author.role, FeedbackKind.COORDINATOR)
