"""Image validation and safe re-encoding for logbook uploads."""

from dataclasses import dataclass
from io import BytesIO
from uuid import uuid4

from PIL import Image, UnidentifiedImageError


@dataclass(frozen=True)
class ProcessedImage:
    name: str
    content: bytes


class ImageProcessor:
    """Remove metadata and constrain images before they reach storage."""

    max_dimension = 1600

    def process(self, image) -> ProcessedImage:
        try:
            source = Image.open(image)
            source.verify()
            image.seek(0)
            source = Image.open(image).convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("The uploaded file is not a valid image.") from exc

        source.thumbnail((self.max_dimension, self.max_dimension), Image.Resampling.LANCZOS)
        output = BytesIO()
        source.save(output, format="JPEG", optimize=True, quality=90)
        return ProcessedImage(f"{uuid4().hex}.jpg", output.getvalue())
