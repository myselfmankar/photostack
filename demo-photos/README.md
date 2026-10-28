# Demo photos

The current set (31 photos + 1 duplicate, 8 cities) was fetched from Wikimedia Commons with
`uv run python scripts/fetch_demo_photos.py`. Credits: [ATTRIBUTION.md](ATTRIBUTION.md).

Photos in this folder are copied into the Docker image and indexed when the
container starts. Used for the public demo (`DEMO_MODE=true`).

**Choosing photos**

- Use photos you have the rights to publish: your own, or freely licensed ones
  (Unsplash, Pexels, Wikimedia Commons; check each license).
- **GPS is public.** Every photo with location data shows up on the map with
  its exact coordinates. Don't use photos taken at home or anywhere private.
- For a good demo, include:
  - 20–40 photos across a few months and 2–3 trips (fills the timeline and month albums)
  - photos with GPS in a few cities (fills the map)
  - one or two exact or resized copies (shows Duplicates)
  - a couple of portrait (tall) photos (shows the shape-preserving grid)
- JPG, PNG or HEIC. Keep the total under ~100 MB so the image stays small.
