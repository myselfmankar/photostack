"""Integrity checks: real file type, exact duplicates, hidden trailing data, editors."""

from io import BytesIO

from PIL import Image

from photostack import integrity

from .conftest import make_jpeg


def test_real_type_ignores_extension():
    assert integrity.real_type(make_jpeg()[:16]) == "jpeg"
    buf = BytesIO()
    Image.new("RGB", (4, 4)).save(buf, "PNG")
    assert integrity.real_type(buf.getvalue()[:16]) == "png"
    assert integrity.real_type(b"MZ\x90\x00 an exe file") is None


def test_trailing_bytes():
    jpeg = make_jpeg()
    assert integrity.trailing_bytes(jpeg) == 0
    assert integrity.trailing_bytes(jpeg + b"secret message") == 14


def test_edited_with_only_names_known_editors():
    assert integrity.edited_with("Adobe Photoshop 25.0") == "Adobe Photoshop 25.0"
    assert integrity.edited_with("M336BUXXU5CXK1") is None  # phone firmware
    assert integrity.edited_with(None) is None


def test_upload_rejects_renamed_non_image(client):
    res = client.post("/api/v1/images", files={"file": ("evil.jpg", b"MZ\x90\x00" * 10)})
    assert res.status_code == 400


def test_upload_rejects_exact_copy_under_new_name(client, upload):
    data = make_jpeg(color=(33, 66, 99))
    upload("original.jpg", data)
    res = client.post("/api/v1/images", files={"file": ("copy.jpg", data, "image/jpeg")})
    assert res.status_code == 409
    assert "original.jpg" in res.json()["detail"]


def test_indexed_photo_reports_integrity(upload):
    img = upload("hidden.jpg", make_jpeg(color=(5, 50, 150)) + b"PK\x03\x04zip")
    assert img["trailing_bytes"] == 7
    assert len(img["sha256"]) == 64
    assert img["edited_with"] is None
