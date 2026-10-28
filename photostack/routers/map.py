from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/map",
    tags=["map"],
)


@router.get("/data")
def get_map_data_json(db: Session = Depends(get_db)):
    """
    Returns a JSON list of all geotagged images with the data needed for the map.
    """
    return crud.get_map_data(db)
