"""FastAPI entry point: wires routers, static files, and the startup library scan."""

import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import crud, storage
from .database import Base, SessionLocal, engine
from .routers import albums, batch, duplicates, filters, images, map, search, stats, suggestions
from .services import geocoding, image_processing

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)
storage.ensure_dirs()


def scan_library() -> None:
    """Index files dropped into the uploads folder, retry failed ones, then geocode."""
    db = SessionLocal()
    try:
        for path in sorted(storage.ROOT.iterdir()):
            if not path.is_file() or not storage.is_supported(path.name):
                continue
            existing = crud.get_image_by_filename(db, filename=path.name)
            if existing and existing.status == "completed":
                continue
            if existing:
                crud.update_image_status(db, image_id=existing.id, status="processing")
                image_id = existing.id
            else:
                image_id = crud.create_placeholder_image(db, path.name, str(path)).id
            logger.info("Indexing %s", path.name)
            image_processing.process_and_save_image_metadata_sync(str(path), image_id, db)
        geocoding.reverse_geocode_missing_addresses(db)
        logger.info("Library scan finished")
    except Exception:
        logger.exception("Library scan failed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs in a thread so the API is usable while a large library is indexed.
    threading.Thread(target=scan_library, daemon=True).start()
    yield


app = FastAPI(title="PhotoStack", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

for module in (images, albums, map, stats, suggestions, filters, search, batch, duplicates):
    app.include_router(module.router)

app.mount(storage.URL_PREFIX, StaticFiles(directory=storage.ROOT), name="uploads")

# In production the built React app is served from here too (one process, one port).
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path.startswith(("api/", "uploads/")):
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(FRONTEND_DIR / "index.html")
