"""Turn GPS coordinates into a street address (OpenStreetMap Nominatim).

Nominatim is free but allows ~1 request/second, so lookups are sequential.
"""

import logging
import time

from geopy.geocoders import Nominatim
from sqlalchemy.orm import Session

from .. import crud
from ..config import settings

logger = logging.getLogger(__name__)
_geolocator = Nominatim(user_agent="photostack")


def lookup_address(latitude: float, longitude: float) -> str:
    try:
        found = _geolocator.reverse((latitude, longitude), exactly_one=True, timeout=10)
        return found.address if found else "Unknown location"
    except Exception as e:
        logger.warning("Geocoding failed for (%s, %s): %s", latitude, longitude, e)
        return "Geocoding failed"


def geocode_missing(db: Session) -> None:
    """Fill in the address of every photo that has GPS but no address yet."""
    if not settings.GEOCODING_ENABLED:
        return
    for image in crud.get_images_missing_address(db):
        crud.set_address(db, image.id, lookup_address(image.latitude, image.longitude))
        time.sleep(1)  # Nominatim rate limit
