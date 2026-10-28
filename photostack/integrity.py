"""File integrity checks, adapted from a small image-forensics script.

- real_type():     what the file actually is, from its first bytes (not its extension)
- sha256():        exact content hash, so the same file is never stored twice
- trailing_bytes(): data hidden after the image's end marker
- edited_with():   editing software named in EXIF (Photoshop, Lightroom, ...)

Everything here reads bytes only; nothing needs extra libraries.
"""

import hashlib
from pathlib import Path

EDITORS = ("photoshop", "lightroom", "gimp", "affinity", "pixelmator", "snapseed", "picsart",
           "paint.net", "pixlr", "canva", "luminar", "capture one")  # fmt: skip

_HEIF_BRANDS = {b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"}


def real_type(head: bytes) -> str | None:
    """'jpeg' | 'png' | 'heif' from the file signature, or None if it's none of them."""
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[4:8] == b"ftyp" and head[8:12] in _HEIF_BRANDS:
        return "heif"
    return None


def extension_type(filename: str) -> str | None:
    ext = Path(filename).suffix.lower()
    return {".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".heic": "heif", ".heif": "heif"}.get(
        ext
    )


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def trailing_bytes(data: bytes) -> int:
    """Bytes after the end-of-image marker (JPEG FFD9 / PNG IEND). 0 for other formats.

    Some phones (e.g. Samsung) legitimately append data here; it's reported, not rejected.
    """
    kind = real_type(data[:16])
    if kind == "jpeg":
        end = data.rfind(b"\xff\xd9")
        return len(data) - (end + 2) if end != -1 else 0
    if kind == "png":
        end = data.rfind(b"IEND")
        return max(len(data) - (end + 8), 0) if end != -1 else 0  # 4-byte type + 4-byte CRC
    return 0


def edited_with(software: str | None) -> str | None:
    """The EXIF Software value, if it names a known photo editor."""
    if software and any(editor in software.lower() for editor in EDITORS):
        return software
    return None
