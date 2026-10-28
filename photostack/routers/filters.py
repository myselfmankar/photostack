from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/filters",
    tags=["filters"],
)


@router.get("/cameras", response_model=list[str])
def get_camera_filters(db: Session = Depends(get_db)):
    """
    Get a list of all unique camera models for filtering.
    """
    return crud.get_unique_camera_models(db)


@router.get("/locations", response_model=list[str])
def get_location_filters(db: Session = Depends(get_db)):
    """
    Get a list of all unique locations for filtering.
    """
    return crud.get_unique_locations(db)


@router.get("/dates", response_model=list[str])
def get_date_filters(db: Session = Depends(get_db)):
    """
    Get a list of all unique dates (year and month) for filtering.
    """
    return crud.get_unique_dates(db)
