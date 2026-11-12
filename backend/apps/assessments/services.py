from decimal import Decimal, InvalidOperation
from typing import Any, cast

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max, Sum
from django.utils import timezone

from apps.core import events
from apps.core.enums import Role
from apps.core.exceptions import InvalidTransition, NotAllowed, RuleViolation
from apps.core.validators import validate_document
from apps.placements.models import Placement

from . import selectors
from .models import (
    Assessment,
    AssessmentForm,
    AssessmentScore,
    Criterion,
    FinalReport,
    PlacementResult,
)
from .scoring import ScoredCriterion, get_strategy, quantize

ASSESSOR_ROLES = (Role.WORKPLACE_SUPERVISOR.value, Role.ACADEMIC_SUPERVISOR.value)


def _decimal(value, label: str) -> Decimal:
    try:
        return Decimal(str(value))
    except InvalidOperation:
        raise RuleViolation(f"{label} must be a number.", code="bad_number") from None


#  rubric forms
class AssessmentFormService:
    @staticmethod
    def clean_criteria(criteria) -> list[dict]:
        if not isinstance(criteria, (list, tuple)) or not criteria:
            raise RuleViolation("A form needs at least one criterion.", code="no_criteria")
        cleaned, codes = [], set()
        for position, raw in enumerate(criteria):
            if not isinstance(raw, dict):
                raise RuleViolation("Each criterion must be an object.", code="bad_criterion")
            code, name = str(raw.get("code", "")).strip(), str(raw.get("name", "")).strip()
            if not code or not name:
                raise RuleViolation("Each criterion needs a code and a name.", code="bad_criterion")
            if code in codes:
                raise RuleViolation(f"Duplicate criterion code '{code}'.", code="duplicate_code")
            codes.add(code)
            kind = str(raw.get("type", Criterion.Type.SCORE)).upper()
            if kind not in Criterion.Type.values:
                raise RuleViolation(f"Unknown criterion type '{kind}'.", code="bad_criterion")
            max_score = None
            if kind == Criterion.Type.SCORE:
                try:
                    max_score = int(raw.get("max_score") or 0)
                except (TypeError, ValueError):
                    max_score = 0
                if max_score <= 0:
                    raise RuleViolation(
                        f"'{code}' needs a max_score above 0.", code="bad_criterion"
                    )
            weight = _decimal(raw.get("weight", 1), "Criterion weight")
            if weight < 0:
                raise RuleViolation("Criterion weight cannot be negative.", code="bad_criterion")
            cleaned.append(
                {
                    "code": code,
                    "section": str(raw.get("section", "")).strip(),
                    "name": name,
                    "type": kind,
                    "max_score": max_score,
                    "weight": weight,
                    "required": bool(raw.get("required", True)),
                    "position": position,
                }
            )
        return cleaned

    @staticmethod
    def _check_basics(assessor_role, weight_percent) -> Decimal:
        if assessor_role not in ASSESSOR_ROLES:
            raise RuleViolation("assessor_role must be a supervisor role.", code="bad_role")
        weight = _decimal(weight_percent, "weight_percent")
        if not Decimal(0) <= weight <= Decimal(100):
            raise RuleViolation("weight_percent must be between 0 and 100.", code="bad_weight")
        return weight

    @staticmethod
    def _deactivate_others(period_id, assessor_role, keep_id=None):
        others = AssessmentForm.objects.filter(
            period_id=period_id, assessor_role=assessor_role, is_active=True
        )
        if keep_id:
            others = others.exclude(pk=keep_id)
        others.update(is_active=False)

    @staticmethod
    def _ensure_active_weights(period_id):
        total = AssessmentForm.objects.filter(period_id=period_id, is_active=True).aggregate(
            total=Sum("weight_percent")
        )["total"] or Decimal("0")
        if total != Decimal("100"):
            raise RuleViolation(
                "Active form weights must add up to 100 percent.",
                code="invalid_form_weights",
            )

    @staticmethod
    @transaction.atomic
    def create(*, period, name, assessor_role, weight_percent, criteria, is_active=True):
        weight = AssessmentFormService._check_basics(assessor_role, weight_percent)
        cleaned = AssessmentFormService.clean_criteria(criteria)
        latest = AssessmentForm.objects.filter(
            period=period, assessor_role=assessor_role
        ).aggregate(latest=Max("version"))["latest"]
        if is_active:
            AssessmentFormService._deactivate_others(period.id, assessor_role)
        form = AssessmentForm.objects.create(
            period=period,
            name=str(name).strip(),
            assessor_role=assessor_role,
            version=(latest or 0) + 1,
            weight_percent=weight,
            is_active=is_active,
        )
        Criterion.objects.bulk_create([Criterion(form=form, **item) for item in cleaned])
        if (
            is_active
            and AssessmentForm.objects.filter(period_id=period.id, is_active=True)
            .exclude(pk=form.pk)
            .exists()
        ):
            AssessmentFormService._ensure_active_weights(period.id)
        return selectors.get_form(form.id)

    @staticmethod
    @transaction.atomic
    def replace(*, form, name, weight_percent, criteria, is_active=None):
        if form.is_locked:
            raise InvalidTransition(
                "This form has assessments against it. Create a new version to change it.",
                code="form_locked",
            )
        weight = AssessmentFormService._check_basics(form.assessor_role, weight_percent)
        cleaned = AssessmentFormService.clean_criteria(criteria)
        form.name, form.weight_percent = str(name).strip(), weight
        if is_active is not None:
            if is_active:
                AssessmentFormService._deactivate_others(
                    form.period_id, form.assessor_role, form.id
                )
            form.is_active = is_active
        form.save()
        form.criteria.all().delete()
        Criterion.objects.bulk_create([Criterion(form=form, **item) for item in cleaned])
        return selectors.get_form(form.id)

    @staticmethod
    @transaction.atomic
    def patch(*, form, name=None, weight_percent=None, is_active=None):
        if form.is_locked and any(value is not None for value in (name, weight_percent, is_active)):
            raise InvalidTransition(
                "This form has assessments against it. Create a new version to change it.",
                code="form_locked",
            )
        if name is not None:
            form.name = str(name).strip()
        if weight_percent is not None:
            form.weight_percent = AssessmentFormService._check_basics(
                form.assessor_role, weight_percent
            )
        if is_active is not None:
            if is_active:
                AssessmentFormService._deactivate_others(
                    form.period_id, form.assessor_role, form.id
                )
            form.is_active = is_active
        form.save()
        if is_active:
            AssessmentFormService._ensure_active_weights(form.period_id)
        return selectors.get_form(form.id)

    @staticmethod
    @transaction.atomic
    def new_version(*, form):
        """Clone the form as the next version, inactive until the coordinator activates it."""
        latest = AssessmentForm.objects.filter(
            period=form.period, assessor_role=form.assessor_role
        ).aggregate(latest=Max("version"))["latest"]
        clone = AssessmentForm.objects.create(
            period=form.period,
            name=form.name,
            assessor_role=form.assessor_role,
            version=latest + 1,
            weight_percent=form.weight_percent,
            is_active=False,
        )
        Criterion.objects.bulk_create(
            [
                Criterion(
                    form=clone,
                    code=c.code,
                    section=c.section,
                    name=c.name,
                    type=c.type,
                    max_score=c.max_score,
                    weight=c.weight,
                    required=c.required,
                    position=c.position,
                )
                for c in form.criteria.all()
            ]
        )
        return selectors.get_form(clone.id)


