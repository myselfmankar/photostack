"""Characterization tests: they pin down what the API does *today*, so the
restructure can't silently change behavior. Known bugs are marked xfail(strict),
so fixing one makes its test fail until the marker is removed.
"""

import os

import pytest

from .conftest import make_jpeg


@pytest.fixture(scope="module")
def library(upload):
    """A small library: one fully tagged photo, one plain, one exact duplicate."""
    geo = upload(
        "geo.jpg",
        make_jpeg(camera="TestCam", taken="2024:05:01 10:00:00", gps=(18, 73)),
    )
    plain = upload("plain.jpg", make_jpeg(color=(10, 200, 10)))
    dup = upload("geo_copy.jpg", make_jpeg(camera="TestCam", taken="2024:05:01 10:00:00"))
    return {"geo": geo, "plain": plain, "dup": dup}


def test_upload_extracts_metadata(library):
    img = library["geo"]
    assert img["status"] == "completed"
    assert img["resolution"] == "64x48"
    assert img["details"]["camera_model"] == "TestCam"
    assert img["details"]["date_taken"].startswith("2024-05-01")
    loc = img["details"]["location"]
    assert loc["latitude"] == pytest.approx(18)
    assert loc["longitude"] == pytest.approx(73)
    assert img["thumbnail_url"] == "/uploads/thumbnails/geo.webp"
    assert os.path.exists("uploads/thumbnails/geo.webp")


def test_upload_rejects_unsupported_type(client):
    res = client.post("/api/v1/images", files={"file": ("doc.txt", b"hi", "text/plain")})
    assert res.status_code == 400


def test_reupload_returns_existing(client, library):
    res = client.post("/api/v1/images", files={"file": ("geo.jpg", make_jpeg(), "image/jpeg")})
    assert res.json()["id"] == library["geo"]["id"]


def test_list_and_filter(client, library):
    names = {i["filename"] for i in client.get("/api/v1/images").json()}
    assert {"geo.jpg", "plain.jpg", "geo_copy.jpg"} <= names

    by_cam = client.get("/api/v1/images", params={"camera_model": "testcam"}).json()
    assert {i["filename"] for i in by_cam} == {"geo.jpg", "geo_copy.jpg"}

    by_date = client.get("/api/v1/images", params={"date": "2024-05"}).json()
    assert {i["filename"] for i in by_date} == {"geo.jpg", "geo_copy.jpg"}


def test_filter_options(client, library):
    assert "TestCam" in client.get("/api/v1/filters/cameras").json()
    assert "2024-05" in client.get("/api/v1/filters/dates").json()


def test_favorite_toggle(client, library):
    img_id = library["plain"]["id"]
    assert client.post(f"/api/v1/images/{img_id}/favorite").json()["is_favorite"] is True
    favs = client.get("/api/v1/images", params={"is_favorite": True}).json()
    assert [i["id"] for i in favs] == [img_id]
    assert client.post(f"/api/v1/images/{img_id}/favorite").json()["is_favorite"] is False


@pytest.mark.xfail(strict=True, reason="bug: router calls missing crud.get_image_urls")
def test_batch_favorite(client, library):
    res = client.post("/api/v1/batch/images/favorite", json=[library["plain"]["id"]])
    assert res.status_code == 200


def test_duplicates(client, library):
    groups = client.get("/api/v1/duplicates").json()
    assert any({i["filename"] for i in g} == {"geo.jpg", "geo_copy.jpg"} for g in groups)


def test_month_albums(client, library):
    summary = client.get("/api/v1/albums/summary").json()
    may = next(a for a in summary if a["year"] == 2024 and a["month"] == 5)
    assert may["image_count"] == 2
    month = client.get("/api/v1/albums/2024/5").json()
    assert {i["filename"] for i in month} == {"geo.jpg", "geo_copy.jpg"}


def test_custom_album(client, library):
    album = client.post("/api/v1/albums/", json={"name": "Trip"}).json()
    res = client.post(f"/api/v1/albums/{album['id']}/images", json=[library["geo"]["id"]])
    assert [i["id"] for i in res.json()["images"]] == [library["geo"]["id"]]


def test_map_and_stats(client, library):
    points = client.get("/api/v1/map/data").json()
    assert [p["filename"] for p in points] == ["geo.jpg"]
    stats = client.get("/api/v1/dashboard-stats").json()
    assert stats["total_images"] >= 3


def test_search_without_ai_key_does_not_crash(client, library):
    assert client.post("/api/v1/search/ai", json={"query": "beach"}).status_code == 200


def test_delete_removes_row_and_files(client, upload):
    img = upload("temp.jpg", make_jpeg(color=(1, 2, 3)))
    assert client.delete(f"/api/v1/images/{img['id']}").status_code == 204
    assert client.get(f"/api/v1/images/{img['id']}").status_code == 404
    assert not os.path.exists("uploads/temp.jpg")
    assert not os.path.exists("uploads/thumbnails/temp.webp")
