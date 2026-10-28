"""FastAPI entry point: wires routers, static files, and the startup library scan."""

import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import indexer, storage
from .database import Base, engine
from .routers import albums, batch, duplicates, filters, images, map, search, stats

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)
storage.ensure_dirs()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs in a thread so the API is usable while a large library is indexed.
    threading.Thread(target=indexer.scan_library, daemon=True).start()
    yield


app = FastAPI(title="PhotoStack", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

for module in (images, albums, map, stats, filters, search, batch, duplicates):
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
