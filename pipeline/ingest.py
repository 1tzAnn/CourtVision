"""Fetch explicitly CC BY 4.0 CSVs; cache immutable bytes and record hashes."""
from pathlib import Path
import hashlib, json, subprocess, datetime
try:
    from pipeline.integrity import verify_sources
except ModuleNotFoundError:
    from integrity import verify_sources
ROOT=Path(__file__).resolve().parents[1]
SEASONS=['2022-23','2023-24','2024-25']
def main():
    # Never silently legitimize an edited cache by overwriting its recorded hash.
    verify_sources(ROOT, require_all=False)
    records=[]
    existing=json.loads((ROOT/'data/provenance.json').read_text()) if (ROOT/'data/provenance.json').exists() else {}
    for season in SEASONS:
        for kind in ['team-game-results','player-season-totals']:
            name=f'{season}-{kind}.csv'; path=ROOT/'data/raw'/name
            url=f'https://boxscorelab.com/downloads/{name}'
            path.parent.mkdir(parents=True,exist_ok=True)
            if not path.exists():
                temp=path.with_suffix('.tmp')
                subprocess.run(['curl','--fail','--location','--retry','2','--max-time','90','--silent','--show-error',url,'-o',str(temp)],check=True)
                if not temp.read_bytes().startswith(b'season,'): raise ValueError('Unexpected source response')
                temp.rename(path)
            records.append(dict(file=name,url=url,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),bytes=path.stat().st_size))
    audit=ROOT/'data/raw/2025-26-team-game-results.csv'
    if not audit.exists():
        subprocess.run(['curl','--fail','--location','--retry','2','--max-time','120','--silent','--show-error','https://boxscorelab.com/downloads/'+audit.name,'-o',str(audit)],check=True)
    if not audit.read_bytes().startswith(b'season,'):raise ValueError('Invalid audit CSV')
    audit_record=dict(file=audit.name,url='https://boxscorelab.com/downloads/'+audit.name,sha256=hashlib.sha256(audit.read_bytes()).hexdigest(),bytes=audit.stat().st_size,license='CC BY 4.0',retrieved_utc=existing.get('audit_source',{}).get('retrieved_utc',datetime.datetime.now(datetime.timezone.utc).isoformat()))
    for kind in ['shots','lineups']:
        path=ROOT/f'data/raw/{kind}_2025.parquet'
        if not path.exists():
            subprocess.run(['curl','--fail','--location','--retry','2','--max-time','120','--silent','--show-error',f'https://github.com/sportsdataverse/sportsdataverse-data/releases/download/nba_stats_{kind}/{kind}_2025.parquet','-o',str(path)],check=True)
        if path.read_bytes()[:4]!=b'PAR1': raise ValueError('Invalid Parquet response')
    for year in [2023,2024]:
        path=ROOT/f'data/raw/shots_{year}.parquet'
        if not path.exists():
            subprocess.run(['curl','--fail','--location','--retry','2','--max-time','120','--silent','--show-error',f'https://github.com/sportsdataverse/sportsdataverse-data/releases/download/nba_stats_shots/shots_{year}.parquet','-o',str(path)],check=True)
        if path.read_bytes()[:4]!=b'PAR1': raise ValueError('Invalid Parquet response')
    verify_sources(ROOT, require_all=False)
    (ROOT/'data/provenance.json').write_text(json.dumps(dict(existing,source='BoxScore Lab / NBA Stats',license='CC BY 4.0',license_url='https://boxscorelab.com/downloads/',retrieved_utc=existing.get('retrieved_utc',datetime.datetime.now(datetime.timezone.utc).isoformat()),files=records,audit_source=audit_record),indent=2))
    print(f'Cached {len(records)} verified CSV responses')
if __name__=='__main__': main()