#  assessments
def _check_assessor(actor, placement, form) -> None:
    if getattr(actor, "role", None) != form.assessor_role:
        raise NotAllowed()
    expected = (
        placement.workplace_supervisor_id
        if actor.role == Role.WORKPLACE_SUPERVISOR
        else placement.academic_supervisor_id
    )
    if expected != actor.id:
        raise NotAllowed("You are not the assigned supervisor for this placement.")
    if placement.status != Placement.Status.APPROVED:
        raise InvalidTransition("Assessments can only be recorded on approved placements.")
    if form.period_id != placement.period_id or not form.is_active:
        raise RuleViolation(
            "This form is not active for the placement's period.", code="form_not_active"
        )
    opens = placement.period.assessment_opens_on
    if opens and timezone.localdate() < opens:
        raise RuleViolation(f"Assessments open on {opens}.", code="assessment_not_open")


def _apply_scores(assessment, form, items) -> None:
    criteria = {criterion.id: criterion for criterion in form.criteria.all()}
    seen = set()
    for item in items or []:
        criterion = criteria.get(item.get("criterion"))
        if criterion is None:
            raise RuleViolation(
                "A score refers to a criterion outside this form.", code="unknown_criterion"
            )
        if criterion.id in seen:
            raise RuleViolation("A criterion is scored twice.", code="duplicate_score")
        seen.add(criterion.id)
        score = item.get("score")
        if criterion.type == Criterion.Type.COMMENT:
            if score is not None:
                raise RuleViolation(
                    f"'{criterion.code}' takes a comment, not a score.", code="bad_score"
                )
        elif score is not None and not 0 <= score <= (criterion.max_score or 0):
            raise RuleViolation(
                f"Score for '{criterion.code}' must be between 0 and {criterion.max_score or 0}.",
                code="score_out_of_range",
            )
        AssessmentScore.objects.update_or_create(
            assessment=assessment,
            criterion=criterion,
            defaults={"score": score, "remark": item.get("remark", "")},
        )


