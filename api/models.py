import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from .database import Base

# Association table for the many-to-many relationship between Image and Tag
image_tag_association = Table(
    "image_tag_association",
    Base.metadata,
    Column("image_id", Integer, ForeignKey("images.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)

# Association table for the many-to-many relationship between Image and Album
image_album_association = Table(
    "image_album_association",
    Base.metadata,
    Column("image_id", Integer, ForeignKey("images.id"), primary_key=True),
    Column("album_id", Integer, ForeignKey("albums.id"), primary_key=True),
)


class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, unique=True)
    filepath = Column(String)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    resolution = Column(String)  # e.g., "1920x1080"
    image_size = Column(Integer)  # in bytes
    mimetype = Column(String, nullable=True)
    status = Column(String, default="processing")  # processing, completed, failed
    is_favorite = Column(Boolean, default=False)
    phash = Column(String, nullable=True, index=True)

    # One-to-one relationship to Metadata
    details = relationship(
        "Metadata", back_populates="image", uselist=False, cascade="all, delete-orphan"
    )
    # Many-to-many relationship to Tag
    tags = relationship("Tag", secondary=image_tag_association, back_populates="images")
    # Many-to-many relationship to Album
    albums = relationship("Album", secondary=image_album_association, back_populates="images")


class Album(Base):
    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)

    images = relationship("Image", secondary=image_album_association, back_populates="albums")


class Metadata(Base):
    __tablename__ = "metadata"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    camera_model = Column(String, nullable=True)
    date_taken = Column(DateTime, nullable=True)
    f_number = Column(Float, nullable=True)
    exposure_time = Column(String, nullable=True)
    iso = Column(Integer, nullable=True)
    focal_length = Column(String, nullable=True)
    lens_model = Column(String, nullable=True)
    raw_exif = Column(JSON, nullable=True)  # Store all raw EXIF here

    # One-to-one relationship to Image
    image = relationship("Image", back_populates="details")
    # One-to-one relationship to Location
    location = relationship(
        "Location", back_populates="details_ref", uselist=False, cascade="all, delete-orphan"
    )


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    metadata_id = Column(Integer, ForeignKey("metadata.id"), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String, nullable=True)

    details_ref = relationship("Metadata", back_populates="location")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    images = relationship("Image", secondary=image_tag_association, back_populates="tags")
