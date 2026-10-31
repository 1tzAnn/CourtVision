"""Local API. Static hosted demo uses the identical exported model in-browser."""
from pathlib import Path
import json
import numpy as np
from fastapi import FastAPI,HTTPException,Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pipeline.build import feature_vector,FEATURES,predict
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'dist/data.json').read_text())
SPATIAL=json.loads((ROOT/'dist/spatial.json').read_text())
app=FastAPI(title='Courtvision',version='0.1.0')
class Matchup(BaseModel):
    home:str
    away:str
    rest_gap:float=Field(default=0,ge=-6,le=6)
@app.get('/api/health')
def health():return {'status':'ok','snapshot':DATA['snapshot']}
@app.get('/api/teams')
def teams():return [t for t in DATA['teams'] if t['season']=='2024-25']
@app.get('/api/players')
def players(q:str='',season:str='2024-25',min_minutes:int=0):
    if season not in ['2022-23','2023-24','2024-25']:raise HTTPException(400,'Unsupported season')
    return [p for p in DATA['players'] if p['season']==season and q.lower() in p['player_name'].lower() and p['minutes']>=min_minutes]
@app.post('/api/matchup')
def matchup(req:Matchup):
    ts={t['team']:t for t in teams()}
    if req.home not in ts or req.away not in ts or req.home==req.away:raise HTTPException(400,'Choose two different supported teams')
    x=dict(zip(FEATURES,feature_vector(ts[req.home]['profile'],ts[req.away]['profile'],req.rest_gap)))
    b=DATA['model'];p=float(predict(b,[x[k] for k in b['features']]))
    bs=[float(predict(m,[x[k] for k in m['features']])) for m in DATA['bootstrap']]
    return dict(home_probability=p,interval=np.quantile(bs,[.1,.9]).tolist(),features=x,scenario='Hypothetical home matchup using end-of-2024–25 Elo strength; rest not included in selected Elo model',interval_type='80% training-week bootstrap model-instability interval')
@app.get('/api/evaluation')
def evaluation():return DATA['evaluation']
@app.get('/api/shot-evaluation')
def shot_evaluation():return SPATIAL['shot_model']
@app.get('/api/lineups/{team}')
def lineups(team:str,prior_strength:int=Query(default=200,ge=1,le=1000)):
    rows=[dict(r,shrunk=(r['poss']*r['net']+prior_strength*r['prior'])/(r['poss']+prior_strength),prior_strength=prior_strength) for r in SPATIAL['lineups'] if r['team']==team]
    if not rows:raise HTTPException(404,'No observed lineups for this team')
    return sorted(rows,key=lambda r:r['shrunk'],reverse=True)
@app.get('/api/shots/{team}')
def shots(team:str):
    if team not in SPATIAL['teams']:raise HTTPException(404,'Unknown team')
    return json.loads((ROOT/f'dist/shots/{team}.json').read_text())
app.mount('/',StaticFiles(directory=ROOT/'dist',html=True),name='dashboard')
