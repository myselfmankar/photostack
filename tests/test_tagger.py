"""The optional AI tagger. Gemini itself is never called: we fake the client."""

from pathlib import Path

import pytest

from .conftest import make_jpeg


@pytest.fixture
def tagger(workdir):
    from photostack.services import tagger

    tagger._client.cache_clear()
    yield tagger
    tagger._client.cache_clear()


def test_parse_tags_cleans_and_dedupes(tagger):
    assert tagger.parse_tags("Beach, Sunset , ,beach\nPeople.") == ["beach", "sunset", "people"]
    assert len(tagger.parse_tags(",".join(f"t{i}" for i in range(30)))) == tagger.MAX_TAGS


def test_off_without_key(tagger):
    assert tagger.is_enabled() is False
    assert tagger.suggest_tags(Path("missing.webp")) == []  # returns before reading the file


def test_tags_saved_after_indexing(tagger, monkeypatch, upload, client):
    monkeypatch.setattr(tagger, "is_enabled", lambda: True)
    monkeypatch.setattr(tagger, "suggest_tags", lambda path: ["mountain", "snow"])

    img = upload("tagged.jpg", make_jpeg(color=(40, 90, 160)))

    assert img["status"] == "completed"
    assert sorted(t["name"] for t in img["tags"]) == ["mountain", "snow"]
    found = client.get("/api/v1/search", params={"q": "snow"}).json()
    assert [i["filename"] for i in found] == ["tagged.jpg"]


def test_tagging_failure_does_not_fail_indexing(tagger, monkeypatch, upload):
    def boom(path):
        raise RuntimeError("Gemini is down")

    monkeypatch.setattr(tagger, "is_enabled", lambda: True)
    monkeypatch.setattr(tagger, "suggest_tags", boom)

    img = upload("untagged.jpg", make_jpeg(color=(160, 90, 40)))

    assert img["status"] == "completed"
    assert img["tags"] == []
