from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, func, or_
from . import models, schemas, storage
from typing import List, Optional
import datetime
import calendar

STOP_WORDS = {"in", "and", "the", "of", "show", "me", "find", "pictures", "images",
              "photos", "my", "from", "taken", "a", "with"}


def search_images(db: Session, q: str, limit: int = 100):
    """Keyword search. Every word must match the filename, a tag, the camera, or the address.

    Uses EXISTS subqueries (.any/.has) instead of joins so results have no duplicates.
    """
    words = [w for w in q.lower().split() if w not in STOP_WORDS]
    if not words:
        return []

    query = db.query(models.Image).options(
        joinedload(models.Image.tags),
        joinedload(models.Image.details).joinedload(models.Metadata.location),
    )
    for word in words:
        like = f"%{word}%"
        query = query.filter(
            or_(
                models.Image.filename.ilike(like),
                models.Image.tags.any(models.Tag.name.ilike(like)),
                models.Image.details.has(models.Metadata.camera_model.ilike(like)),
                models.Image.details.has(
                    models.Metadata.location.has(models.Location.address.ilike(like))
                ),
            )
        )
    return query.order_by(models.Image.upload_date.desc()).limit(limit).all()


# --- Tag CRUD ---
def get_tag_by_name(db: Session, name: str):
    return db.query(models.Tag).filter(models.Tag.name == name).first()

# --- Album CRUD ---

def get_album(db: Session, album_id: int):
    return db.query(models.Album).filter(models.Album.id == album_id).first()

def get_albums(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Album).offset(skip).limit(limit).all()

def create_album(db: Session, album: schemas.AlbumCreate):
    db_album = models.Album(name=album.name, description=album.description)
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album

def add_image_to_album(db: Session, album_id: int, image_id: int):
    db_album = get_album(db, album_id=album_id)
    db_image = get_image_by_id(db, image_id=image_id)
    if db_album and db_image:
        db_album.images.append(db_image)
        db.commit()
        db.refresh(db_album)
    return db_album

# --- Image CRUD ---
def toggle_image_favorite_status(db: Session, image_id: int):
    """
    Toggles the is_favorite status of a single image.
    """
    db_image = get_image_by_id(db, image_id=image_id)
    if not db_image:
        return None
    
    db_image.is_favorite = not db_image.is_favorite
    db.commit()
    db.refresh(db_image)
    return db_image


def get_or_create_tag(db: Session, tag_name: str) -> models.Tag:
    db_tag = get_tag_by_name(db, name=tag_name)
    if not db_tag:
        db_tag = models.Tag(name=tag_name)
        db.add(db_tag)
        db.flush()
        db.refresh(db_tag)
    return db_tag

# --- Image CRUD ---
def get_image_by_id(db: Session, image_id: int):
    return db.query(models.Image).filter(models.Image.id == image_id).first()

def get_image_by_filename(db: Session, filename: str):
    return db.query(models.Image).filter(models.Image.filename == filename).first()

def get_image_by_filename_and_status(db: Session, filename: str, status: str):
    """Returns an image if it matches the filename and has the specified status."""
    return db.query(models.Image).filter(models.Image.filename == filename, models.Image.status == status).first()

def get_images(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    sort_by: str = "upload_date",
    camera_model: Optional[str] = None,
    location: Optional[str] = None,
    date: Optional[str] = None, # Expects "YYYY-MM"
    is_favorite: Optional[bool] = None,
    status: Optional[str] = None
):
    """
    Gets a paginated list of images with optional filtering, eagerly loading
    all necessary nested data for the API schema.
    """
    query = (
        db.query(models.Image)
        .options(
            joinedload(models.Image.details)
            .joinedload(models.Metadata.location),
            joinedload(models.Image.tags)
        )
    )

    # Apply filters
    if camera_model:
        query = query.join(models.Metadata).filter(models.Metadata.camera_model.ilike(f'%{camera_model}%'))
    if location:
        query = query.join(models.Metadata).join(models.Location).filter(models.Location.address.ilike(f'%{location}%'))
    if date:
        try:
            year, month = map(int, date.split('-'))
            query = query.join(models.Metadata).filter(
                extract('year', models.Metadata.date_taken) == year,
                extract('month', models.Metadata.date_taken) == month
            )
        except ValueError:
            # Handle invalid date format if necessary
            pass
    if is_favorite is not None:
        query = query.filter(models.Image.is_favorite == is_favorite)
    if status:
        query = query.filter(models.Image.status == status)

    # Apply sorting
    if sort_by == "filename":
        query = query.order_by(models.Image.filename.asc())
    else:  # Default to upload_date
        query = query.order_by(models.Image.upload_date.desc())

    return query.offset(skip).limit(limit).all()