class AssessmentService:
    @staticmethod
    @transaction.atomic
    def create_draft(*, actor, placement, form, scores=(), comment="") -> Assessment:
        _check_assessor(actor, placement, form)
        if selectors.get_assessment_for(placement, form) is not None:
            raise InvalidTransition(
                "An assessment already exists for this form.", code="assessment_exists"
            )
        assessment = Assessment.objects.create(
            placement=placement, form=form, assessor=actor, comment=comment
        )
        _apply_scores(assessment, form, scores)
        AssessmentForm.objects.filter(pk=form.pk).update(is_locked=True)
        return assessment

    @staticmethod
    @transaction.atomic
    def update_draft(*, actor, assessment, scores=(), comment=None) -> Assessment:
        if assessment.assessor_id != actor.id:
            raise NotAllowed()
        if assessment.status != Assessment.Status.DRAFT:
            raise InvalidTransition("A submitted assessment is locked.", code="assessment_locked")
        _apply_scores(assessment, assessment.form, scores)
        if comment is not None:
            assessment.comment = comment
            assessment.save(update_fields=["comment", "updated_at"])
        return assessment

    @staticmethod
    @transaction.atomic
    def submit(*, actor, assessment) -> Assessment:
        if assessment.assessor_id != actor.id:
            raise NotAllowed()
        if assessment.status != Assessment.Status.DRAFT:
            raise InvalidTransition(
                "This assessment was already submitted.", code="assessment_locked"
            )
        scores = {score.criterion_id: score for score in assessment.scores.all()}
        missing, scored = [], []
        for criterion in assessment.form.criteria.all():
            score = scores.get(criterion.id)
            if criterion.type == Criterion.Type.SCORE:
                if score is not None and score.score is not None:
                    scored.append(
                        ScoredCriterion(
                            Decimal(score.score), Decimal(criterion.max_score), criterion.weight
                        )
                    )
                elif criterion.required:
                    missing.append(criterion.code)
            elif criterion.required and not (score and score.remark.strip()):
                missing.append(criterion.code)
        if missing:
            raise RuleViolation(
                "Complete every required criterion before submitting.",
                code="incomplete_assessment",
                details={"missing": missing},
            )
        assessment.percent = get_strategy().form_percent(scored)
        assessment.status = Assessment.Status.SUBMITTED
        assessment.submitted_at = timezone.now()
        cast(Any, assessment)._history_user = actor
        assessment.save()
        return assessment


#  final report -
class FinalReportService:
    @staticmethod
    @transaction.atomic
    def upload(*, actor, placement, file, title="") -> FinalReport:
        if actor.role != Role.STUDENT or placement.student_id != actor.id:
            raise NotAllowed()
        if placement.status != Placement.Status.APPROVED:
            raise InvalidTransition("Reports can only be uploaded for approved placements.")
        report = selectors.get_final_report_for(placement)
        if report is not None and report.status == FinalReport.Status.ACCEPTED:
            raise InvalidTransition("The accepted report is locked.", code="report_locked")
        try:
            validate_document(file, settings.MAX_REPORT_MB)
        except DjangoValidationError as exc:
            raise RuleViolation(
                exc.messages[0], code=getattr(exc, "code", None) or "invalid_file"
            ) from None
        if report is None:
            report = FinalReport(placement=placement)
        elif report.document:
            report.document.delete(save=False)
        report.document.save(file.name, file, save=False)
        report.original_name = file.name[:255]
        report.size_bytes = file.size
        report.title = (title or report.title or file.name)[:200]
        report.status = FinalReport.Status.SUBMITTED
        cast(Any, report)._history_user = actor
        report.save()
        events.emit(
            events.final_report_submitted,
            sender=FinalReportService,
            placement_id=placement.id,
            report_id=report.id,
            actor_id=actor.id,
        )
        return report

    @staticmethod
    def _review(actor, report, new_status, feedback):
        if (
            actor.role != Role.ACADEMIC_SUPERVISOR
            or report.placement.academic_supervisor_id != actor.id
        ):
            raise NotAllowed()
        if report.status != FinalReport.Status.SUBMITTED:
            raise InvalidTransition(
                "Only a submitted report can be reviewed.", code="report_not_submitted"
            )
        report.status = new_status
        report.feedback = feedback
        report.reviewed_by = actor
        report.reviewed_at = timezone.now()
        cast(Any, report)._history_user = actor
        report.save()
        return report

    @staticmethod
    @transaction.atomic
    def accept(*, actor, report) -> FinalReport:
        FinalReportService._review(actor, report, FinalReport.Status.ACCEPTED, report.feedback)
        events.emit(
            events.final_report_accepted,
            sender=FinalReportService,
            placement_id=report.placement_id,
            report_id=report.id,
            actor_id=actor.id,
        )
        return report

    @staticmethod
    @transaction.atomic
    def return_report(*, actor, report, feedback) -> FinalReport:
        feedback = (feedback or "").strip()
        if not feedback:
            raise RuleViolation(
                "Feedback is required when returning a report.", code="feedback_required"
            )
        FinalReportService._review(actor, report, FinalReport.Status.RETURNED, feedback)
        events.emit(
            events.final_report_returned,
            sender=FinalReportService,
            placement_id=report.placement_id,
            report_id=report.id,
            actor_id=actor.id,
            feedback=feedback,
        )
        return report


