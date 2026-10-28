from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("", response_model=list[schemas.Image])
def search(q: str, db: Session = Depends(get_db)):
    """Search photos by filename, tag, camera, or place, e.g. `?q=goa canon`."""
    return crud.search_images(db, q)
