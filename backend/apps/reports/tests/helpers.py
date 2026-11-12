"""Create assessment/report/result rows directly, so dashboard tests do not depend on services."""

from decimal import Decimal

from django.utils import timezone

from apps.assessments.models import Assessment, AssessmentForm, FinalReport, PlacementResult


def make_form(period, role, weight=50, active=True):
    return AssessmentForm.objects.create(
        period=period,
        name=f"{role} form",
        assessor_role=role,
        version=1,
        weight_percent=weight,
        is_active=active,
    )


def submit_assessment(placement, form, assessor, percent="80.00"):
    return Assessment.objects.create(
        placement=placement,
        form=form,
        assessor=assessor,
        status="SUBMITTED",
        percent=Decimal(percent),
        submitted_at=timezone.now(),
    )


def make_report(placement, status="SUBMITTED"):
    return FinalReport.objects.create(
        placement=placement,
        document="final_reports/test.pdf",
        original_name="test.pdf",
        size_bytes=10,
        status=status,
    )


def make_result(placement, total="80.00", grade="A"):
    return PlacementResult.objects.create(
        placement=placement,
        total_percent=Decimal(total),
        grade=grade,
        breakdown=[],
        finalized_at=timezone.now(),
    )
