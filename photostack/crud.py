"""All database reads and writes. Routers and the indexer call these; nothing else touches SQL."""

import calendar
import datetime
from itertools import groupby
from typing import Any

from sqlalchemy import extract, func, or_
from sqlalchemy.orm import Query, Session, selectinload

from . import models, schemas, storage

Image = models.Image


def _images(db: Session) -> Query:
    """Base image query that also loads tags/albums (2 extra queries total, not 1 per photo)."""
    return db.query(Image).options(selectinload(Image.tags), selectinload(Image.albums))


# --- Images -------------------------------------------------------------------


def get_image_by_id(db: Session, image_id: int) -> Image | None:
    return _images(db).filter(Image.id == image_id).first()


def get_image_by_filename(db: Session, filename: str) -> Image | None:
    return db.query(Image).filter(Image.filename == filename).first()


def get_images(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = "upload_date",
    camera_model: str | None = None,
    location: str | None = None,
    date: str | None = None,  # "YYYY-MM", matched against date_taken
    is_favorite: bool | None = None,
    status: str | None = None,
) -> list[Image]:
    query = _images(db)
    if camera_model:
        query = query.filter(Image.camera_model.ilike(f"%{camera_model}%"))
    if location:
        query = query.filter(Image.address.ilike(f"%{location}%"))
    if date:
        try:
            year, month = map(int, date.split("-"))
            query = query.filter(
                extract("year", Image.date_taken) == year,
                extract("month", Image.date_taken) == month,
            )
        except ValueError:
            pass
    if is_favorite is not None:
        query = query.filter(Image.is_favorite.is_(is_favorite))
    if status:
        query = query.filter(Image.status == status)

    undated_last = Image.date_taken.is_(None)  # SQLite and Postgres disagree on NULL order
    order = {
        "upload_date_asc": [Image.upload_date.asc()],
        "date_taken": [undated_last, Image.date_taken.desc()],
        "date_taken_asc": [undated_last, Image.date_taken.asc()],
        "filename": [Image.filename.asc()],
    }.get(sort_by, [Image.upload_date.desc()])
    return query.order_by(*order, Image.id.desc()).offset(skip).limit(limit).all()


STOP_WORDS = {"in", "and", "the", "of", "show", "me", "find", "pictures", "images",
              "photos", "my", "from", "taken", "a", "with"}  # fmt: skip


def search_images(db: Session, q: str, limit: int = 100) -> list[Image]:
    """Every word must match the filename, a tag, the camera, or the address."""
    words = [w for w in q.lower().split() if w not in STOP_WORDS]
    if not words:
        return []
    query = _images(db)
    for word in words:
        like = f"%{word}%"
        query = query.filter(
            or_(
                Image.filename.ilike(like),
                Image.camera_model.ilike(like),
                Image.address.ilike(like),
                Image.tags.any(models.Tag.name.ilike(like)),  # EXISTS, so no duplicate rows
            )
        )
    return query.order_by(Image.upload_date.desc()).limit(limit).all()


def toggle_image_favorite_status(db: Session, image_id: int) -> Image | None:
    image = get_image_by_id(db, image_id)
    if image:
        image.is_favorite = not image.is_favorite
        db.commit()
    return image


def batch_toggle_favorite_status(db: Session, image_ids: list[int]) -> list[Image]:
    images = _images(db).filter(Image.id.in_(image_ids)).all()
    for image in images:
        image.is_favorite = not image.is_favorite
    db.commit()
    return images


def delete_image(db: Session, image_id: int) -> bool:
    """Delete an image row and its files. Returns False if it doesn't exist."""
    return batch_delete_images(db, [image_id]) == 1


def batch_delete_images(db: Session, image_ids: list[int]) -> int:
    """Delete image rows and their files; returns how many existed."""
    images = db.query(Image).filter(Image.id.in_(image_ids)).all()
    for image in images:
        storage.delete_files(image.filename)
        db.delete(image)
    db.commit()
    return len(images)


# --- Indexing -----------------------------------------------------------------


def create_placeholder_image(db: Session, filename: str) -> Image:
    """A row for a file that hasn't been indexed yet (status 'processing')."""
    image = Image(filename=filename, status="processing")
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


def update_image_status(db: Session, image_id: int, status: str) -> None:
    db.query(Image).filter(Image.id == image_id).update({"status": status})
    db.commit()


def save_index_result(db: Session, image_id: int, fields: dict[str, Any]) -> None:
    """Store what the indexer extracted and mark the image completed."""
    db.query(Image).filter(Image.id == image_id).update({**fields, "status": "completed"})
    db.commit()


def get_or_create_tag(db: Session, name: str) -> models.Tag:
    tag = db.query(models.Tag).filter(models.Tag.name == name).first()
    if not tag:
        tag = models.Tag(name=name)
        db.add(tag)
        db.flush()
    return tag


def set_image_tags(db: Session, image_id: int, tags: list[str]) -> None:
    image = get_image_by_id(db, image_id)
    if image:
        image.tags = [get_or_create_tag(db, name) for name in tags]
        db.commit()


def get_images_missing_address(db: Session) -> list[Image]:
    return (
        db.query(Image)
        .filter(Image.latitude.is_not(None), Image.longitude.is_not(None), Image.address.is_(None))
        .all()
    )


def set_address(db: Session, image_id: int, address: str) -> None:
    db.query(Image).filter(Image.id == image_id).update({"address": address})
    db.commit()


# --- Duplicates ---------------------------------------------------------------


