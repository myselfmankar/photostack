"""Shapes of API responses and request bodies (Pydantic)."""

import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, computed_field

from . import storage


class Tag(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


AlbumName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class AlbumCreate(BaseModel):
    name: AlbumName
    description: str | None = None


class AlbumUpdate(BaseModel):
    """PATCH body: only the fields that are sent get changed."""

    name: AlbumName | None = None
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


class AlbumSummary(AlbumRef):
    """An album in the albums list: no photos, just a count and a cover."""

    created_at: datetime.datetime
    image_count: int
    cover_url: str | None


class Album(AlbumRef):
    created_at: datetime.datetime
    images: list[Image] = []
