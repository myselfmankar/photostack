import contextlib
import datetime
import logging
import os

import exifread
from PIL import Image as PILImage
from pillow_heif import register_heif_opener
from sqlalchemy.orm import Session

from .. import crud, schemas, storage
from ..database import SessionLocal
from . import geocoding, tagger

# Register HEIF opener with Pillow
register_heif_opener()

logger = logging.getLogger(__name__)


def _convert_to_degrees(value):
    """Convert EXIF GPS (degrees, minutes, seconds) rationals to decimal degrees."""
    d = float(value[0].num) / float(value[0].den)
    m = float(value[1].num) / float(value[1].den)
    s = float(value[2].num) / float(value[2].den)
    return d + (m / 60.0) + (s / 3600.0)


def image_fingerprint(img: PILImage.Image) -> str:
    """64-bit difference hash (dHash): shrink to 9x8 grayscale, compare neighbours.

    Visually identical images (resized, re-encoded) get the same hash, which is
    what duplicate detection groups on.
    """
    small = img.convert("L").resize((9, 8), PILImage.Resampling.LANCZOS)
    px = list(small.tobytes())  # one byte per pixel in mode L
    bits = 0
    for row in range(8):
        for col in range(8):
            bits = (bits << 1) | (px[row * 9 + col] > px[row * 9 + col + 1])
    return f"{bits:016x}"


def _get_date_taken(tags):
    """Helper to get the date taken from EXIF tags."""
    if "EXIF DateTimeOriginal" in tags:
        try:
            return datetime.datetime.strptime(
                str(tags["EXIF DateTimeOriginal"]), "%Y:%m:%d %H:%M:%S"
            )
        except (ValueError, TypeError):
            logger.warning("Could not parse EXIF DateTimeOriginal.")
            return None
    return None


def process_image_background(filepath: str, image_id: int):
    """
    Background task wrapper for image processing.
    Creates a new database session for the task.
    """
    db = SessionLocal()
    try:
        process_and_save_image_metadata_sync(filepath, image_id, db)
        # New uploads get their address right away, not only at the next startup.
        geocoding.reverse_geocode_missing_addresses(db)
    finally:
        db.close()


def process_and_save_image_metadata_sync(filepath: str, image_id: int, db: Session):
    """
    Extracts metadata from an image file, generates AI tags, and updates the
    corresponding Image record in the database.
    """
    logger.info(f"Starting metadata processing for image ID {image_id}: {filepath}")

    try:
        filename = os.path.basename(filepath)
        is_heic = storage.needs_preview(filename)

        # --- Metadata & Preview Generation ---
        location_data = None
        raw_exif_data = {}
        date_taken = None
        camera_model = None
        f_number = None
        exposure_time = None
        iso = None
        focal_length = None
        lens_model = None

        # Open image with PIL (handles HEIC via registered opener)
        with PILImage.open(filepath) as img:
            resolution = f"{img.width}x{img.height}"
            image_size = os.path.getsize(filepath)

            # Generate pHash
            phash = image_fingerprint(img)

            # 1. Generate Thumbnail (WebP)
            thumb_path = storage.thumbnail_path(filename)
            if not thumb_path.exists():
                try:
                    logger.info(f"Creating thumbnail for {filename}")
                    img_thumb = img.copy()
                    img_thumb.thumbnail((400, 400))
                    img_thumb.save(thumb_path, "webp", quality=80)
                except Exception as e:
                    logger.error(f"Thumbnail generation failed: {e}")

            # 2. Generate Preview for HEIC (WebP)
            # Standard browsers can't show HEIC, so we need a full-size (or large) preview.
            if is_heic:
                preview_path = storage.preview_path(filename)
                if not preview_path.exists():
                    try:
                        logger.info(f"Creating preview for HEIC image {filename}")
                        # Max dimension 1920 to save space but keep quality
                        img.thumbnail((1920, 1920))
                        img.save(preview_path, "webp", quality=85)
                    except Exception as e:
                        logger.error(f"Preview generation failed: {e}")

        # 3. Extract EXIF
        # We try exifread first as it's robust for standard formats.
        try:
            with open(filepath, "rb") as f:
                exif_tags = exifread.process_file(f, details=True)

                for tag, value in exif_tags.items():
                    if tag not in ("JPEGThumbnail", "TIFFThumbnail"):
                        raw_exif_data[tag] = str(value)

                # Location
                if "GPS GPSLatitude" in exif_tags:
                    lat = _convert_to_degrees(exif_tags["GPS GPSLatitude"].values)
                    lon = _convert_to_degrees(exif_tags["GPS GPSLongitude"].values)
                    if exif_tags["GPS GPSLatitudeRef"].values[0] != "N":
                        lat = -lat
                    if exif_tags["GPS GPSLongitudeRef"].values[0] != "E":
                        lon = -lon
                    location_data = schemas.LocationCreate(latitude=lat, longitude=lon)

                # Specific fields
                date_taken = _get_date_taken(exif_tags)
                camera_model = str(exif_tags.get("Image Model", "Unknown"))

                f_number_raw = exif_tags.get("EXIF FNumber")
                if f_number_raw:
                    ratio = f_number_raw.values[0]
                    with contextlib.suppress(Exception):
                        f_number = float(ratio.num) / float(ratio.den)

                exposure_time = str(exif_tags.get("EXIF ExposureTime"))

                iso_tag = exif_tags.get("EXIF ISOSpeedRatings")
                if iso_tag:
                    with contextlib.suppress(Exception):
                        iso = int(str(iso_tag))

                focal_length = str(exif_tags.get("EXIF FocalLength"))
                lens_model = str(exif_tags.get("EXIF LensModel"))

        except Exception as e:
            logger.error(f"Error reading EXIF from {filename}: {e}")

        # --- Prepare Pydantic schemas ---
        image_update_schema = schemas.ImageUpdate(
            resolution=resolution,
            image_size=image_size,
            status="completed",
            filepath=filepath,
            filename=filename,
        )
        metadata_schema = schemas.MetadataCreate(
            date_taken=date_taken,
            camera_model=camera_model,
            f_number=f_number,
            exposure_time=exposure_time,
            iso=iso,
            focal_length=focal_length,
            lens_model=lens_model,
            raw_exif=raw_exif_data,
        )

        # --- Update DB ---
        crud.update_image_with_metadata(
            db,
            image_id=image_id,
            image_update=image_update_schema,
            metadata=metadata_schema,
            location=location_data,
            phash=phash,
        )

    except Exception as e:
        logger.error(f"Error processing image {filepath}: {e}", exc_info=True)
        crud.update_image_status(db, image_id=image_id, status="failed")
        return

    # Optional, and only after metadata is saved: a tagging failure never fails indexing.
    if tagger.is_enabled():
        try:
            tags = tagger.suggest_tags(storage.thumbnail_path(filename))
            crud.set_image_tags(db, image_id, tags)
        except Exception:
            logger.exception("Tagging failed for image %s", image_id)
    logger.info(f"Finished metadata processing for image ID {image_id}: {filepath}")
