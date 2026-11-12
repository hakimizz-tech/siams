"""Demo rubric for development: imports the two example forms into the demo period."""

import json
from pathlib import Path

from apps.placements.models import InternshipPeriod

from .importers import AssessmentFormImporter
from .models import AssessmentForm

EXAMPLES = Path(__file__).resolve().parent / "examples"


def seed():
    period = InternshipPeriod.objects.filter(name="Demo Attachment").first()
    if period is None or AssessmentForm.objects.filter(period=period).exists():
        return
    for name in ("example_workplace_form.json", "example_academic_form.json"):
        AssessmentFormImporter.import_json(period, json.loads((EXAMPLES / name).read_text()))
