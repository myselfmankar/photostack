"""Optional AI tagging: ask Gemini for a few descriptive tags per photo.

Off unless GEMINI_API_KEY is set and the `ai` extra is installed
(`uv sync --extra ai`). The rest of the app never depends on it: indexing
saves metadata first, and a tagging failure only means a photo has no tags.
"""

import logging
from functools import cache
from pathlib import Path

from ..config import settings

logger = logging.getLogger(__name__)

MODEL = "gemini-2.5-flash"
MAX_TAGS = 10
PROMPT = (
    "List up to 10 short tags describing this photo: objects, scene, activity, mood. "
    "Reply with a comma-separated list only, e.g. 'beach, sunset, people, warm light'."
)


@cache
def _client():
    """The Gemini client, or None when tagging is off. Created once, on first use."""
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai
    except ImportError:
        logger.warning("GEMINI_API_KEY is set but google-genai isn't installed: uv sync --extra ai")
        return None
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def is_enabled() -> bool:
    return _client() is not None


def parse_tags(text: str) -> list[str]:
    """'Beach, Sunset , ,people.' -> ['beach', 'sunset', 'people'] (deduplicated, capped)."""
    tags: list[str] = []
    for raw in text.replace("\n", ",").split(","):
        tag = raw.strip(" .'\"").lower()
        if tag and tag not in tags:
            tags.append(tag)
    return tags[:MAX_TAGS]


def suggest_tags(image_path: Path) -> list[str]:
    """Tags for an image (we send the small WebP thumbnail). Empty if off or on error."""
    client = _client()
    if client is None:
        return []
    from google.genai import types

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Part.from_bytes(data=image_path.read_bytes(), mime_type="image/webp"),
                PROMPT,
            ],
        )
        return parse_tags(response.text or "")
    except Exception as e:
        logger.warning("Tagging failed for %s: %s", image_path.name, e)
        return []
