"""Create a portable source archive, excluding environments and hosting metadata."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import tempfile
import os

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_DOCS = {'docs/MASTER_BRIEF.md', 'docs/UPDATED_BRIEF.md'}
EXCLUDED = {'.git', '.venv', '__pycache__', '.pytest_cache', '.openai', '.sites-runtime', '.DS_Store', '.env'}


def main():
    target = ROOT.parent / 'Courtvision_Source.zip'
    with tempfile.NamedTemporaryFile(dir=target.parent, suffix='.zip', delete=False) as temp:
        temporary = Path(temp.name)
    try:
        with ZipFile(temporary, 'w', ZIP_DEFLATED) as archive:
            for path in sorted(ROOT.rglob('*')):
                relative = path.relative_to(ROOT)
                if path.is_file() and str(relative) not in PRIVATE_DOCS and not EXCLUDED.intersection(relative.parts) and path.suffix != '.zip':
                    archive.write(path, Path(ROOT.name) / relative)
        with ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise ValueError('Archive failed integrity validation')
        os.replace(temporary, target)
        print(f'Created {target} ({target.stat().st_size:,} bytes)')
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
