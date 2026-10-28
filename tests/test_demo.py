"""Demo mode blocks uploads and deletes, and nothing else."""

import pytest

from .conftest import make_jpeg


@pytest.fixture
def demo(monkeypatch, workdir):
    from photostack.config import settings

    monkeypatch.setattr(settings, "DEMO_MODE", True)


def test_config_reports_demo(client, demo):
    assert client.get("/api/v1/config").json() == {"demo_mode": True}


def test_upload_and_delete_blocked(client, upload, demo):
    files = {"file": ("demo.jpg", make_jpeg(color=(70, 70, 70)), "image/jpeg")}
    assert client.post("/api/v1/images", files=files).status_code == 403
    assert client.delete("/api/v1/images/1").status_code == 403
    assert client.post("/api/v1/batch/images/delete", json=[1]).status_code == 403


def test_browsing_favorites_and_albums_still_work(client, upload, monkeypatch, workdir):
    img = upload("demo_ok.jpg", make_jpeg(color=(90, 20, 160)))
    from photostack.config import settings

    monkeypatch.setattr(settings, "DEMO_MODE", True)
    assert client.get("/api/v1/images").status_code == 200
    assert client.post(f"/api/v1/images/{img['id']}/favorite").status_code == 200
    album = client.post("/api/v1/albums", json={"name": "Demo"})
    assert album.status_code == 201
    assert (
        client.post(f"/api/v1/albums/{album.json()['id']}/images", json=[img["id"]]).status_code
        == 200
    )
