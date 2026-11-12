"""Load the institution's official rubric from JSON into AssessmentForm + Criterion rows."""

from apps.core.exceptions import RuleViolation

from .services import AssessmentFormService

REQUIRED_KEYS = ("name", "assessor_role", "weight_percent", "criteria")


class AssessmentFormImporter:
    @staticmethod
    def import_json(period, data, *, activate: bool = True):
        """Create the next version of the form for `period` (the previous active one is
        deactivated, and keeps serving the results already recorded against it)."""
        if not isinstance(data, dict):
            raise RuleViolation("The form must be a JSON object.", code="bad_form")
        missing = [key for key in REQUIRED_KEYS if key not in data]
        if missing:
            raise RuleViolation(
                f"The form is missing: {', '.join(missing)}.",
                code="bad_form",
                details={"missing": missing},
            )
        return AssessmentFormService.create(
            period=period,
            name=data["name"],
            assessor_role=data["assessor_role"],
            weight_percent=data["weight_percent"],
            criteria=data["criteria"],
            is_active=activate,
        )
