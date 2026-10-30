"""Chronological location/context shot conversion model; no result-derived inputs."""
from pathlib import Path
import os
os.environ.setdefault('OMP_NUM_THREADS','4')
import json, re, hashlib
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from pipeline.build import metrics
ROOT=Path(__file__).resolve().parents[1]
FEATURES=['x_feet','y_feet','distance_feet','shot_value','period','period_seconds_remaining']
def seconds(clock):
    m=re.fullmatch(r'PT(?:(\d+)M)?([\d.]+)S',str(clock))
    if not m:raise ValueError(f'Invalid period clock: {clock}')
    return int(m.group(1) or 0)*60+float(m.group(2))
def prepare(d):
    d=d[d.season_type_id.astype(str)=='2'].copy()
    assert d.shot_result.isin(['Made','Missed']).all()
    x=pd.DataFrame({'x_feet':d.x_legacy/10,'y_feet':d.y_legacy/10,'distance_feet':d.shot_distance,'shot_value':d.shot_value,'period':d.period,'period_seconds_remaining':d.clock.map(seconds)})
    assert np.isfinite(x.to_numpy()).all() and x.shot_value.isin([2,3]).all()
    return d,x,d.shot_result.eq('Made').astype(int).to_numpy()
def main():
    tables=[prepare(pd.read_parquet(ROOT/f'data/raw/shots_{year}.parquet')) for year in [2023,2024,2025]]
    train,valid,test=tables;tr,x,y=train;va,vx,vy=valid;te,tx,ty=test
    candidates=[]
    for leaves in [7,15]:
        m=HistGradientBoostingClassifier(max_iter=80,max_leaf_nodes=leaves,l2_regularization=10,early_stopping=False,random_state=42).fit(x,y)
        result=metrics(vy,m.predict_proba(vx)[:,1]);candidates.append((result['log_loss'],leaves));print('Validated leaves',leaves,result['log_loss'],flush=True)
    _,leaves=min(candidates);xy=pd.concat([x,vx],ignore_index=True);yy=np.concatenate([y,vy])
    model=HistGradientBoostingClassifier(max_iter=80,max_leaf_nodes=leaves,l2_regularization=10,early_stopping=False,random_state=42).fit(xy,yy)
    prob=model.predict_proba(tx)[:,1]
    # Predeclared simpler reference: training+validation make rate separately for twos/threes.
    base={value:float(yy[xy.shot_value.to_numpy()==value].mean()) for value in [2,3]}
    baseline=np.array([base[v] for v in tx.shot_value]);overall=np.repeat(float(yy.mean()),len(ty))
    result=dict(target='Made field goal conditional on an attempted shot',features=FEATURES,train='2022-23',validation='2023-24',test='2024-25',counts=[len(y),len(vy),len(ty)],selected_leaves=leaves,validation_candidates=[dict(log_loss=l,leaves=n) for l,n in candidates],results={'location_context':metrics(ty,prob),'shot_value_baseline':metrics(ty,baseline),'overall_baseline':metrics(ty,overall)},limitations=['Conditional shot conversion estimate, not a forecast of where a player will shoot.','No defender locations, shot-clock time, player identity, or injury information. Period clock is not shot clock.','No causal claim about changing shot selection. No calibrated individual shot uncertainty interval.','Single held-out season; probability calibration may vary by player and context.'])
    joblib.dump(model,ROOT/'data/processed/shot_model.joblib')
    (ROOT/'dist/shot_evaluation.json').write_text(json.dumps(result,separators=(',',':')))
    # Attach one real held-out prediction per exported shot, preserving original row order.
    te=te.copy();te['predicted_make']=prob
    for team,g in te.groupby('team_tricode'):
        path=ROOT/f'dist/shots/{team}.json';obj=json.loads(path.read_text())
        assert len(obj['shots'])==len(g)
        for row,(_,raw) in zip(obj['shots'],g.iterrows()):
            assert row[:5]==[int(raw.person_id),int(raw.x_legacy),int(raw.y_legacy),int(raw.shot_result=='Made'),int(raw.shot_value)]
            if len(row)==6:row.append(round(float(raw.predicted_make),6))
            else:row[6]=round(float(raw.predicted_make),6)
        obj['columns']=['player','x','y','made','value','zone','predicted_make'];path.write_text(json.dumps(obj,separators=(',',':')))
    spatial=json.loads((ROOT/'dist/spatial.json').read_text());spatial['shot_model']=result;(ROOT/'dist/spatial.json').write_text(json.dumps(spatial,separators=(',',':')))
    manifest=json.loads((ROOT/'data/provenance.json').read_text())
    manifest['shot_training_sources']=[dict(file=f'shots_{year}.parquet',url=f'https://github.com/sportsdataverse/sportsdataverse-data/releases/download/nba_stats_shots/shots_{year}.parquet',sha256=hashlib.sha256((ROOT/f'data/raw/shots_{year}.parquet').read_bytes()).hexdigest(),license='CC BY 4.0',retrieved_utc='2026-10-26') for year in [2023,2024]]
    (ROOT/'data/provenance.json').write_text(json.dumps(manifest,indent=2));(ROOT/'dist/provenance.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps({k:{m:round(v[m],5) for m in ['log_loss','brier','accuracy']} for k,v in result['results'].items()},indent=2))
if __name__=='__main__':main()
