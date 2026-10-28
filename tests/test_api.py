"""Characterization tests: they pin down what the API does *today*, so the
restructure can't silently change behavior.
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
    assert (img["width"], img["height"]) == (64, 48)
    assert img["camera_model"] == "TestCam"
    assert img["date_taken"].startswith("2024-05-01")
    assert img["latitude"] == pytest.approx(18)
    assert img["longitude"] == pytest.approx(73)
    assert img["thumbnail_url"] == "/uploads/thumbnails/geo.webp"
    assert os.path.exists("uploads/thumbnails/geo.webp")


def test_upload_rejects_unsupported_type(client):
    res = client.post("/api/v1/images", files={"file": ("doc.txt", b"hi", "text/plain")})
    assert res.status_code == 400


def test_same_file_again_returns_existing(client, library):
    data = make_jpeg(camera="TestCam", taken="2024:05:01 10:00:00", gps=(18, 73))
    res = client.post("/api/v1/images", files={"file": ("geo.jpg", data, "image/jpeg")})
    assert res.json()["id"] == library["geo"]["id"]


def test_different_photo_with_same_name_is_kept(client, library):
    other = make_jpeg(color=(250, 250, 10))  # a different photo, also called geo.jpg
    res = client.post("/api/v1/images", files={"file": ("geo.jpg", other, "image/jpeg")})
    assert res.status_code == 201
    assert res.json()["filename"] == "geo (2).jpg"
    assert res.json()["id"] != library["geo"]["id"]
    client.delete(f"/api/v1/images/{res.json()['id']}")


@pytest.mark.parametrize(
    "name", ["../../evil.jpg", "..\..\evil.jpg", "/etc/evil.jpg", "C:\Windows\evil.jpg"]
)
def test_upload_cannot_escape_uploads_folder(client, name, workdir):
    data = make_jpeg(color=(1, 99, 1))
    res = client.post("/api/v1/images", files={"file": (name, data, "image/jpeg")})
    assert res.json()["filename"] == "evil.jpg"  # only the bare name is used
    assert (workdir / "uploads" / "evil.jpg").exists()
    assert not (workdir.parent / "evil.jpg").exists()
    client.delete(f"/api/v1/images/{res.json()['id']}")


@pytest.mark.parametrize("name", ["", ".hidden.jpg", "../", "x" * 300 + ".jpg"])
def test_upload_rejects_unusable_names(client, name):
    res = client.post("/api/v1/images", files={"file": (name, make_jpeg(), "image/jpeg")})
    assert res.status_code in (400, 422)


def test_list_and_filter(client, library):
    names = {i["filename"] for i in client.get("/api/v1/images").json()}
    assert {"geo.jpg", "plain.jpg", "geo_copy.jpg"} <= names

    by_cam = client.get("/api/v1/images", params={"camera_model": "testcam"}).json()
    assert {i["filename"] for i in by_cam} == {"geo.jpg", "geo_copy.jpg"}

    by_date = client.get("/api/v1/images", params={"date": "2024-05"}).json()
    assert {i["filename"] for i in by_date} == {"geo.jpg", "geo_copy.jpg"}


def test_sort_options(client, library):
    def order(sort_by):
        imgs = client.get("/api/v1/images", params={"sort_by": sort_by, "limit": 100}).json()
        return [i["filename"] for i in imgs if i["filename"] in {"geo.jpg", "plain.jpg"}]

    assert order("upload_date") == ["plain.jpg", "geo.jpg"]  # newest upload first
    assert order("upload_date_asc") == ["geo.jpg", "plain.jpg"]
    assert order("filename") == ["geo.jpg", "plain.jpg"]
    assert order("date_taken_asc")[0] == "geo.jpg"  # only geo.jpg has a date taken


def test_filter_options(client, library):
    assert "TestCam" in client.get("/api/v1/filters/cameras").json()
    assert "2024-05" in client.get("/api/v1/filters/dates").json()


def test_favorite_toggle(client, library):
    img_id = library["plain"]["id"]
    assert client.post(f"/api/v1/images/{img_id}/favorite").json()["is_favorite"] is True
    favs = client.get("/api/v1/images", params={"is_favorite": True}).json()
    assert [i["id"] for i in favs] == [img_id]
    assert client.post(f"/api/v1/images/{img_id}/favorite").json()["is_favorite"] is False


def test_batch_favorite(client, library):
    ids = [library["plain"]["id"]]
    res = client.post("/api/v1/batch/images/favorite", json=ids)
    assert res.status_code == 200
    assert res.json()[0]["is_favorite"] is True
    client.post("/api/v1/batch/images/favorite", json=ids)  # toggle back


def test_batch_delete(client, upload):
    img = upload("batch_temp.jpg", make_jpeg(color=(9, 9, 9)))
    res = client.post("/api/v1/batch/images/delete", json=[img["id"]])
    assert res.status_code == 204
    assert not os.path.exists("uploads/batch_temp.jpg")


def test_duplicates(client, library):
    groups = client.get("/api/v1/duplicates").json()
    assert any({i["filename"] for i in g} == {"geo.jpg", "geo_copy.jpg"} for g in groups)


def test_month_albums(client, library):
    summary = client.get("/api/v1/albums/months").json()
    may = next(a for a in summary if a["year"] == 2024 and a["month"] == 5)
    assert may["image_count"] == 2
    month = client.get("/api/v1/albums/months/2024/5").json()
    assert {i["filename"] for i in month} == {"geo.jpg", "geo_copy.jpg"}


def test_map_and_stats(client, library):
    points = client.get("/api/v1/map/data").json()
    assert [p["filename"] for p in points] == ["geo.jpg"]
    stats = client.get("/api/v1/dashboard-stats").json()
    assert stats["total_images"] >= 3


def test_search(client, library):
    def found(q):
        return {i["filename"] for i in client.get("/api/v1/search", params={"q": q}).json()}

    assert found("testcam") == {"geo.jpg", "geo_copy.jpg"}
    assert found("photos of plain") == {"plain.jpg"}  # stop words ignored
    assert found("testcam plain") == set()  # every word must match
    assert found("the") == set()


def test_delete_removes_row_and_files(client, upload):
    img = upload("temp.jpg", make_jpeg(color=(1, 2, 3)))
    assert client.delete(f"/api/v1/images/{img['id']}").status_code == 204
    assert client.get(f"/api/v1/images/{img['id']}").status_code == 404
    assert not os.path.exists("uploads/temp.jpg")
    assert not os.path.exists("uploads/thumbnails/temp.webp")
