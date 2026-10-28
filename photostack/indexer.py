"""Indexing: turn a file in uploads/ into a fully described row in the database.

For each photo:
  1. read size, EXIF (camera, date, exposure) and GPS          -> read_image()
  2. write a thumbnail, plus a preview if browsers can't show it -> make_derivatives()
  3. save everything and mark the row 'completed'              -> index_image()
  4. look up a street address for the GPS position (geocoding)
  5. optionally ask the AI tagger for tags
Steps 4-5 run after the save, so their failures never lose the photo.
"""

import datetime
import logging
from pathlib import Path
from typing import Any

import exifread
from PIL import Image as PILImage
from PIL import ImageOps
from pillow_heif import register_heif_opener
from sqlalchemy.orm import Session

from . import crud, integrity, storage, video
from .database import SessionLocal
from .services import geocoding, tagger

register_heif_opener()  # lets Pillow open HEIC/HEIF (iPhone photos)
logger = logging.getLogger(__name__)

THUMBNAIL_SIZE = (400, 400)
PREVIEW_SIZE = (1920, 1920)


# --- Reading a photo (pure: file in, fields out) --------------------------------


def fingerprint(img: PILImage.Image) -> str:
    """64-bit difference hash (dHash): shrink to 9x8 grayscale, compare neighbours.

    Resized or re-encoded copies of a photo get the same hash; that's what
    duplicate detection groups on.
    """
    px = img.convert("L").resize((9, 8), PILImage.Resampling.LANCZOS).tobytes()
    bits = 0
    for row in range(8):
        for col in range(8):
            bits = (bits << 1) | (px[row * 9 + col] > px[row * 9 + col + 1])
    return f"{bits:016x}"


def _ratio(tag) -> float | None:
    """EXIF stores numbers like f/1.8 as fractions (18/10)."""
    try:
        value = tag.values[0]
        return float(value.num) / float(value.den)
    except (AttributeError, IndexError, TypeError, ZeroDivisionError):
        return None


def _ratio_or_none(tags: dict, key: str) -> float | None:
    return _ratio(tags[key]) if key in tags else None


def _shutter(seconds: float | None) -> str | None:
    """0.00055 -> '1/1812 s', 2.0 -> '2 s' (how photographers write shutter speed)."""
    if not seconds:
        return None
    return f"1/{round(1 / seconds)} s" if seconds < 1 else f"{seconds:g} s"


def _text(tags: dict, key: str) -> str | None:
    value = str(tags.get(key, "")).strip()
    return value or None


def _date(tags: dict) -> datetime.datetime | None:
    for key in ("EXIF DateTimeOriginal", "Image DateTime"):
        try:
            return datetime.datetime.strptime(str(tags[key]), "%Y:%m:%d %H:%M:%S")
        except (KeyError, ValueError):
            continue
    return None


def _gps(tags: dict) -> tuple[float, float] | None:
    """Decimal (lat, lon) from EXIF degrees/minutes/seconds, or None."""
    try:
        parts = []
        for axis, negative in (("Latitude", "S"), ("Longitude", "W")):
            d, m, s = (float(v.num) / float(v.den) for v in tags[f"GPS GPS{axis}"].values)
            value = d + m / 60 + s / 3600
            if str(tags[f"GPS GPS{axis}Ref"]).upper().startswith(negative):
                value = -value
            parts.append(value)
        return parts[0], parts[1]
    except (KeyError, ValueError, ZeroDivisionError):
        return None


def read_exif(path: Path) -> dict[str, Any]:
    with path.open("rb") as f:
        tags = exifread.process_file(f, details=False)
    gps = _gps(tags)
    iso = _text(tags, "EXIF ISOSpeedRatings")
    focal = _ratio_or_none(tags, "EXIF FocalLength")
    return {
        "date_taken": _date(tags),
        "camera_model": _text(tags, "Image Model"),
        "lens_model": _text(tags, "EXIF LensModel"),
        "f_number": _ratio_or_none(tags, "EXIF FNumber"),
        "exposure_time": _shutter(_ratio_or_none(tags, "EXIF ExposureTime")),
        "iso": int(iso) if iso and iso.isdigit() else None,
        "focal_length": f"{focal:g} mm" if focal else None,
        "edited_with": integrity.edited_with(_text(tags, "Image Software")),
        "latitude": gps[0] if gps else None,
        "longitude": gps[1] if gps else None,
    }


