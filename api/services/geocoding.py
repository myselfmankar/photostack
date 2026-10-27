"""Turn GPS coordinates into a human-readable address (OpenStreetMap Nominatim).

Nominatim is free but allows ~1 request/second, so lookups are sequential.
"""

import logging
import time

from geopy.geocoders import Nominatim
from sqlalchemy.orm import Session

from .. import crud, models
from ..config import settings

logger = logging.getLogger(__name__)
_geolocator = Nominatim(user_agent="photostack")


def geocode_location(db: Session, location: models.Location) -> None:
    """Look up and store the address for one location."""
    try:
        found = _geolocator.reverse(
            (location.latitude, location.longitude), exactly_one=True, timeout=10
        )
        address = found.address if found else "Unknown Location"
    except Exception as e:
        logger.warning("Geocoding failed for location %s: %s", location.id, e)
        address = "Geocoding Failed"
    crud.update_location_address(db, location_id=location.id, address=address)


def reverse_geocode_missing_addresses(db: Session) -> None:
    """Fill in addresses for every location that doesn't have one yet."""
    if not settings.GEOCODING_ENABLED:
        return
    pending = crud.get_locations_without_address(db)
    logger.info("Geocoding %d locations", len(pending))
    for location in pending:
        geocode_location(db, location)
        time.sleep(1)  # Nominatim rate limit
