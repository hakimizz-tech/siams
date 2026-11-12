"""Upload validators: size, extension and real content type (magic bytes).

Extension checks alone are not enough: a renamed executable must not pass as a .jpg.
"""

from pathlib import Path

import filetype
from django.core.exceptions import ValidationError

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_DOCUMENT_MIMES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def validate_max_size(file, max_mb: int) -> None:
    if file.size > max_mb * 1024 * 1024:
        raise ValidationError(f"File is larger than {max_mb} MB.", code="file_too_large")


def validate_extension(file, allowed: set[str]) -> None:
    extension = Path(file.name).suffix.lower()
    if extension not in allowed:
        raise ValidationError(
            f"File type '{extension or 'unknown'}' is not allowed.", code="bad_extension"
        )


def sniff_mime(file) -> str | None:
    """Detect the content type from the first bytes, ignoring name and client header."""
    position = file.tell() if hasattr(file, "tell") else 0
    file.seek(0)
    head = file.read(8192)
    file.seek(position)
    kind = filetype.guess(head)
    return kind.mime if kind else None


def validate_mime(file, allowed: set[str]) -> None:
    mime = sniff_mime(file)
    if mime not in allowed:
        raise ValidationError("File content does not match an allowed type.", code="bad_content")


def validate_image(file, max_mb: int) -> None:
    validate_max_size(file, max_mb)
    validate_extension(file, ALLOWED_IMAGE_EXTENSIONS)
    validate_mime(file, ALLOWED_IMAGE_MIMES)


def validate_document(file, max_mb: int) -> None:
    validate_max_size(file, max_mb)
    validate_extension(file, ALLOWED_DOCUMENT_EXTENSIONS)
    validate_mime(file, ALLOWED_DOCUMENT_MIMES)
