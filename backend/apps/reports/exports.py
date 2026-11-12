"""CSV building and private file delivery for report exports."""

import csv
import io

from django.core.files.storage import FileSystemStorage, default_storage
from django.http import FileResponse, HttpResponseRedirect

COLUMNS = [
    ("Placement ID", "placement_id"),
    ("Student", "student"),
    ("Registration number", "registration_number"),
    ("Organization", "organization"),
    ("Status", "status"),
    ("Academic supervisor", "academic_supervisor"),
    ("Workplace supervisor", "workplace_supervisor"),
    ("Approved hours", "approved_hours"),
    ("Required hours", "required_hours"),
    ("Weeks approved", "weeks.approved"),
    ("Weeks expected", "weeks.expected"),
    ("Weeks missing", "weeks.missing"),
    ("Visits done", "visits_done"),
    ("Visits required", "visits_required"),
    ("Workplace %", "workplace_percent"),
    ("Academic %", "academic_percent"),
    ("Final report", "final_report"),
    ("Total %", "total_percent"),
    ("Grade", "grade"),
]

_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _value(row: dict, path: str):
    current = row
    for part in path.split("."):
        current = current.get(part) if isinstance(current, dict) else None
    return "" if current is None else current


def _safe_cell(value):
    """Stop spreadsheet formula injection: text that starts like a formula is quoted."""
    if isinstance(value, str) and value.startswith(_FORMULA_PREFIXES):
        return "'" + value
    return value


def rows_to_csv(rows) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([header for header, _ in COLUMNS])
    for row in rows:
        writer.writerow([_safe_cell(_value(row, path)) for _, path in COLUMNS])
    return buffer.getvalue().encode("utf-8-sig")  # BOM so Excel reads UTF-8 names correctly


def serve_storage_path(path: str, filename: str):
    """Filesystem storage streams the file; cloud storage redirects to a short-lived signed URL."""
    if isinstance(default_storage, FileSystemStorage):
        response = FileResponse(
            default_storage.open(path, "rb"), as_attachment=True, filename=filename
        )
        response["X-Content-Type-Options"] = "nosniff"
        return response
    return HttpResponseRedirect(default_storage.url(path))
