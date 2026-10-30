import hashlib
import json
from pathlib import Path
import pytest
from pipeline.integrity import verify_sources
from pipeline import ingest


def fixture_cache(root):
    raw = root / 'data/raw'
    raw.mkdir(parents=True)
    content = b'season,team\n2024-25,BOS\n'
    (raw / 'example.csv').write_bytes(content)
    manifest = {'files': [{'file': 'example.csv', 'sha256': hashlib.sha256(content).hexdigest()}]}
    (root / 'data/provenance.json').write_text(json.dumps(manifest))
    return raw / 'example.csv'


def test_all_recorded_sources_match():
    assert verify_sources() == 11


def test_changed_cache_blocks_ingestion_without_rewriting_manifest(tmp_path, monkeypatch):
    source = fixture_cache(tmp_path)
    manifest = tmp_path / 'data/provenance.json'
    original = manifest.read_bytes()
    source.write_bytes(b'changed content')
    monkeypatch.setattr(ingest, 'ROOT', tmp_path)
    with pytest.raises(ValueError, match='checksum mismatch'):
        ingest.main()
    assert manifest.read_bytes() == original


def test_missing_cache_requires_explicit_refetch_mode(tmp_path):
    source = fixture_cache(tmp_path)
    assert verify_sources(tmp_path) == 1
    source.unlink()
    with pytest.raises(ValueError, match='Missing cached source'):
        verify_sources(tmp_path)
    assert verify_sources(tmp_path, require_all=False) == 0


def test_source_names_cannot_escape_cache(tmp_path):
    fixture_cache(tmp_path)
    (tmp_path / 'data/provenance.json').write_text(json.dumps({'files': [{'file': '../escape.csv', 'sha256': '0'}]}))
    with pytest.raises(ValueError, match='Invalid source filename'):
        verify_sources(tmp_path)
