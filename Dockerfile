# One image, one process: FastAPI serves both the API and the built React app.

# --- Stage 1: build the frontend -------------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python runtime -----------------------------------------------------
FROM python:3.12-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /bin/uv

# ffmpeg gives videos thumbnails, duration, date and GPS (~80 MB).
# Build with --build-arg WITH_FFMPEG=false to leave it out; videos still play.
ARG WITH_FFMPEG=true
RUN if [ "$WITH_FFMPEG" = "true" ]; then \
      apt-get update \
      && apt-get install -y --no-install-recommends ffmpeg \
      && rm -rf /var/lib/apt/lists/*; \
    fi

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    # Everything that changes at runtime lives in /data (mount a volume there).
    DATABASE_URL=sqlite:////data/photostack.db \
    UPLOADS_DIR=/data/uploads

# Dependencies first, so this layer is cached between code changes.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --extra postgres

COPY photostack ./photostack
COPY --from=frontend /frontend/dist ./frontend/dist
COPY demo-photos ./demo-photos

EXPOSE 8000
# Seed demo photos into an empty library (no-op when the folder has only its README),
# then start. The startup scan indexes whatever is in /data/uploads.
CMD mkdir -p "$UPLOADS_DIR" \
    && find demo-photos -maxdepth 1 -type f ! -name '*.md' -exec cp -n {} "$UPLOADS_DIR"/ \; \
    && exec /app/.venv/bin/uvicorn photostack.main:app --host 0.0.0.0 --port 8000
