"""File-storage helpers shared by every app that stores uploads.

Key layout (identical in development and in S3 / GCS / Azure):

    {YYYY}/{MM}/{DD}/{category}/{uuid4}{ext}

e.g. 2026/11/08/logbook/3f9c1e2a7b8d4c6e9a10b2c3d4e5f607.jpg
Random names mean no student names or original file names leak into storage.
"""

import uuid
from pathlib import Path

from django.core.files.storage import FileSystemStorage
from django.http import FileResponse, HttpResponseRedirect
from django.utils import timezone
from django.utils.deconstruct import deconstructible


@deconstructible
class DatedUploadPath:
    """upload_to callable. Deconstructible so migrations can serialize it."""

    def __init__(self, category: str):
        self.category = category

    def __call__(self, instance, filename: str) -> str:
        extension = Path(filename).suffix.lower()
        today = timezone.now()
        return f"{today:%Y/%m/%d}/{self.category}/{uuid.uuid4().hex}{extension}"


def dated_upload_path(category: str) -> DatedUploadPath:
    """Use as: image = models.ImageField(upload_to=dated_upload_path("logbook"))"""
    return DatedUploadPath(category)


def serve_stored_file(file_field, *, download_name: str | None = None, as_attachment: bool = True):
    """Return the response for a permission-checked download endpoint.

    Call this only AFTER the view has verified the user may see the file.
    Filesystem storage streams the file; cloud storage redirects to a short-lived
    signed URL (SIGNED_URL_SECONDS).
    """
    if isinstance(file_field.storage, FileSystemStorage):
        response = FileResponse(
            file_field.open("rb"), as_attachment=as_attachment, filename=download_name
        )
        response["X-Content-Type-Options"] = "nosniff"
        return response
    return HttpResponseRedirect(file_field.url)
