"""Download freely licensed demo photos from Wikimedia Commons into demo-photos/.

Only keeps photos whose original file has a capture date, a camera model and GPS
in its EXIF, so the demo's timeline, map and filters all have something to show.
Each photo is shrunk to 2048px (EXIF kept) and credited in ATTRIBUTION.md, which
CC BY / CC BY-SA licenses require.

    uv run python scripts/fetch_demo_photos.py            # ~30 photos, ~20 MB
    uv run python scripts/fetch_demo_photos.py --per-place 2

Uses the official MediaWiki API (no scraping), one request at a time.
"""

import argparse
import html
import re
import sys
import time
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia asks every client to identify itself: https://meta.wikimedia.org/wiki/User-Agent_policy
HEADERS = {"User-Agent": "PhotoStackDemo/1.0 (https://github.com/myselfmankar/photostack)"}
OUT = Path(__file__).resolve().parent.parent / "demo-photos"
MAX_SIDE = 2048
MAX_DOWNLOAD = 15 * 1024 * 1024
# Skip photos of people and events: a demo shouldn't feature real, identifiable people.
PEOPLE_WORDS = (
    "king",
    "queen",
    "prince",
    "princess",
    "daughter",
    "portrait",
    "people",
    "summit",
    "prize",
    "festival",
    "wedding",
    "crowd",
    "family",
    "selfie",
    "demonstrat",
    "wilma lippens",
)  # 1961 scans: children as subject, and the date is the scan date
# fmt: skip
# Excluded after looking at them: people are the subject (a protest).
EXCLUDED_TITLES = {"DutchGalgoDemonstratiedag.jpg"}
FREE_LICENSES = ("cc0", "public domain", "pd", "cc by")  # "cc by" also matches cc by-sa

# A spread of places so the map and month albums look like real trips. Chosen
# because Commons has enough photos there with date + camera + GPS in EXIF.
PLACES = {
    "pune": (18.5196, 73.8554),
    "goa": (15.5527, 73.7517),
    "mysore": (12.3052, 76.6552),
    "udaipur": (24.5760, 73.6830),
    "varanasi": (25.3109, 83.0107),
    "lisbon": (38.7097, -9.1364),
    "amsterdam": (52.3731, 4.8922),
    "reykjavik": (64.1466, -21.9426),
}


def strip_html(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def candidates(client: httpx.Client, lat: float, lon: float) -> list[dict]:
    """Photo files near a point, with their license and the EXIF Commons extracted."""
    params = {
        "action": "query",
        "format": "json",
        "generator": "geosearch",
        "ggscoord": f"{lat}|{lon}",
        "ggsradius": 10000,
        "ggsnamespace": 6,  # File: pages
        "ggslimit": 50,
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata|commonmetadata",
    }
    pages = client.get(API, params=params).json().get("query", {}).get("pages", {})
    return [p for p in pages.values() if p.get("imageinfo")]


def usable(page: dict) -> dict | None:
    """Credit details if the photo is free, a JPEG of sensible size, with date + camera + GPS."""
    info = page["imageinfo"][0]
    title = page["title"].removeprefix("File:")
    if title in EXCLUDED_TITLES or any(word in title.lower() for word in PEOPLE_WORDS):
        return None
    if info.get("mime") != "image/jpeg" or info.get("size", 0) > MAX_DOWNLOAD:
        return None
    if min(info.get("width", 0), info.get("height", 0)) < 1200:
        return None
    exif = {m["name"]: m["value"] for m in info.get("commonmetadata", [])}
    if not {"DateTimeOriginal", "Model", "GPSLatitude"} <= exif.keys():
        return None
    meta = {k: v.get("value", "") for k, v in info.get("extmetadata", {}).items()}
    license_name = strip_html(meta.get("LicenseShortName", ""))
    if not license_name.lower().startswith(FREE_LICENSES):
        return None
    return {
        "url": info["url"],
        "page": info["descriptionurl"],
        "title": page["title"].removeprefix("File:"),
        "author": strip_html(meta.get("Artist", "")) or "Unknown",
        "license": license_name,
    }


def save_shrunk(data: bytes, path: Path) -> None:
    """Resize to MAX_SIDE, keeping the original EXIF (date, camera, GPS) intact."""
    with Image.open(BytesIO(data)) as img:
        exif = img.info.get("exif", b"")
        img.thumbnail((MAX_SIDE, MAX_SIDE))
        img.save(path, "JPEG", quality=85, exif=exif)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # titles like "Castelo de São Jorge" on Windows
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--per-place", type=int, default=4)
    args = parser.parse_args()
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.jpg"):  # start fresh so names and credits always match
        old.unlink()

    credits = []
    with httpx.Client(headers=HEADERS, timeout=60, follow_redirects=True) as client:
        for place, (lat, lon) in PLACES.items():
            kept = 0
            for page in candidates(client, lat, lon):
                photo = usable(page)
                if not photo:
                    continue
                target = OUT / f"{place}-{kept + 1}.jpg"
                print(f"  {target.name}  <-  {photo['title']}  ({photo['license']})")
                save_shrunk(client.get(photo["url"]).content, target)
                credits.append((target.name, photo))
                kept += 1
                time.sleep(1)  # be gentle with Wikimedia's servers
                if kept == args.per_place:
                    break
            print(f"{place}: {kept} photos")
            time.sleep(1)

    lines = [
        "# Photo credits",
        "",
        "Demo photos from Wikimedia Commons, resized to 2048px. Licenses as listed.",
        "",
        "| File | Original | Author | License |",
        "|---|---|---|---|",
    ]
    for name, p in credits:
        link = f"[{p['title']}]({p['page']})"
        lines.append(f"| {name} | {link} | {p['author']} | {p['license']} |")
    (OUT / "ATTRIBUTION.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    size = sum(f.stat().st_size for f in OUT.glob("*.jpg"))
    print(
        f"\n{len(credits)} photos, {size / 1024 / 1024:.1f} MB, credits in {OUT / 'ATTRIBUTION.md'}"
    )


if __name__ == "__main__":
    main()
