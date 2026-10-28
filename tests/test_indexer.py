"""read_image() is a pure function: a file goes in, the fields we store come out."""

from io import BytesIO

import pytest
from PIL import Image

from .conftest import make_jpeg


@pytest.fixture
def read(workdir, tmp_path):
    from photostack.indexer import read_image

    def _read(data: bytes, name="photo.jpg"):
        path = tmp_path / name
        path.write_bytes(data)
        return read_image(path)

    return _read


def test_missing_exif_is_none_not_placeholder_text(read):
    fields = read(make_jpeg())
    for key in ("camera_model", "lens_model", "exposure_time", "focal_length", "date_taken"):
        assert fields[key] is None, key  # used to be "Unknown" / "None" strings


def test_gps_south_and_west_are_negative(read):
    img = Image.new("RGB", (8, 8))
    exif = Image.Exif()
    exif.get_ifd(0x8825).update({1: "S", 2: (33.0, 52.0, 0.0), 3: "W", 4: (151.0, 12.0, 0.0)})
    buf = BytesIO()
    img.save(buf, "JPEG", exif=exif.tobytes())

    fields = read(buf.getvalue())

    assert fields["latitude"] == pytest.approx(-33.8667, abs=1e-3)
    assert fields["longitude"] == pytest.approx(-151.2, abs=1e-3)


def test_rotated_phone_photo_reports_upright_size(read):
    img = Image.new("RGB", (60, 40))  # stored landscape...
    exif = Image.Exif()
    exif[0x0112] = 6  # ...with an "rotate 90°" orientation flag, like phone portraits
    buf = BytesIO()
    img.save(buf, "JPEG", exif=exif.tobytes())

    fields = read(buf.getvalue())

    assert (fields["width"], fields["height"]) == (40, 60)


def test_same_picture_same_fingerprint_even_resized(read):
    original = make_jpeg(color=(10, 120, 200), size=(64, 48))
    big = Image.open(BytesIO(original)).resize((128, 96))
    buf = BytesIO()
    big.save(buf, "JPEG", quality=70)

    assert read(original)["fingerprint"] == read(buf.getvalue(), "big.jpg")["fingerprint"]
    assert read(original)["fingerprint"] != read(make_jpeg(color=(200, 10, 10)))["fingerprint"]


def test_shutter_speed_is_human_readable():
    from photostack.indexer import _shutter

    assert _shutter(137969 / 250000000) == "1/1812 s"
    assert _shutter(2.0) == "2 s"
    assert _shutter(None) is None
