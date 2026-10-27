"""Stub: AI suggestions were removed (restructure step 5 deletes these endpoints)."""

from sqlalchemy.orm import Session


def generate_album_suggestions(db: Session) -> list[str]:
    return []


def generate_search_suggestions(db: Session) -> list[str]:
    return []
