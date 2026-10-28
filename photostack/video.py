"""Videos: metadata with ffprobe, a thumbnail frame with ffmpeg.

ffmpeg is optional. Without it, videos are still stored, listed and playable;
they just have no thumbnail, duration, date or location.
"""

import datetime
import json
import logging
import re
import shutil
import subprocess
from functools import cache
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image as PILImage

logger = logging.getLogger(__name__)

# "+18.6096+073.8229/" or "+18.6096+073.8229+560.1/" (ISO 6709, used by phones)
_ISO6709 = re.compile(r"([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)")


@cache
def available() -> bool:
    found = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None
    if not found:
        logger.warning("ffmpeg not found: videos will have no thumbnails or metadata")
    return found


def _run(args: list[str]) -> bytes:
    return subprocess.run(args, capture_output=True, check=True, timeout=60).stdout


def _parse_time(value: str | None) -> datetime.datetime | None:
    if not value:
        return None
    try:
        # Stored as UTC ("2024-03-01T10:00:00.000000Z"); keep it naive like EXIF dates.
        return datetime.datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _rotation(stream: dict) -> int:
    for side in stream.get("side_data_list", []):
        if "rotation" in side:
            return int(side["rotation"])
    return int(stream.get("tags", {}).get("rotate", 0))


def probe(path: Path) -> dict[str, Any]:
    """Size, duration, date and GPS from the file's metadata."""
    info = json.loads(
        _run(
            [
                "ffprobe",
                "-v",
                "error",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                str(path),
            ]
        )
    )
    fmt = info.get("format", {})
    tags = {k.lower(): v for k, v in fmt.get("tags", {}).items()}
    stream = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    width, height = stream.get("width"), stream.get("height")
    if abs(_rotation(stream)) in (90, 270):  # phones record portrait as rotated landscape
        width, height = height, width

    location = tags.get("com.apple.quicktime.location.iso6709") or tags.get("location")
    gps = _ISO6709.match(location) if location else None
    duration = fmt.get("duration")

    return {
        "width": width,
        "height": height,
        "duration": round(float(duration), 2) if duration else None,
        "date_taken": _parse_time(
            tags.get("com.apple.quicktime.creationdate") or tags.get("creation_time")
        ),
        "camera_model": tags.get("com.apple.quicktime.model"),
        "latitude": float(gps.group(1)) if gps else None,
        "longitude": float(gps.group(2)) if gps else None,
    }


def frame(path: Path, at_seconds: float) -> PILImage.Image:
    """One decoded frame (ffmpeg applies the rotation for us)."""
    png = _run(
        ["ffmpeg", "-v", "error", "-ss", f"{at_seconds:.2f}", "-i", str(path),
         "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]
    )  # fmt: skip
    return PILImage.open(BytesIO(png))
