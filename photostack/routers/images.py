from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import crud, indexer, integrity, schemas, storage
from ..database import get_db

router = APIRouter(prefix="/api/v1/images", tags=["images"])


@router.post("", response_model=schemas.Image, status_code=201)
def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Save the file, create a 'processing' row, and index it in the background."""
    filename = storage.safe_filename(file.filename)
    if filename is None:
        raise HTTPException(status_code=400, detail="Invalid file name")
    if not storage.is_supported(filename):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    data = file.file.read()
    actual = integrity.real_type(data[:16])
    if actual is None or actual != integrity.extension_type(filename):
        raise HTTPException(status_code=400, detail="The file's contents don't match its extension")

    same = crud.get_image_by_sha256(db, integrity.sha256(data))
    if same:
        if same.filename == filename:
            return same  # re-uploading the same file is a no-op
        raise HTTPException(
            status_code=409, detail=f"This exact file is already in the library as {same.filename}"
        )

    # A different file with a name we already have (IMG_0001.jpg from two phones):
    # keep both. Only a failed/unfinished row with this name is retried in place.
    existing = crud.get_image_by_filename(db, filename)
    if existing and existing.status == "completed":
        filename = storage.unique_filename(
            filename,
            lambda n: storage.original_path(n).exists() or crud.get_image_by_filename(db, n),
        )

    storage.original_path(filename).write_bytes(data)
    image_id = indexer.queue_file(db, filename)
    background_tasks.add_task(indexer.index_in_background, image_id, filename)
    return crud.get_image_by_id(db, image_id)


@router.get("", response_model=list[schemas.Image])
def read_images(
    skip: int = 0,
    limit: int = 20,
    sort_by: str = "upload_date",
    camera_model: str | None = None,
    location: str | None = None,
    date: str | None = None,
    is_favorite: bool | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    return crud.get_images(
        db,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        camera_model=camera_model,
        location=location,
        date=date,
        is_favorite=is_favorite,
        status=status,
    )


@router.get("/{image_id}", response_model=schemas.Image)
def read_image(image_id: int, db: Session = Depends(get_db)):
    db_image = crud.get_image_by_id(db, image_id=image_id)
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    return db_image


@router.post("/{image_id}/favorite", response_model=schemas.Image)
def toggle_favorite(image_id: int, db: Session = Depends(get_db)):
    db_image = crud.toggle_image_favorite_status(db, image_id=image_id)
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    return db_image


@router.delete("/{image_id}", status_code=204)
def delete_image(image_id: int, db: Session = Depends(get_db)) -> None:
    if not crud.delete_image(db, image_id=image_id):
        raise HTTPException(status_code=404, detail="Image not found")