def get_duplicate_images(db: Session) -> list[list[Image]]:
    """Groups of 2+ completed images with the same visual fingerprint, oldest first."""
    shared = (
        db.query(Image.fingerprint)
        .filter(Image.fingerprint.is_not(None), Image.status == "completed")
        .group_by(Image.fingerprint)
        .having(func.count(Image.id) > 1)
    )
    images = (
        _images(db)
        .filter(Image.fingerprint.in_(shared), Image.status == "completed")
        .order_by(Image.fingerprint, Image.upload_date)
        .all()
    )
    return [list(group) for _, group in groupby(images, key=lambda i: i.fingerprint)]


# --- Albums -------------------------------------------------------------------


def get_months(db: Session) -> list[dict]:
    """One entry per month that has photos (by date taken), newest month first."""
    rows = (
        db.query(Image.filename, Image.date_taken)
        .filter(Image.date_taken.is_not(None))
        .order_by(Image.date_taken)
        .all()
    )
    months = []
    for (year, month), group in groupby(
        rows, key=lambda r: (r.date_taken.year, r.date_taken.month)
    ):
        group = list(group)
        months.append(
            {
                "year": year,
                "month": month,
                "month_name": calendar.month_name[month],
                "image_count": len(group),
                "preview_image_url": storage.thumbnail_url(group[0].filename),
            }
        )
    return months[::-1]


def get_month_images(db: Session, year: int, month: int) -> list[Image]:
    return (
        _images(db)
        .filter(
            extract("year", Image.date_taken) == year,
            extract("month", Image.date_taken) == month,
        )
        .order_by(Image.date_taken)
        .all()
    )


def get_album(db: Session, album_id: int) -> models.Album | None:
    return (
        db.query(models.Album)
        .options(selectinload(models.Album.images).selectinload(Image.tags))
        .filter(models.Album.id == album_id)
        .first()
    )


def get_albums(db: Session) -> list[dict]:
    """Every custom album with its photo count and a cover thumbnail, newest first."""
    albums = (
        db.query(models.Album)
        .options(selectinload(models.Album.images))
        .order_by(models.Album.created_at.desc(), models.Album.id.desc())
        .all()
    )
    return [
        {
            "id": album.id,
            "name": album.name,
            "description": album.description,
            "created_at": album.created_at,
            "image_count": len(album.images),
            "cover_url": storage.thumbnail_url(album.images[0].filename) if album.images else None,
        }
        for album in albums
    ]


def create_album(db: Session, album: schemas.AlbumCreate) -> models.Album:
    db_album = models.Album(name=album.name, description=album.description)
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album


def update_album(db: Session, album: models.Album, changes: schemas.AlbumUpdate) -> models.Album:
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(album, field, value)
    db.commit()
    return album


def delete_album(db: Session, album: models.Album) -> None:
    """Deletes the album only; its photos stay in the library."""
    db.delete(album)
    db.commit()


def add_images_to_album(db: Session, album: models.Album, image_ids: list[int]) -> None:
    """Add photos, skipping ids that don't exist or are already in the album."""
    present = {image.id for image in album.images}
    new = db.query(Image).filter(Image.id.in_(set(image_ids) - present)).all()
    album.images.extend(new)
    db.commit()


def remove_images_from_album(db: Session, album: models.Album, image_ids: list[int]) -> None:
    album.images = [image for image in album.images if image.id not in set(image_ids)]
    db.commit()


# --- Map, filters, stats ------------------------------------------------------


def get_map_data(db: Session) -> list[dict]:
    images = db.query(Image).filter(Image.latitude.is_not(None), Image.longitude.is_not(None))
    return [
        {
            "id": img.id,
            "latitude": img.latitude,
            "longitude": img.longitude,
            "address": img.address,
            "thumbnail_url": storage.thumbnail_url(img.filename),
            "filename": img.filename,
        }
        for img in images
    ]


def _distinct(db: Session, column) -> list:
    return [v for (v,) in db.query(column).filter(column.is_not(None)).distinct().order_by(column)]


def get_unique_camera_models(db: Session) -> list[str]:
    return _distinct(db, Image.camera_model)


def get_unique_locations(db: Session) -> list[str]:
    return _distinct(db, Image.address)


def get_unique_dates(db: Session) -> list[str]:
    """Months that have photos, as 'YYYY-MM', newest first."""
    dates = _distinct(db, Image.date_taken)
    return sorted({f"{d.year}-{d.month:02d}" for d in dates}, reverse=True)


def _top(db: Session, column, limit: int = 5) -> list[dict]:
    rows = (
        db.query(column, func.count(Image.id))
        .filter(column.is_not(None))
        .group_by(column)
        .order_by(func.count(Image.id).desc())
        .limit(limit)
    )
    return [{"name": name, "value": count} for name, count in rows]


def get_stats(db: Session) -> dict:
    this_year = datetime.date.today().year
    upload_dates = db.query(Image.upload_date).filter(
        extract("year", Image.upload_date) == this_year
    )
    per_month: dict[int, int] = {}
    for (uploaded,) in upload_dates:
        per_month[uploaded.month] = per_month.get(uploaded.month, 0) + 1

    return {
        "total_images": db.query(func.count(Image.id)).scalar() or 0,
        "total_size": db.query(func.sum(Image.image_size)).scalar() or 0,
        "favorites_count": db.query(func.count(Image.id)).filter(Image.is_favorite).scalar() or 0,
        "camera_stats": _top(db, Image.camera_model),
        "location_stats": _top(db, Image.address),
        "processing_status": dict(
            db.query(Image.status, func.count(Image.id)).group_by(Image.status).all()
        ),
        "uploads_by_month": [
            {"month": calendar.month_abbr[m], "count": n} for m, n in sorted(per_month.items())
        ],
    }
