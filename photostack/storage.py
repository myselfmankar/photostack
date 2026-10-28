"""Where image files live on disk and how the browser reaches them.

Layout (all under settings.UPLOADS_DIR, served at /uploads):
    <name>.<ext>              original file
    thumbnails/<stem>.webp    400px thumbnail for grids
    previews/<stem>.webp      1920px preview, only for formats browsers can't show (HEIC)

This is the only module that knows this layout.
"""

from pathlib import Path

from .config import settings

SUPPORTED_EXTENSIONS = (".png", ".jpg", ".jpeg", ".heic", ".heif")
NEEDS_PREVIEW = (".heic", ".heif")
URL_PREFIX = "/uploads"

ROOT = Path(settings.UPLOADS_DIR)
THUMBNAILS = ROOT / "thumbnails"
PREVIEWS = ROOT / "previews"


def ensure_dirs() -> None:
    for folder in (ROOT, THUMBNAILS, PREVIEWS):
        folder.mkdir(parents=True, exist_ok=True)


def safe_filename(raw: str | None) -> str | None:
    """The bare file name from an upload, or None if it isn't usable.

    Clients choose the name, so "../../etc/x.jpg" or a Windows path must never
    become a path outside the uploads folder.
    """
    name = (raw or "").replace("\\", "/").rsplit("/", 1)[-1]
    name = "".join(ch for ch in name if ch.isprintable()).strip()
    if not name or name.startswith(".") or len(name) > 200:
        return None
    return name


def unique_filename(name: str, taken) -> str:
    """name, or "name (2).ext", "name (3).ext", ... : the first one taken() says is free."""
    stem, ext = Path(name).stem, Path(name).suffix
    candidate, n = name, 1
    while taken(candidate):
        n += 1
        candidate = f"{stem} ({n}){ext}"
    return candidate


def is_supported(filename: str) -> bool:
    return filename.lower().endswith(SUPPORTED_EXTENSIONS)


def needs_preview(filename: str) -> bool:
    return filename.lower().endswith(NEEDS_PREVIEW)


def original_path(filename: str) -> Path:
    return ROOT / filename


def thumbnail_path(filename: str) -> Path:
    return THUMBNAILS / f"{Path(filename).stem}.webp"


def preview_path(filename: str) -> Path:
    return PREVIEWS / f"{Path(filename).stem}.webp"


def thumbnail_url(filename: str) -> str:
    return f"{URL_PREFIX}/thumbnails/{Path(filename).stem}.webp"


def display_url(filename: str) -> str:
    """Full-size URL the browser can render: the original, or the WebP preview for HEIC."""
    if needs_preview(filename):
        return f"{URL_PREFIX}/previews/{Path(filename).stem}.webp"
    return f"{URL_PREFIX}/{filename}"


def delete_files(filename: str) -> None:
    """Remove the original and every derived file. Missing files are fine."""
    for path in (original_path(filename), thumbnail_path(filename), preview_path(filename)):
        path.unlink(missing_ok=True)
