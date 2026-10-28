"""Albums come in two kinds:

- Months: automatic, one per month that has photos (by date taken). Read-only.
- Custom albums: created by the user. A photo can be in many albums, and
  deleting an album never deletes its photos.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/v1/albums", tags=["albums"])


# Month routes come first: "/months" would otherwise be tried as an album id.
@router.get("/months")
def list_months(db: Session = Depends(get_db)) -> list[dict]:
    return crud.get_months(db)


@router.get("/months/{year}/{month}", response_model=list[schemas.Image])
def month_images(year: int, month: int, db: Session = Depends(get_db)):
    return crud.get_month_images(db, year, month)


def album_or_404(album_id: int, db: Session = Depends(get_db)) -> models.Album:
    album = crud.get_album(db, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album


@router.get("", response_model=list[schemas.AlbumSummary])
def list_albums(db: Session = Depends(get_db)):
    return crud.get_albums(db)


@router.post("", response_model=schemas.Album, status_code=201)
def create_album(album: schemas.AlbumCreate, db: Session = Depends(get_db)):
    return crud.create_album(db, album)


@router.get("/{album_id}", response_model=schemas.Album)
def get_album(album: models.Album = Depends(album_or_404)):
    return album


@router.patch("/{album_id}", response_model=schemas.Album)
def update_album(
    changes: schemas.AlbumUpdate,
    album: models.Album = Depends(album_or_404),
    db: Session = Depends(get_db),
):
    return crud.update_album(db, album, changes)


@router.delete("/{album_id}", status_code=204)
def delete_album(album: models.Album = Depends(album_or_404), db: Session = Depends(get_db)):
    crud.delete_album(db, album)


@router.post("/{album_id}/images", response_model=schemas.Album)
def add_images(
    image_ids: list[int],
    album: models.Album = Depends(album_or_404),
    db: Session = Depends(get_db),
):
    crud.add_images_to_album(db, album, image_ids)
    return album


@router.post("/{album_id}/images/remove", response_model=schemas.Album)
def remove_images(
    image_ids: list[int],
    album: models.Album = Depends(album_or_404),
    db: Session = Depends(get_db),
):
    """POST, not DELETE: it takes a list of ids in the body."""
    crud.remove_images_from_album(db, album, image_ids)
    return album
