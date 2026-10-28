from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/dashboard-stats",
    tags=["stats"],
)


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    return crud.get_stats(db)
