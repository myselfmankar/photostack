from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List


from .. import schemas
from ..database import get_db
from ..services import ai_search

router = APIRouter(
    prefix="/api/v1/search",
    tags=["search"],
)

class AIQuery(BaseModel):
    query: str

@router.post("/ai", response_model=List[schemas.Image])
def ai_search_endpoint(query: AIQuery, db: Session = Depends(get_db)):
    """
    Performs a natural language search for images.
    """
    try:
        images = ai_search.perform_ai_search(db, query.query)
        return images
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
