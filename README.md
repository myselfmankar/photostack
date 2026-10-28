# PhotoStack

A self-hosted photo library. Drop in your photos and PhotoStack reads when and
where they were taken, builds a timeline, groups them into albums, puts them on
a map, and finds duplicates. Think a small, understandable Google Photos you run
yourself.

**[Website](https://myselfmankar.github.io/photostack/) · [Live demo](https://photostack.myselfmankar.workers.dev)** (read-only, sample photos)

![PhotoStack timeline](docs/screenshots/timeline.webp)

## Features

- **Timeline**: every photo, grouped by day, keeping its real shape (portrait stays portrait)
- **Reads your photos**: date, camera, lens, exposure and GPS from EXIF; iPhone HEIC included
- **Videos**: MP4, MOV and WebM with thumbnails, duration, date and place (needs ffmpeg; included in the Docker image)
- **Albums**: your own albums, plus automatic month albums
- **Map**: photos on a map as thumbnails, with street addresses (OpenStreetMap)
- **Search**: by place, camera, tag or file name
- **Duplicates**: finds copies even when resized or re-saved, keeps the original
- **Integrity checks**: real file type, SHA-256, signs of editing, data hidden after the image
- **Library health**: what needs fixing (unreadable files, no date, no location, duplicates), with a retry button
- **Light and dark mode**, works on phones
- **Optional AI tags**: off by default; with a Gemini key, photos get descriptive tags

## Run it

**Docker** (simplest):

```bash
docker compose up --build
```

Open http://localhost:8000. Photos and the database live in the `photostack_data` volume.

**For development** (needs [uv](https://docs.astral.sh/uv/), Node 20+, and optionally [ffmpeg](https://ffmpeg.org/download.html) for video thumbnails):

```bash
uv sync
npm --prefix frontend install
npm --prefix frontend run build
uv run uvicorn photostack.main:app --reload
```

You can also copy photos straight into `uploads/`; they're indexed at startup.

### Settings

All optional, via environment variables or a `.env` file (see `.env.example`):

| Variable | Default | What it does |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./photostack.db` | Any SQLAlchemy URL; Postgres needs `uv sync --extra postgres` |
| `UPLOADS_DIR` | `uploads` | Where photos, thumbnails and previews are stored |
| `GEOCODING_ENABLED` | `true` | Look up street addresses for GPS positions |
| `GEMINI_API_KEY` | unset | Turns on AI tagging (needs `uv sync --extra ai`). Sends 400px thumbnails to Google |
| `DEMO_MODE` | `false` | Public demo: fully read-only, with example albums from `demo-photos/albums.json` |

## How it works

FastAPI backend, React frontend, SQLite by default. Uploads return immediately;
a background task reads EXIF, makes WebP thumbnails, fingerprints the image for
duplicate detection, and then (optionally) geocodes and tags it.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the data model, the
upload flow, and why each design decision was made.

```
photostack/   backend: routers → crud → models; indexer, integrity, storage
frontend/     React + TypeScript + Tailwind
tests/        pytest, runs offline against SQLite
```

## Development

```bash
uv run pytest                          # backend tests
uv run ruff check && uv run ruff format --check
npm --prefix frontend run typecheck
```

## Deploying the demo

The public demo runs on [Cloudflare Containers](https://developers.cloudflare.com/containers/)
with `DEMO_MODE=true` (read-only; Workers Paid plan). With Docker running:

```bash
cd deploy/cloudflare
npm install
npx wrangler deploy
```

The container's disk is reset whenever it sleeps; that's fine for the demo, which
re-seeds `demo-photos/` and re-indexes in about 5 seconds on each start.

The project website is `docs/index.html`, published with GitHub Pages
(Settings → Pages → Deploy from branch `main`, folder `/docs`).

## License

MIT
