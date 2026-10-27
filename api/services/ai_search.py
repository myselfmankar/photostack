from sqlalchemy.orm import Session

from .. import crud


def perform_ai_search(db: Session, query: str):
    """Stub: the LLM query parser was removed; this is plain keyword search.

    Replaced by a real search endpoint in restructure step 5.
    """
    return crud.search_images_by_keywords(db, query=query)
