#!/bin/sh
# Container entrypoint. On the public demo (DEMO_MODE=true) it first copies the
# demo photos into the library; a normal install starts with an empty library.
set -e
mkdir -p "$UPLOADS_DIR"
if [ "$DEMO_MODE" = "true" ]; then
  # Photos/videos only (not README, credits or albums.json); never overwrite.
  find demo-photos -maxdepth 1 -type f \
    \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.heic' -o -iname '*.mp4' -o -iname '*.mov' \) \
    -exec cp -n {} "$UPLOADS_DIR"/ \;
fi
exec /app/.venv/bin/uvicorn photostack.main:app --host 0.0.0.0 --port "${PORT:-8000}"
