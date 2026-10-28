"""Shapes of API responses and request bodies (Pydantic)."""

import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from . import storage


class Tag(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class AlbumCreate(BaseModel):
    name: str
    description: str | None = None


class AlbumRef(AlbumCreate):
    """An album as listed on a photo (without the album's own photo list)."""

    model_config = ConfigDict(from_attributes=True)

    id: int


class Image(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    upload_date: datetime.datetime
    status: str
    is_favorite: bool

    width: int | None
    height: int | None
    image_size: int | None

    date_taken: datetime.datetime | None
    camera_model: str | None
    lens_model: str | None
    f_number: float | None
    exposure_time: str | None
    iso: int | None
    focal_length: str | None

    latitude: float | None
    longitude: float | None
    address: str | None

    tags: list[Tag] = []
    albums: list[AlbumRef] = []

    @computed_field
    @property
    def thumbnail_url(self) -> str:
        return storage.thumbnail_url(self.filename)

    @computed_field
    @property
    def full_url(self) -> str:
        """Full-size image the browser can display (a WebP preview for HEIC)."""
        return storage.display_url(self.filename)


class Album(AlbumRef):
    images: list[Image] = []
