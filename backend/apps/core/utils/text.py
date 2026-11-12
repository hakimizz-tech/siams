"""Pure text helpers."""

import hashlib
import re

_NON_WORD = re.compile(r"[^\w\s]", re.UNICODE)
_SPACES = re.compile(r"\s+")


def normalize_text(text: str) -> str:
    """Lowercase, drop punctuation, collapse whitespace."""
    return _SPACES.sub(" ", _NON_WORD.sub("", text.lower())).strip()


def normalize_and_hash(text: str) -> str:
    """Stable fingerprint used to detect copy-pasted logbook text."""
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()