def read_image(path: Path) -> dict[str, Any]:
    """Everything we store about a photo file, as column -> value."""
    data = path.read_bytes()
    with PILImage.open(path) as img:
        img = ImageOps.exif_transpose(img)  # phone photos store rotation as a flag
        fields = {
            "width": img.width,
            "height": img.height,
            "image_size": len(data),
            "fingerprint": fingerprint(img),
            "sha256": integrity.sha256(data),
            "trailing_bytes": integrity.trailing_bytes(data),
        }
    try:
        fields |= read_exif(path)
    except Exception as e:  # unreadable EXIF shouldn't stop indexing
        logger.warning("Could not read EXIF from %s: %s", path.name, e)
    return fields


def make_derivatives(path: Path) -> None:
    """Write the WebP thumbnail, and a WebP preview for formats browsers can't show."""
    with PILImage.open(path) as img:
        img = ImageOps.exif_transpose(img)
        thumb = img.copy()
        thumb.thumbnail(THUMBNAIL_SIZE)
        thumb.save(storage.thumbnail_path(path.name), "webp", quality=80)
        if storage.needs_preview(path.name):
            preview = img.copy()
            preview.thumbnail(PREVIEW_SIZE)
            preview.save(storage.preview_path(path.name), "webp", quality=85)


def read_video(path: Path) -> dict[str, Any]:
    """Everything we store about a video, and its thumbnail (when ffmpeg is installed)."""
    fields: dict[str, Any] = {
        "media_type": "video",
        "image_size": path.stat().st_size,
        "sha256": integrity.sha256_file(path),
    }
    if not video.available():
        return fields
    fields |= video.probe(path)
    # A frame a little way in: the very first frame is often black.
    at = min(1.0, (fields["duration"] or 0) / 2)
    with video.frame(path, at) as img:
        fields["fingerprint"] = fingerprint(img)
        thumb = img.convert("RGB")
        thumb.thumbnail(THUMBNAIL_SIZE)
        thumb.save(storage.thumbnail_path(path.name), "webp", quality=80)
    return fields


# --- Indexing into the database --------------------------------------------------


def index_image(db: Session, image_id: int, filename: str) -> None:
    path = storage.original_path(filename)
    try:
        if storage.is_video(filename):
            fields = read_video(path)
        else:
            fields = read_image(path)
            make_derivatives(path)
        crud.save_index_result(db, image_id, fields)
    except Exception:
        logger.exception("Indexing failed for %s", filename)
        crud.update_image_status(db, image_id, "failed")
        return

    if tagger.is_enabled() and storage.thumbnail_path(filename).exists():
        try:
            crud.set_image_tags(db, image_id, tagger.suggest_tags(storage.thumbnail_path(filename)))
        except Exception:
            logger.exception("Tagging failed for %s", filename)


def index_in_background(image_id: int, filename: str) -> None:
    """Entry point for upload's background task (needs its own DB session)."""
    with SessionLocal() as db:
        index_image(db, image_id, filename)
        geocoding.geocode_missing(db)


def queue_file(db: Session, filename: str) -> int | None:
    """Create or reset the row for a file. Returns its id, or None if already indexed."""
    existing = crud.get_image_by_filename(db, filename)
    if existing and existing.status == "completed":
        return None
    if existing:
        crud.update_image_status(db, existing.id, "processing")
        return existing.id
    return crud.create_placeholder_image(db, filename).id


def scan_library() -> None:
    """Index every new or unfinished file in uploads/ (runs at startup)."""
    with SessionLocal() as db:
        for path in sorted(storage.ROOT.iterdir()):
            if path.is_file() and storage.is_supported(path.name):
                image_id = queue_file(db, path.name)
                if image_id is not None:
                    logger.info("Indexing %s", path.name)
                    index_image(db, image_id, path.name)
        geocoding.geocode_missing(db)
    logger.info("Library scan finished")
