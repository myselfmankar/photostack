"""Database tables.

One row in `images` is one photo: file facts, EXIF, and location live together,
because each photo has exactly one of each. Tags and albums are many-to-many.
"""

import datetime

from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

image_tags = Table(
    "image_tags",
    Base.metadata,
    Column("image_id", ForeignKey("images.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

album_images = Table(
    "album_images",
    Base.metadata,
    Column("album_id", ForeignKey("albums.id", ondelete="CASCADE"), primary_key=True),
    Column("image_id", ForeignKey("images.id", ondelete="CASCADE"), primary_key=True),
)


class Image(Base):
    __tablename__ = "images"

    id: Mapped[int] = mapped_column(primary_key=True)
    # The file on disk is uploads/<filename>; see storage.py.
    filename: Mapped[str] = mapped_column(String, unique=True, index=True)
    upload_date: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.now)
    # processing -> completed | failed
    status: Mapped[str] = mapped_column(default="processing", index=True)
    is_favorite: Mapped[bool] = mapped_column(default=False)

    # Filled in by the indexer.
    width: Mapped[int | None]
    height: Mapped[int | None]
    image_size: Mapped[int | None]  # bytes
    fingerprint: Mapped[str | None] = mapped_column(index=True)  # dHash, for duplicates

    # EXIF
    date_taken: Mapped[datetime.datetime | None] = mapped_column(index=True)
    camera_model: Mapped[str | None]
    lens_model: Mapped[str | None]
    f_number: Mapped[float | None]
    exposure_time: Mapped[str | None]
    iso: Mapped[int | None]
    focal_length: Mapped[str | None]

    # GPS, plus a street address looked up later by geocoding.
    latitude: Mapped[float | None]
    longitude: Mapped[float | None]
    address: Mapped[str | None]

    tags: Mapped[list["Tag"]] = relationship(secondary=image_tags, back_populates="images")
    albums: Mapped[list["Album"]] = relationship(secondary=album_images, back_populates="images")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True, index=True)

    images: Mapped[list[Image]] = relationship(secondary=image_tags, back_populates="tags")


class Album(Base):
    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    description: Mapped[str | None]
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.now)

    images: Mapped[list[Image]] = relationship(
        secondary=album_images,
        back_populates="albums",
        order_by=lambda: (Image.date_taken.is_(None), Image.date_taken, Image.upload_date),
    )
