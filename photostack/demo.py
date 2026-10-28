"""Public demo setup: example albums, so the read-only demo doesn't look empty.

Albums come from demo-photos/albums.json ({"Album name": ["file.jpg", ...]}).
They're created once, only in demo mode, and only if there are no albums yet.
"""

import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from . import crud, models, schemas
from .config import settings

logger = logging.getLogger(__name__)
ALBUMS_FILE = Path(__file__).resolve().parent.parent / "demo-photos" / "albums.json"


def seed_albums(db: Session, albums_file: Path = ALBUMS_FILE) -> None:
    if not settings.DEMO_MODE or not albums_file.exists() or db.query(models.Album).count():
        return
    for name, filenames in json.loads(albums_file.read_text(encoding="utf-8")).items():
        album = crud.create_album(db, schemas.AlbumCreate(name=name))
        ids = [img.id for f in filenames if (img := crud.get_image_by_filename(db, f))]
        crud.add_images_to_album(db, album, ids)
        logger.info("Demo album %r: %d photos", name, len(ids))
