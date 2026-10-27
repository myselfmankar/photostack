from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/duplicates",
    tags=["duplicates"],
)

@router.get("", response_model=List[List[schemas.Image]])
def get_duplicate_image_groups(db: Session = Depends(get_db)):
    """
    Returns groups of images that are considered duplicates (based on pHash).
    """
    return crud.get_duplicate_images(db)
