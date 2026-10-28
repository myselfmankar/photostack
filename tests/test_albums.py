"""Custom albums: create, list, rename, add/remove photos, delete."""

import pytest

from .conftest import make_jpeg

API = "/api/v1/albums"


@pytest.fixture(scope="module")
def photos(upload):
    early = upload("album_a.jpg", make_jpeg(color=(1, 60, 120), taken="2023:01:01 09:00:00"))
    late = upload("album_b.jpg", make_jpeg(color=(120, 60, 1), taken="2023:06:01 09:00:00"))
    return early, late


@pytest.fixture
def album(client):
    created = client.post(API, json={"name": "  Goa trip  ", "description": "Dec 2023"}).json()
    yield created
    client.delete(f"{API}/{created['id']}")


def test_create_trims_name_and_starts_empty(album):
    assert album["name"] == "Goa trip"
    assert album["images"] == []


@pytest.mark.parametrize("name", ["", "   ", "x" * 101])
def test_rejects_bad_names(client, name):
    assert client.post(API, json={"name": name}).status_code == 422


def test_add_photos_in_date_order_without_duplicates(client, album, photos):
    early, late = photos
    url = f"{API}/{album['id']}/images"
    client.post(url, json=[late["id"]])
    res = client.post(url, json=[early["id"], late["id"], 999_999])  # dup + unknown id

    assert [i["filename"] for i in res.json()["images"]] == ["album_a.jpg", "album_b.jpg"]


def test_list_shows_count_and_cover(client, album, photos):
    client.post(f"{API}/{album['id']}/images", json=[p["id"] for p in photos])

    listed = next(a for a in client.get(API).json() if a["id"] == album["id"])

    assert listed["image_count"] == 2
    assert listed["cover_url"] == "/uploads/thumbnails/album_a.webp"


def test_photo_lists_its_albums(client, album, photos):
    client.post(f"{API}/{album['id']}/images", json=[photos[0]["id"]])
    image = client.get(f"/api/v1/images/{photos[0]['id']}").json()
    assert album["id"] in [a["id"] for a in image["albums"]]


def test_rename_only_changes_sent_fields(client, album):
    res = client.patch(f"{API}/{album['id']}", json={"name": "Goa 2023"})
    assert res.json()["name"] == "Goa 2023"
    assert res.json()["description"] == "Dec 2023"


def test_remove_photo_keeps_it_in_library(client, album, photos):
    early, _ = photos
    client.post(f"{API}/{album['id']}/images", json=[early["id"]])

    res = client.post(f"{API}/{album['id']}/images/remove", json=[early["id"]])

    assert res.json()["images"] == []
    assert client.get(f"/api/v1/images/{early['id']}").status_code == 200


def test_delete_album_keeps_photos(client, photos):
    temp = client.post(API, json={"name": "Temp"}).json()
    client.post(f"{API}/{temp['id']}/images", json=[photos[0]["id"]])

    assert client.delete(f"{API}/{temp['id']}").status_code == 204
    assert client.get(f"{API}/{temp['id']}").status_code == 404
    assert client.get(f"/api/v1/images/{photos[0]['id']}").status_code == 200


def test_deleting_photo_removes_it_from_albums(client, album, upload):
    photo = upload("album_gone.jpg", make_jpeg(color=(7, 7, 200)))
    client.post(f"{API}/{album['id']}/images", json=[photo["id"]])

    client.delete(f"/api/v1/images/{photo['id']}")

    assert client.get(f"{API}/{album['id']}").json()["images"] == []


def test_unknown_album_is_404(client):
    assert client.get(f"{API}/999999").status_code == 404
    assert client.patch(f"{API}/999999", json={"name": "x"}).status_code == 404
