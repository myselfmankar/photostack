from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/albums",
    tags=["albums"],
)

@router.get("/summary", response_model=List[dict])
def get_album_summary(db: Session = Depends(get_db)):
    """
    Returns a summary of albums grouped by year and month.
    """
    return crud.get_album_summary(db)

@router.get("/{year}/{month}", response_model=List[schemas.Image])
def get_album_images(year: int, month: int, db: Session = Depends(get_db)):
    """
    Returns all images for a specific album (year and month).
    """
    images = crud.get_album_images(db, year, month)
    return images

@router.post("/", response_model=schemas.Album, status_code=201)
def create_album(album: schemas.AlbumCreate, db: Session = Depends(get_db)):
    """
    Create a new custom album.
    """
    return crud.create_album(db, album)

@router.post("/{album_id}/images", response_model=schemas.Album)
def add_images_to_album(album_id: int, image_ids: List[int], db: Session = Depends(get_db)):
    """
    Add multiple images to an album.
    """
    for image_id in image_ids:
        crud.add_image_to_album(db, album_id, image_id)
    return crud.get_album(db, album_id)