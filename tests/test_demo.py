"""Demo mode: fully read-only, with example albums created once."""

import json

import pytest

from .conftest import make_jpeg


@pytest.fixture
def demo(monkeypatch, workdir):
    from photostack.config import settings

    monkeypatch.setattr(settings, "DEMO_MODE", True)


def test_config_reports_demo(client, demo):
    assert client.get("/api/v1/config").json() == {"demo_mode": True}


@pytest.fixture
def photo(upload):
    return upload("demo_photo.jpg", make_jpeg(color=(90, 20, 160)))


def test_every_change_is_refused(client, photo, demo):
    pid = photo["id"]
    files = {"file": ("new.jpg", make_jpeg(color=(70, 70, 70)), "image/jpeg")}
    attempts = [
        client.post("/api/v1/images", files=files),
        client.delete(f"/api/v1/images/{pid}"),
        client.post(f"/api/v1/images/{pid}/favorite"),
        client.post("/api/v1/batch/images/favorite", json=[pid]),
        client.post("/api/v1/batch/images/delete", json=[pid]),
        client.post("/api/v1/albums", json={"name": "Spam"}),
        client.post("/api/v1/library/reindex", params={"issue": "failed"}),
    ]
    assert [r.status_code for r in attempts] == [403] * len(attempts)
    assert client.get(f"/api/v1/images/{pid}").json()["is_favorite"] is False


def test_reading_still_works(client, photo, demo):
    for url in ("/api/v1/images", "/api/v1/albums", "/api/v1/map/data", "/api/v1/library",
                "/api/v1/search?q=demo", f"/api/v1/images/{photo['id']}"):  # fmt: skip
        assert client.get(url).status_code == 200, url


def test_example_albums_are_created_once(client, photo, demo, tmp_path):
    from photostack import demo as demo_setup
    from photostack.database import SessionLocal

    albums_file = tmp_path / "albums.json"
    albums_file.write_text(json.dumps({"Demo trip": ["demo_photo.jpg", "missing.jpg"]}))

    with SessionLocal() as db:
        db.query(demo_setup.models.Album).delete()  # start from "no albums yet"
        db.commit()
        demo_setup.seed_albums(db, albums_file)
        demo_setup.seed_albums(db, albums_file)  # second run: albums exist, nothing added

    albums = client.get("/api/v1/albums").json()
    assert [(a["name"], a["image_count"]) for a in albums] == [("Demo trip", 1)]
