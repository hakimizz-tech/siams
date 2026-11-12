"""Transactional write use cases for scheduling and tracking visits."""

from django.db import transaction
from django.utils import timezone

from apps.core import events
from apps.core.enums import Role
from apps.core.exceptions import DomainError, InvalidTransition, RuleViolation

from .models import Visit, VisitStatus


class VisitService:
    """Owns visit scheduling, rescheduling, cancellation, and completion."""

    @transaction.atomic
    def schedule(self, placement, academic_supervisor, data):
        self._require_academic_supervisor(academic_supervisor)
        if getattr(placement, "status", "APPROVED") != "APPROVED":
            raise RuleViolation("Visits require an approved placement.")
        scheduled_at = data["scheduled_at"]
        if scheduled_at <= timezone.now():
            raise RuleViolation("A visit must be scheduled in the future.")

        visit = Visit.objects.create(
            placement_id=placement.id,
            student_id=placement.student_id,
            academic_supervisor=academic_supervisor,
            workplace_supervisor_id=getattr(placement, "workplace_supervisor_id", None),
            mode=data["mode"],
            scheduled_at=scheduled_at,
            meeting_link=data.get("meeting_link", ""),
            notes=data.get("notes", ""),
        )
        events.emit(
            events.visit_scheduled,
            sender=type(self),
            visit_id=visit.id,
            placement_id=visit.placement_id,
            actor_id=academic_supervisor.id,
        )
        return visit

    @transaction.atomic
    def update(self, visit, academic_supervisor, data):
        self._require_academic_supervisor(academic_supervisor)
        self._require_owner(visit, academic_supervisor)
        if visit.status != VisitStatus.SCHEDULED:
            raise InvalidTransition("Only scheduled visits can be edited.")
        scheduled_at = data.get("scheduled_at", visit.scheduled_at)
        if scheduled_at <= timezone.now():
            raise RuleViolation("A visit must be scheduled in the future.")

        for field in ("scheduled_at", "mode", "meeting_link", "notes"):
            if field in data:
                setattr(visit, field, data[field])
        visit.save(
            update_fields=[
                "scheduled_at",
                "mode",
                "meeting_link",
                "notes",
                "updated_at",
            ]
        )
        return visit

    @transaction.atomic
    def cancel(self, visit, academic_supervisor):
        self._require_academic_supervisor(academic_supervisor)
        self._require_owner(visit, academic_supervisor)
        if visit.status != VisitStatus.SCHEDULED:
            raise InvalidTransition("Only scheduled visits can be cancelled.")
        visit.status = VisitStatus.CANCELLED
        visit.save(update_fields=["status", "updated_at"])
        return visit

    @transaction.atomic
    def complete(self, visit, academic_supervisor, findings):
        self._require_academic_supervisor(academic_supervisor)
        self._require_owner(visit, academic_supervisor)
        if visit.status != VisitStatus.SCHEDULED:
            raise InvalidTransition("Only scheduled visits can be completed.")
        if not findings.strip():
            raise RuleViolation("Visit findings are required.")
        visit.status = VisitStatus.COMPLETED
        visit.findings = findings.strip()
        visit.completed_at = timezone.now()
        visit.save(update_fields=["status", "findings", "completed_at", "updated_at"])
        return visit

    @staticmethod
    def _require_academic_supervisor(user):
        if getattr(user, "role", None) != Role.ACADEMIC_SUPERVISOR:
            raise DomainError(
                "Only an academic supervisor can manage visits.",
                code="forbidden",
            )

    @staticmethod
    def _require_owner(visit, user):
        if visit.academic_supervisor_id != user.id:
            raise DomainError(
                "You are not the academic supervisor assigned to this visit.",
                code="not_assigned",
            )