def create_placeholder_image(db: Session, filename: str, filepath: str) -> models.Image:
    """Creates a placeholder image entry with a 'processing' status."""
    db_image = models.Image(
        filename=filename,
        filepath=filepath,
        upload_date=datetime.datetime.now(),
        resolution="N/A",
        image_size=0,
        status="processing"
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def update_image_status(db: Session, image_id: int, status: str):
    """Updates the status of an image."""
    db.query(models.Image).filter(models.Image.id == image_id).update({"status": status})
    db.commit()

def update_image_with_metadata(db: Session, image_id: int, image_update: schemas.ImageUpdate, metadata: schemas.MetadataCreate, location: Optional[schemas.LocationCreate] = None, tags: Optional[List[str]] = None, phash: Optional[str] = None):
    """
    Updates an existing image record with new metadata, tags, and location.
    This is called after background processing of an image is complete.
    """
    db_image = get_image_by_id(db, image_id=image_id)
    if not db_image:
        # This case should ideally not happen if called correctly
        return None

    # Update the core image attributes from the Pydantic model
    update_data = image_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_image, key, value)
    
    db_image.phash = phash

    # If there's existing metadata, delete it.
    # The cascade relationship should handle the associated location.
    if db_image.details:
        db.delete(db_image.details)

    # Create the new metadata record
    db_metadata = models.Metadata(**metadata.dict())
    
    # If location data is provided, create and link the location object
    if location:
        db_location = models.Location(**location.dict())
        db_metadata.location = db_location
        
    # Link the new metadata to the image
    db_image.details = db_metadata

    # Handle tags: clear existing and add the new ones
    db_image.tags.clear()
    if tags:
        for tag_name in tags:
            db_tag = get_or_create_tag(db, tag_name=tag_name)
            db_image.tags.append(db_tag)
    
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image


def delete_image(db: Session, image_id: int) -> bool:
    """Delete an image row and its files. Returns False if it doesn't exist."""
    return batch_delete_images(db, [image_id]) == 1


def batch_delete_images(db: Session, image_ids: List[int]) -> int:
    """Delete image rows and their files; returns how many existed."""
    images = db.query(models.Image).filter(models.Image.id.in_(image_ids)).all()
    for db_image in images:
        storage.delete_files(db_image.filename)
        db.delete(db_image)
    db.commit()
    return len(images)

def batch_toggle_favorite_status(db: Session, image_ids: List[int]) -> List[models.Image]:
    """
    Toggles the is_favorite status for multiple images.
    """
    updated_images = []
    for image_id in image_ids:
        db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
        if db_image:
            db_image.is_favorite = not db_image.is_favorite
            updated_images.append(db_image)
    db.commit()
    for img in updated_images:
        db.refresh(img)
    return updated_images

def get_duplicate_images(db: Session, min_duplicates: int = 2) -> List[List[models.Image]]:
    """
    Returns a list of lists, where each inner list contains images identified as duplicates
    (i.e., having the same phash and status = 'completed').
    """
    duplicates_subquery = (
        db.query(models.Image.phash, func.count(models.Image.id).label('count'))
        .filter(models.Image.phash != None, models.Image.status == "completed")
        .group_by(models.Image.phash)
        .having(func.count(models.Image.id) >= min_duplicates)
        .subquery()
    )

    duplicate_phashes = db.query(duplicates_subquery.c.phash).all()
    duplicate_phashes = [p[0] for p in duplicate_phashes]

    all_duplicate_image_groups = []
    for phash_value in duplicate_phashes:
        images_in_group = (
            db.query(models.Image)
            .options(joinedload(models.Image.tags), joinedload(models.Image.details).joinedload(models.Metadata.location))
            .filter(models.Image.phash == phash_value, models.Image.status == "completed")
            .order_by(models.Image.upload_date.asc())
            .all()
        )
        all_duplicate_image_groups.append(images_in_group)
        
    return all_duplicate_image_groups

def get_album_summary(db: Session) -> List[dict]:
    """
    Returns a summary for the albums page, grouped by year and month.
    """
    # Subquery to find the filename of the first image for each month
    first_image_subquery = (
        db.query(
            models.Image.filename,
            extract("year", models.Metadata.date_taken).label("year"),
            extract("month", models.Metadata.date_taken).label("month"),
            func.row_number().over(
                partition_by=(
                    extract("year", models.Metadata.date_taken),
                    extract("month", models.Metadata.date_taken)
                ),
                order_by=models.Metadata.date_taken.asc()
            ).label("rn")
        )
        .join(models.Metadata)
        .subquery()
    )

    # Main query to get the summary
    result = (
        db.query(
            extract("year", models.Metadata.date_taken).label("year"),
            extract("month", models.Metadata.date_taken).label("month"),
            func.count(models.Image.id).label("image_count"),
            first_image_subquery.c.filename.label("preview_image_filename")
        )
        .join(models.Metadata)
        .join(
            first_image_subquery,
            (
                extract("year", models.Metadata.date_taken) == first_image_subquery.c.year
            ) &
            (
                extract("month", models.Metadata.date_taken) == first_image_subquery.c.month
            ) &
            (first_image_subquery.c.rn == 1)
        )
        .group_by(
            extract("year", models.Metadata.date_taken),
            extract("month", models.Metadata.date_taken),
            first_image_subquery.c.filename
        )
        .order_by(
            extract("year", models.Metadata.date_taken).desc(),
            extract("month", models.Metadata.date_taken).desc()
        )
        .all()
    )
    
    # Format the result
    return [
        {
            "year": r.year,
            "month": r.month,
            "month_name": calendar.month_name[int(r.month)],
            "image_count": r.image_count,
            "preview_image_url": storage.thumbnail_url(r.preview_image_filename)
        }
        for r in result
    ]


