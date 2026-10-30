"""Prepare regular-season observed shots and shrinkage-adjusted lineups."""
from pathlib import Path
import hashlib,json,datetime
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
ZONES=['At rim','Paint','Mid-range','Corner three','Above-break three']
def zone(x,y,value):
    if value==3:return 3 if abs(x)>=220 and y<=92.5 else 4
    if np.hypot(x,y)<=40:return 0
    return 1 if abs(x)<=80 and y<=137.5 else 2

def shrink(raw,poss,prior,k=200):return (poss*raw+k*prior)/(poss+k)
def main():
    d=pd.read_parquet(ROOT/'data/raw/shots_2025.parquet');d=d[d.season_type_id.astype(str)=='2'].copy()
    assert d[['x_legacy','y_legacy','person_id']].notna().all().all()
    assert d.shot_result.isin(['Made','Missed']).all()
    d['made']=d.shot_result.eq('Made').astype(int);d['zone']=[zone(x,y,v) for x,y,v in zip(d.x_legacy,d.y_legacy,d.shot_value)]
    league=[]
    for z,g in d.groupby('zone'):league.append(dict(zone=int(z),attempts=len(g),makes=int(g.made.sum()),fg=float(g.made.mean()),pps=float((g.made*g.shot_value).mean())))
    teams={}
    (ROOT/'dist/shots').mkdir(exist_ok=True)
    for t,g in d.groupby('team_tricode'):
        # All shots retained; client filters without inventing positions.
        obj=dict(columns=['player','x','y','made','value','zone'],players=[dict(id=int(i),name=str(p.player_name.iloc[0])) for i,p in g.groupby('person_id')],shots=g[['person_id','x_legacy','y_legacy','made','shot_value','zone']].astype(int).values.tolist())
        (ROOT/f'dist/shots/{t}.json').write_text(json.dumps(obj,separators=(',',':')))
        teams[t]=dict(attempts=len(g),makes=int(g.made.sum()),zones=[dict(zone=int(z),attempts=len(v),makes=int(v.made.sum()),fg=float(v.made.mean())) for z,v in g.groupby('zone')])
    line=pd.read_parquet(ROOT/'data/raw/lineups_2025.parquet');line=line[(line.season_type=='regular-season')&(line.measure_type=='advanced')&(line.per_mode=='totals')].copy()
    assert not line.duplicated(['team_abbreviation','group_id']).any()
    assert (line.poss>0).all()
    rows=[]
    for t,g in line.groupby('team_abbreviation'):
        prior=float(np.average(g.net_rating,weights=g.poss))
        for r in g.itertuples():
            ids=[int(i) for i in r.group_id.split('-') if i];names=r.group_name.split(' - ')
            assert len(ids)==5 and len(names)==5
            rows.append(dict(team=t,ids=ids,names=names,poss=float(r.poss),minutes=float(r.min),off=float(r.off_rating),defense=float(r.def_rating),net=float(r.net_rating),shrunk=shrink(r.net_rating,r.poss,prior),prior=prior,efg=float(r.efg_pct),orb=float(r.oreb_pct),drb=float(r.dreb_pct)))
    obj=dict(zones=ZONES,league=league,teams=teams,lineups=rows,shot_count=len(d),lineup_count=len(line),license='CC BY 4.0',source='SportsDataverse / hoopR / NBA Stats',license_url='https://github.com/sportsdataverse/hoopR-nba-stats-data/blob/main/LICENSE.md',limitations=['Lineup export contains 2,000 units; coverage may be capped. Absent combinations are unavailable, not zero.','Coordinates use NBA legacy tenths of feet. Zones are our geometric approximation.','All observations are 2024–25 regular season. No defender tracking is available.','Zone reference points use descriptive league averages; run shot_model.py for held-out model-based expected points.'])
    (ROOT/'dist/spatial.json').write_text(json.dumps(obj,allow_nan=False,separators=(',',':')))
    manifest=json.loads((ROOT/'data/provenance.json').read_text())
    manifest['spatial']=[dict(file=f'{n}_2025.parquet',url=f'https://github.com/sportsdataverse/sportsdataverse-data/releases/download/nba_stats_{n}/{n}_2025.parquet',sha256=hashlib.sha256((ROOT/f'data/raw/{n}_2025.parquet').read_bytes()).hexdigest(),license='CC BY 4.0',license_url=obj['license_url']) for n in ['shots','lineups']]
    (ROOT/'data/provenance.json').write_text(json.dumps(manifest,indent=2))
    print(f'{len(d)} shots; {len(line)} distinct lineups')
if __name__=='__main__':main()
