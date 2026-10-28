"""Library health: what's in the library, and what needs attention."""

from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, indexer, video
from ..database import get_db

router = APIRouter(prefix="/api/v1/library", tags=["library"])


@router.get("")
def library_health(db: Session = Depends(get_db)) -> dict:
    """Counts, storage, and issues. List an issue's photos with GET /images?issue=<name>."""
    return crud.get_library_health(db)


@router.post("/reindex", status_code=202)
def reindex(
    issue: Literal["failed", "video_no_thumbnail"],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """Index the files with this issue again, in the background."""
    if issue == "video_no_thumbnail" and not video.available():
        raise HTTPException(status_code=409, detail="Install ffmpeg on the server first")
    ids = crud.ids_with_issue(db, issue)
    for image_id in ids:
        crud.update_image_status(db, image_id, "processing")
    background_tasks.add_task(indexer.reindex_in_background, ids)
    return {"queued": len(ids)}
