#!/bin/sh
# Container entrypoint: seed demo photos into an empty library, then start the server.
set -e
mkdir -p "$UPLOADS_DIR"
# Copy demo photos/videos only (not README/credits/albums.json); never overwrite.
find demo-photos -maxdepth 1 -type f \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.heic' -o -iname '*.mp4' -o -iname '*.mov' \) \
  -exec cp -n {} "$UPLOADS_DIR"/ \;
exec /app/.venv/bin/uvicorn photostack.main:app --host 0.0.0.0 --port "${PORT:-8000}"