def get_album_images(db: Session, year: int, month: int):
    """
    Gets all images for a specific album (year and month).
    """
    return (
        db.query(models.Image)
        .options(
            joinedload(models.Image.details)
            .joinedload(models.Metadata.location),
            joinedload(models.Image.tags)
        )
        .join(models.Metadata)
        .filter(
            extract('year', models.Metadata.date_taken) == year,
            extract('month', models.Metadata.date_taken) == month
        )
        .order_by(models.Metadata.date_taken.asc())
        .all()
    )


# --- Map Data CRUD ---
def get_locations_without_address(db: Session):
    """Returns all Location records where the address is NULL."""
    return db.query(models.Location).filter(models.Location.address.is_(None)).all()

def update_location_address(db: Session, location_id: int, address: str):
    """Updates the address for a given location ID."""
    db.query(models.Location).filter(models.Location.id == location_id).update({"address": address})
    db.commit()

def get_map_data(db: Session):
    """
    Returns a list of all geotagged images with the data needed for the map.
    """
    images = db.query(models.Image).join(models.Metadata).join(models.Location).all()
    return [
        {
            "id": img.id,
            "latitude": img.details.location.latitude,
            "longitude": img.details.location.longitude,
            "address": img.details.location.address,
            "thumbnail_url": storage.thumbnail_url(img.filename),
            "filename": img.filename
        }
        for img in images
    ]

# --- Filter CRUD ---
def get_unique_camera_models(db: Session) -> List[str]:
    """Returns a list of unique camera models."""
    return [model[0] for model in db.query(models.Metadata.camera_model).filter(models.Metadata.camera_model != None).distinct().all()]

def get_unique_locations(db: Session) -> List[str]:
    """Returns a list of unique locations."""
    return [loc[0] for loc in db.query(models.Location.address).filter(models.Location.address != None).distinct().all()]

def get_unique_dates(db: Session) -> List[str]:
    """Returns a list of unique year/month combinations."""
    dates = db.query(
        extract('year', models.Metadata.date_taken),
        extract('month', models.Metadata.date_taken)
    ).filter(
        models.Metadata.date_taken != None
    ).distinct().all()
    return [f"{int(year)}-{int(month):02d}" for year, month in dates if year and month]

# --- Stats CRUD ---
def get_stats(db: Session):
    """
    Returns comprehensive statistics for the dashboard.
    """
    total_images = db.query(func.count(models.Image.id)).scalar() or 0
    total_size = db.query(func.sum(models.Image.image_size)).scalar() or 0
    favorites_count = db.query(func.count(models.Image.id)).filter(models.Image.is_favorite == True).scalar() or 0
    
    # Camera stats (Top 5)
    cameras = (
        db.query(models.Metadata.camera_model, func.count(models.Image.id).label('count'))
        .join(models.Image.details)
        .filter(models.Metadata.camera_model != None)
        .group_by(models.Metadata.camera_model)
        .order_by(func.count(models.Image.id).desc())
        .limit(5)
        .all()
    )
    
    # Location stats (Top 5)
    locations = (
        db.query(models.Location.address, func.count(models.Image.id).label('count'))
        .join(models.Metadata, models.Location.metadata_id == models.Metadata.id)
        .join(models.Image, models.Metadata.image_id == models.Image.id)
        .filter(models.Location.address != None)
        .group_by(models.Location.address)
        .order_by(func.count(models.Image.id).desc())
        .limit(5)
        .all()
    )

    # Processing status
    status_counts = db.query(models.Image.status, func.count(models.Image.id)).group_by(models.Image.status).all()
    status_dict = {s: c for s, c in status_counts}

    # Uploads by Month (Current Year)
    current_year = datetime.datetime.now().year
    uploads_by_month = (
        db.query(
            extract('month', models.Image.upload_date).label('month'),
            func.count(models.Image.id).label('count')
        )
        .filter(extract('year', models.Image.upload_date) == current_year)
        .group_by(extract('month', models.Image.upload_date))
        .all()
    )
    
    uploads_formatted = [{"month": calendar.month_abbr[int(r.month)], "count": r.count} for r in uploads_by_month]

    return {
        "total_images": total_images,
        "total_size": total_size,
        "favorites_count": favorites_count,
        "camera_stats": [{"name": c[0], "value": c[1]} for c in cameras],
        "location_stats": [{"name": l[0], "value": l[1]} for l in locations],
        "processing_status": status_dict,
        "uploads_by_month": uploads_formatted
    }