"""Library health: counts, issues, the matching photo lists, and re-indexing."""

from .conftest import make_jpeg

CORRUPT_JPEG = b"\xff\xd8\xff\xe0" + b"not really a photo" * 10


def health(client):
    return client.get("/api/v1/library").json()


def with_issue(client, issue):
    images = client.get("/api/v1/images", params={"issue": issue, "limit": 500}).json()
    return {i["filename"] for i in images}


def test_counts_match_the_lists_they_link_to(client, upload):
    upload("undated.jpg", make_jpeg(color=(11, 22, 33)))
    upload("hidden_zip.jpg", make_jpeg(color=(44, 55, 66)) + b"PK\x03\x04")

    issues = health(client)["issues"]

    for issue, count in issues.items():
        assert count == len(with_issue(client, issue)), issue
    assert "undated.jpg" in with_issue(client, "no_date")
    assert "undated.jpg" in with_issue(client, "no_location")
    assert "hidden_zip.jpg" in with_issue(client, "flagged")


def test_failed_file_can_be_retried_after_fixing(client, workdir):
    res = client.post("/api/v1/images", files={"file": ("broken.jpg", CORRUPT_JPEG, "image/jpeg")})
    assert res.status_code == 201
    assert "broken.jpg" in with_issue(client, "failed")

    # The owner replaces the file on disk, then presses Retry.
    (workdir / "uploads" / "broken.jpg").write_bytes(make_jpeg(color=(77, 88, 99)))
    assert client.post("/api/v1/library/reindex", params={"issue": "failed"}).json()["queued"] >= 1

    assert "broken.jpg" not in with_issue(client, "failed")
    fixed = client.get(f"/api/v1/images/{res.json()['id']}").json()
    assert fixed["status"] == "completed"


def test_health_reports_storage_and_duplicates(client, upload):
    data = make_jpeg(color=(140, 30, 90))
    upload("dupe_a.jpg", data)
    upload("dupe_b.jpg", make_jpeg(color=(140, 30, 90), size=(128, 96)))  # same picture, bigger

    h = health(client)

    assert h["photos"] >= 2
    assert h["storage"]["originals"] > 0
    assert h["storage"]["thumbnails"] > 0
    assert h["duplicates"]["groups"] >= 1
    assert h["duplicates"]["wasted_bytes"] > 0


def test_reindex_rejects_unknown_issue(client):
    assert client.post("/api/v1/library/reindex", params={"issue": "no_date"}).status_code == 422
