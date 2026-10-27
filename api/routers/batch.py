from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/batch",
    tags=["batch"],
)

@router.post("/images/delete", status_code=204)
def batch_delete_images(image_ids: List[int], db: Session = Depends(get_db)) -> None:
    """
    Deletes multiple images by their IDs.
    """
    deleted_count = crud.batch_delete_images(db, image_ids)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="No images found for deletion")

@router.post("/images/favorite", response_model=List[schemas.Image])
def batch_toggle_favorite_status(image_ids: List[int], db: Session = Depends(get_db)):
    """
    Toggles the favorite status for multiple images by their IDs.
    Returns the updated list of images.
    """
    updated_images = crud.batch_toggle_favorite_status(db, image_ids)
    if not updated_images:
        raise HTTPException(status_code=404, detail="No images found for status toggle")
    return updated_images
