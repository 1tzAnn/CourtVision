"""Check cached source bytes against their recorded provenance before rebuilding."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]


def source_records(manifest):
    records = list(manifest.get('files', []))
    if manifest.get('audit_source'):
        records.append(manifest['audit_source'])
    records.extend(manifest.get('spatial', []))
    records.extend(manifest.get('shot_training_sources', []))
    return records


def verify_sources(root=ROOT, require_all=True):
    root = Path(root)
    manifest_path = root / 'data/provenance.json'
    if not manifest_path.exists():
        if require_all:
            raise ValueError('Missing source provenance manifest')
        return 0
    verified = 0
    for record in source_records(json.loads(manifest_path.read_text())):
        name = record['file']
        if Path(name).name != name:
            raise ValueError(f'Invalid source filename: {name}')
        path = root / 'data/raw' / name
        if not path.exists() and not require_all:
            continue
        if not path.is_file():
            raise ValueError(f'Missing cached source: {name}')
        if hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
            raise ValueError(f'Source checksum mismatch: {name}. Restore the recorded snapshot before rebuilding.')
        verified += 1
    return verified


if __name__ == '__main__':
    print(f'Verified {verify_sources()} cached source hashes.')
