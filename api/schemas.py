from pydantic import BaseModel, computed_field

from . import storage
from typing import Optional, List, Dict, Any
import datetime

# --- Tag Schemas ---
class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int

    class Config:
        from_attributes = True

# --- Album Schemas ---
class AlbumBase(BaseModel):
    name: str
    description: Optional[str] = None

class AlbumCreate(AlbumBase):
    pass

class Album(AlbumBase):
    id: int
    images: List["Image"] = []

    class Config:
        from_attributes = True


# --- Location Schemas ---
class LocationBase(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class Location(LocationBase):
    id: int

    class Config:
        from_attributes = True

# --- Metadata Schemas ---
class MetadataBase(BaseModel):
    camera_model: Optional[str] = None
    date_taken: Optional[datetime.datetime] = None
    f_number: Optional[float] = None
    exposure_time: Optional[str] = None
    iso: Optional[int] = None
    focal_length: Optional[str] = None
    lens_model: Optional[str] = None
    raw_exif: Optional[Dict[str, Any]] = None

class MetadataCreate(MetadataBase):
    pass

class Metadata(MetadataBase):
    id: int
    location: Optional[Location] = None

    class Config:
        from_attributes = True

# --- Image Schemas ---
class ImageBase(BaseModel):
    filename: str
    filepath: str
    upload_date: datetime.datetime
    resolution: str
    image_size: int
    mimetype: Optional[str] = None


class ImageCreate(ImageBase):
    pass


class ImageUpdate(BaseModel):
    filepath: Optional[str] = None
    filename: Optional[str] = None
    resolution: Optional[str] = None
    image_size: Optional[int] = None
    mimetype: Optional[str] = None
    status: Optional[str] = None

# This is the main schema for reading an image, includes nested data
class Image(ImageBase):
    id: int
    details: Optional[Metadata] = None
    tags: List[Tag] = []
    albums: List[AlbumBase] = []
    is_favorite: bool = False
    status: str = "processing"
    phash: Optional[str] = None

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

    class Config:
        from_attributes = True

Album.model_rebuild()
