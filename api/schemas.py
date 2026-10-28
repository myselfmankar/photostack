import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, computed_field

from . import storage


# --- Tag Schemas ---
class TagBase(BaseModel):
    name: str


class TagCreate(TagBase):
    pass


class Tag(TagBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Album Schemas ---
class AlbumBase(BaseModel):
    name: str
    description: str | None = None


class AlbumCreate(AlbumBase):
    pass


class Album(AlbumBase):
    id: int
    images: list["Image"] = []

    model_config = ConfigDict(from_attributes=True)


# --- Location Schemas ---
class LocationBase(BaseModel):
    latitude: float
    longitude: float
    address: str | None = None


class LocationCreate(LocationBase):
    pass


class Location(LocationBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Metadata Schemas ---
class MetadataBase(BaseModel):
    camera_model: str | None = None
    date_taken: datetime.datetime | None = None
    f_number: float | None = None
    exposure_time: str | None = None
    iso: int | None = None
    focal_length: str | None = None
    lens_model: str | None = None
    raw_exif: dict[str, Any] | None = None


class MetadataCreate(MetadataBase):
    pass


class Metadata(MetadataBase):
    id: int
    location: Location | None = None

    model_config = ConfigDict(from_attributes=True)


# --- Image Schemas ---
class ImageBase(BaseModel):
    filename: str
    filepath: str
    upload_date: datetime.datetime
    resolution: str
    image_size: int
    mimetype: str | None = None


class ImageCreate(ImageBase):
    pass


class ImageUpdate(BaseModel):
    filepath: str | None = None
    filename: str | None = None
    resolution: str | None = None
    image_size: int | None = None
    mimetype: str | None = None
    status: str | None = None


# This is the main schema for reading an image, includes nested data
class Image(ImageBase):
    id: int
    details: Metadata | None = None
    tags: list[Tag] = []
    albums: list[AlbumBase] = []
    is_favorite: bool = False
    status: str = "processing"
    phash: str | None = None

    @computed_field
    @property
    def thumbnail_url(self) -> str:
        return storage.thumbnail_url(self.filename)

    @computed_field
    @property
    def medium_url(self) -> str:
        return storage.display_url(self.filename)

    @computed_field
    @property
    def large_url(self) -> str:
        return storage.display_url(self.filename)

    model_config = ConfigDict(from_attributes=True)


Album.model_rebuild()
