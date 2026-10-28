"""Test setup: every test session runs in a throwaway folder with its own SQLite DB.

The app uses paths relative to the working directory (``uploads/``), so we chdir
into a temp dir *before* importing it. No Gemini key is set, so AI features are off.
"""

import os
import sys
from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def workdir(tmp_path_factory) -> Path:
    path = tmp_path_factory.mktemp("photostack")
    os.chdir(path)
    os.environ["DATABASE_URL"] = f"sqlite:///{path / 'test.db'}"
    os.environ.pop("GEMINI_API_KEY", None)
    os.environ["GEOCODING_ENABLED"] = "false"  # no network calls in tests
    sys.path.insert(0, str(REPO_ROOT))
    return path


@pytest.fixture(scope="session")
def client(workdir):
    from fastapi.testclient import TestClient

    from api.main import app

    # Not used as a context manager on purpose: that would run the startup
    # scan thread (and network geocoding). Background tasks still run.
    return TestClient(app)


def make_jpeg(color=(200, 50, 50), size=(64, 48), *, camera=None, taken=None, gps=None) -> bytes:
    """Build a small JPEG in memory, optionally with EXIF camera/date/GPS."""
    # A colour-dependent gradient, so different colours give different
    # fingerprints (flat images would all hash the same).
    img = Image.new("RGB", size)
    r, g, b = color
    img.putdata(
        [
            ((r + x * 4) % 256, (g + y * 5) % 256, (b + (x * y) % 97) % 256)
            for y in range(size[1])
            for x in range(size[0])
        ]
    )
    exif = Image.Exif()
    if camera:
        exif[0x0110] = camera  # Model
    if taken:
        exif.get_ifd(0x8769)[0x9003] = taken  # DateTimeOriginal
    if gps:
        lat, lon = gps
        exif.get_ifd(0x8825).update(
            {1: "N", 2: (float(lat), 0.0, 0.0), 3: "E", 4: (float(lon), 0.0, 0.0)}
        )
    buf = BytesIO()
    img.save(buf, "JPEG", exif=exif.tobytes())
    return buf.getvalue()


@pytest.fixture(scope="session")
def upload(client):
    def _upload(name: str, data: bytes) -> dict:
        res = client.post("/api/v1/images", files={"file": (name, data, "image/jpeg")})
        assert res.status_code in (200, 201), res.text
        # Background processing has run by the time TestClient returns.
        return client.get(f"/api/v1/images/{res.json()['id']}").json()

    return _upload
