"""Build and verify the deliverable; write a timestamped report only on success."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', default=shutil.which('node'), help='Node executable (or put node on PATH)')
    args = parser.parse_args()
    if not args.node:
        parser.error('Node is required for browser-model and standalone checks; supply --node.')
    commands = [
        ('Source integrity', [sys.executable, '-m', 'pipeline.integrity']),
        ('Build offline app', [sys.executable, 'scripts/build_standalone.py']),
        ('Python analytics and API', [sys.executable, '-m', 'pytest', '-q']),
    ]
    commands += [(test.stem, [args.node, str(test.relative_to(ROOT))]) for test in sorted((ROOT/'tests').glob('*.mjs'))]
    results=[]
    for name, command in commands:
        print(f'Checking {name}...', flush=True)
        result=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
        print(result.stdout, end='', flush=True)
        if result.stderr:
            print(result.stderr, end='', file=sys.stderr)
        results.append({'check':name,'passed':result.returncode==0,'output':result.stdout.strip().replace(str(ROOT), '.').replace(str(Path(sys.executable).parent.parent), '<python-environment>').replace('../' + Path(sys.executable).parent.parent.name, '<python-environment>')})
        if result.returncode:
            print(f'RELEASE CHECK FAILED: {name}. No new passing report was written.',file=sys.stderr)
            return result.returncode
    files=[ROOT/'Courtvision.html', *sorted((ROOT/'dist').rglob('*'))]
    hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    report={'checked_at_utc':datetime.now(timezone.utc).isoformat(),'status':'passed','checks':results,'sha256':hashes,
        'limits':['Automated verification is not a guarantee of defect-free software.','Public repository and Devpost submission are separate steps.','Browser file-picker/download dialogs are not exercised by this script.']}
    (ROOT/'docs/release-check.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'PASS: {len(results)} checks; {len(hashes)} deliverable files fingerprinted. Report: docs/release-check.json')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
