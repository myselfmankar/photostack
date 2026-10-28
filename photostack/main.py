"""FastAPI entry point: wires routers, static files, and the startup library scan."""

import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import indexer, storage
from .config import settings
from .database import Base, engine
from .routers import albums, batch, duplicates, filters, images, library, map, search

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


def is_blocked_in_demo(method: str, path: str) -> bool:
    """Uploading and deleting photos are the only actions a demo visitor can't do."""
    if method == "DELETE" and path.startswith("/api/v1/images/"):
        return True
    return method == "POST" and path in ("/api/v1/images", "/api/v1/batch/images/delete")


@app.middleware("http")
async def demo_guard(request: Request, call_next):
    if settings.DEMO_MODE and is_blocked_in_demo(request.method, request.url.path):
        return JSONResponse(
            status_code=403,
            content={"detail": "This is a read-only demo: uploads and deletes are off."},
        )
    return await call_next(request)


@app.get("/api/v1/config", tags=["config"])
def get_config() -> dict:
    """Settings the frontend needs to know about."""
    return {"demo_mode": settings.DEMO_MODE}


for module in (images, albums, map, library, filters, search, batch, duplicates):
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