#  results -
class ResultService:
    @staticmethod
    def snapshot(result) -> dict:
        return {
            "placement": str(result.placement_id),
            "finalized": True,
            "total_percent": result.total_percent,
            "grade": result.grade,
            "breakdown": result.breakdown,
            "finalized_at": result.finalized_at,
            "missing": [],
            "ready": False,
        }

    @staticmethod
    def preview(placement) -> dict:
        result = selectors.get_result(placement)
        if result is not None:
            return ResultService.snapshot(result)
        strategy = get_strategy()
        forms = list(selectors.active_forms_for_period(cast(Any, placement).period_id))
        assessments = {
            cast(Any, assessment).form_id: assessment
            for assessment in selectors.assessments_for_placement(placement)
        }
        missing, parts, breakdown = [], [], []
        for form in forms:
            assessment = assessments.get(form.id)
            submitted = assessment is not None and assessment.status == Assessment.Status.SUBMITTED
            percent = assessment.percent if assessment is not None else None
            if submitted and percent is not None:
                parts.append((percent, form.weight_percent))
            else:
                missing.append(f"{form.name} (v{form.version}) has not been submitted.")
            breakdown.append(
                {
                    "form_id": str(form.id),
                    "name": form.name,
                    "version": form.version,
                    "assessor_role": form.assessor_role,
                    "weight_percent": str(form.weight_percent),
                    "status": assessment.status if assessment else "MISSING",
                    "percent": str(percent) if submitted and percent is not None else None,
                }
            )
        if not forms:
            missing.append("No active assessment forms exist for this period.")
        elif sum((f.weight_percent for f in forms), Decimal(0)) != Decimal(100):
            missing.append("Active form weights must add up to 100.")
        if settings.REQUIRE_FINAL_REPORT_FOR_RESULT:
            report = selectors.get_final_report_for(placement)
            if report is None or report.status != FinalReport.Status.ACCEPTED:
                missing.append("The final report must be accepted.")
        total = grade = None
        if not missing:
            total = strategy.combine(parts)
            bands = [(b.min_percent, b.label) for b in placement.period.grade_bands.all()]
            grade = strategy.grade(total, bands)
        return {
            "placement": str(placement.id),
            "finalized": False,
            "total_percent": total,
            "grade": grade,
            "breakdown": breakdown,
            "finalized_at": None,
            "missing": missing,
            "ready": not missing,
        }

    @staticmethod
    @transaction.atomic
    def finalize(*, actor, placement) -> PlacementResult:
        if actor.role != Role.COORDINATOR:
            raise NotAllowed()
        if selectors.get_result(placement) is not None:
            raise InvalidTransition("The result was already finalized.", code="already_finalized")
        if placement.status not in (Placement.Status.APPROVED, Placement.Status.COMPLETED):
            raise InvalidTransition("Only approved or completed placements have results.")
        preview = ResultService.preview(placement)
        if not preview["ready"]:
            raise RuleViolation(
                "The result is not ready to finalize.",
                code="not_ready",
                details={"missing": preview["missing"]},
            )
        result = PlacementResult(
            placement=placement,
            total_percent=quantize(preview["total_percent"]),
            grade=preview["grade"] or "",
            breakdown=preview["breakdown"],
            finalized_by=actor,
            finalized_at=timezone.now(),
        )
        cast(Any, result)._history_user = actor
        result.save()
        events.emit(
            events.result_finalized,
            sender=ResultService,
            placement_id=placement.id,
            actor_id=actor.id,
        )
        return result
