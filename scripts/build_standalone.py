"""Package the complete dashboard as an offline, double-clickable HTML file."""
from pathlib import Path
import json
import re
import hashlib

ROOT = Path(__file__).resolve().parents[1]


def main():
    dist = ROOT / 'dist'
    # Version the small module graph from leaves upward to avoid stale mixed builds.
    for name in ('series-ui.mjs', 'lineup-workspace.mjs', 'rotation-finder.mjs', 'app.js'):
        path = dist / name
        def version_import(match):
            dependency = dist / match[2].removeprefix('./')
            digest = hashlib.sha256(dependency.read_bytes()).hexdigest()[:12]
            return f'{match[1]}{match[2]}?v={digest}{match[3]}'
        path.write_text(re.sub(r'''(from\s+['"])(\./[^'"?]+)(?:\?v=[^'"]+)?(['"])''', version_import, path.read_text()))
    datasets = {str(p.relative_to(dist)): json.loads(p.read_text())
                for p in sorted(dist.rglob('*.json'))}
    # Prevent source text from terminating the HTML script element.
    payload = json.dumps(datasets, separators=(',', ':'), ensure_ascii=True).replace('<', '\\u003c')
    runtime = '''
const embeddedData = JSON.parse(document.getElementById('courtvision-data').textContent);
async function localFetch(path) {
  if (!Object.prototype.hasOwnProperty.call(embeddedData, path))
    throw new Error('Bundled dataset unavailable: ' + path);
  return {ok: true, json: async () => structuredClone(embeddedData[path])};
}
const downloadURLs = {};
function localDownload(path) {
  return downloadURLs[path] ||= URL.createObjectURL(new Blob(
    [JSON.stringify(embeddedData[path], null, 2)], {type: 'application/json'}));
}
'''
    analytics = '\n'.join(re.sub(r'^import .*?;\n|^export ', '', (dist / name).read_text(), flags=re.M) for name in ('analytics.mjs', 'scenarios.mjs', 'workspace.mjs', 'series-ui.mjs', 'shot-insights.mjs', 'lineup-comparison.mjs', 'lineup-workspace.mjs', 'rotation-finder.mjs'))
    app = (dist / 'app.js').read_text()
    app = re.sub(r'^import .*?;\n', '', app, flags=re.M)
    app = app.replace('fetch(', 'localFetch(')
    for name in ('evaluation.json', 'provenance.json', 'shot_evaluation.json'):
        app = app.replace(f'href="{name}" download',
                          f'href="${{localDownload(\'{name}\')}}" download="{name}"')
    app = app.replace('The hosted demo calculates', 'This local dashboard calculates')
    css = re.sub(r'@import\s+url\([^;]+;', '', (dist / 'styles.css').read_text())
    html = (dist / 'index.html').read_text()
    # A changed stylesheet gets a new URL even in browsers with persistent caches.
    css_hash = hashlib.sha256((dist / 'styles.css').read_bytes()).hexdigest()[:12]
    html = re.sub(r'href="styles\.css(?:\?v=[^"]*)?"', f'href="styles.css?v={css_hash}"', html)
    app_hash = hashlib.sha256((dist / 'app.js').read_bytes()).hexdigest()[:12]
    html = re.sub(r'src="app\.js(?:\?v=[^"]*)?"', f'src="app.js?v={app_hash}"', html)
    (dist / 'index.html').write_text(html)
    html = re.sub(r'<link rel="stylesheet" href="styles\.css[^\"]*">', lambda _: f'<style>{css}</style>', html)
    script = (runtime + analytics + '\n' + app).replace('</script', '<\\/script')
    html = re.sub(r'<script type="module" src="app\.js[^\"]*"></script>',
                  lambda _: f'<script id="courtvision-data" type="application/json">{payload}</script>'
                            f'<script type="module">{script}</script>', html)
    target = ROOT / 'CourtVisionAI_Standalone.html'
    target.write_text(html)
    print(f'Built {target} ({target.stat().st_size:,} bytes; {len(datasets)} embedded datasets)')


if __name__ == '__main__':
    main()
