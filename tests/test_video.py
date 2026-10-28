"""Videos: metadata and thumbnail with ffmpeg, and graceful behaviour without it."""

import shutil
import subprocess

import pytest

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


def make_video(path, *, seconds=2, size="320x240", taken=None, gps=None, color="testsrc") -> bytes:
    """A tiny H.264 MP4, optionally with a creation date and ISO 6709 location."""
    args = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"{color}=size={size}:rate=10",
            "-t", str(seconds), "-pix_fmt", "yuv420p"]  # fmt: skip
    if taken:
        args += ["-metadata", f"creation_time={taken}"]
    if gps:
        args += ["-metadata", f"location={gps}"]
    subprocess.run([*args, str(path)], check=True)
    return path.read_bytes()


def upload_video(client, name, data):
    res = client.post("/api/v1/images", files={"file": (name, data, "video/mp4")})
    assert res.status_code == 201, res.text
    assert res.json()["media_type"] == "video"  # known before indexing finishes
    return client.get(f"/api/v1/images/{res.json()['id']}").json()


@needs_ffmpeg
def test_video_is_indexed_with_metadata_and_thumbnail(client, tmp_path, workdir):
    data = make_video(tmp_path / "trip.mp4", taken="2024-03-01T10:00:00Z", gps="+18.6096+073.8229/")

    video = upload_video(client, "trip.mp4", data)

    assert video["status"] == "completed"
    assert video["media_type"] == "video"
    assert (video["width"], video["height"]) == (320, 240)
    assert video["duration"] == pytest.approx(2, abs=0.2)
    assert video["date_taken"].startswith("2024-03-01T10:00")
    assert video["latitude"] == pytest.approx(18.6096)
    assert video["longitude"] == pytest.approx(73.8229)
    assert video["full_url"] == "/uploads/trip.mp4"  # played as-is, not converted
    assert (workdir / "uploads" / "thumbnails" / "trip.webp").exists()


@needs_ffmpeg
def test_video_shows_on_map_and_in_month_album(client, tmp_path):
    data = make_video(
        tmp_path / "goa.mp4",
        taken="2023-12-24T18:00:00Z",
        gps="+15.5000+073.8000/",
        color="smptebars",
    )
    video = upload_video(client, "goa.mp4", data)

    assert video["id"] in [m["id"] for m in client.get("/api/v1/map/data").json()]
    month = client.get("/api/v1/albums/months/2023/12").json()
    assert video["id"] in [i["id"] for i in month]


def test_without_ffmpeg_video_is_still_stored(client, monkeypatch, tmp_path):
    from photostack import video as video_module

    monkeypatch.setattr(video_module, "available", lambda: False)
    # A valid-looking MP4 header is enough: without ffmpeg nothing decodes it.
    data = b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2" + b"\x00" * 64

    video = upload_video(client, "clip.mp4", data)

    assert video["status"] == "completed"
    assert video["media_type"] == "video"
    assert video["duration"] is None
    assert len(video["sha256"]) == 64


def test_video_extension_must_match_contents(client):
    res = client.post("/api/v1/images", files={"file": ("fake.mp4", b"\xff\xd8\xff" + b"0" * 32)})
    assert res.status_code == 400
