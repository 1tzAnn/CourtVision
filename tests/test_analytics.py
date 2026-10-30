import json
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from backend.app import app,DATA
from pipeline.build import validate_games,prepare_games,feature_vector,predict,vulnerability
from pipeline.spatial import shrink,zone
ROOT=Path(__file__).resolve().parents[1]
client=TestClient(app)
@pytest.fixture(scope='module')
def games():return pd.read_csv(ROOT/'data/raw/2024-25-team-game-results.csv')
def test_game_pair_integrity(games):validate_games(games)
def test_bad_game_scores_rejected(games):
    bad=games.copy();bad.loc[0,'opponent_points']+=10
    with pytest.raises(AssertionError):validate_games(bad)
def test_current_game_cannot_change_its_pregame_features(games):
    _,before,_=prepare_games(games)
    g=before.iloc[100];changed=games.copy();mask=(changed.team==g.home)&(changed.game_date==g.date)
    changed.loc[mask,'points']+=30;changed.loc[mask,'point_diff']+=30
    _,after,_=prepare_games(changed)
    a=before[(before.home==g.home)&(before.date==g.date)].iloc[0];b=after[(after.home==g.home)&(after.date==g.date)].iloc[0]
    assert a.equals(b)
def test_every_feature_date_is_prior():
    d=pd.read_csv(ROOT/'data/processed/pregame_features.csv')
    assert (d.home_history<d.date).all() and (d.away_history<d.date).all()
    assert set(d.season)=={'2022-23','2023-24','2024-25','2025-26'}
def test_shrinkage_limits():
    assert shrink(100,0,5)==5
    assert shrink(100,200,0)==50
    assert abs(shrink(100,100000,5)-100)<.2
    assert shrink(-50,20,0)>-50
@pytest.mark.parametrize('x,y,v,expected',[(0,0,2,0),(60,80,2,1),(180,100,2,2),(230,0,3,3),(0,250,3,4)])
def test_shot_geometry(x,y,v,expected):assert zone(x,y,v)==expected
@pytest.mark.parametrize('path',['/','/api/health','/api/teams','/api/players?q=Tatum','/api/evaluation','/api/lineups/BOS','/api/shots/BOS'])
def test_endpoints(path):assert client.get(path).status_code==200
def test_matchup_validity():
    r=client.post('/api/matchup',json={'home':'BOS','away':'OKC'});assert r.status_code==200
    d=r.json();assert 0<d['home_probability']<1;assert 0<=d['interval'][0]<=d['interval'][1]<=1
    assert client.post('/api/matchup',json={'home':'BOS','away':'BOS'}).status_code==400
    assert client.post('/api/matchup',json={'home':'BOGUS','away':'BOS'}).status_code==400
    assert client.post('/api/matchup',json={'home':'BOS','away':'OKC','rest_gap':20}).status_code==422
    assert client.get('/api/shots/BOGUS').status_code==404
    assert client.get('/api/players?season=2099').status_code==400
def test_strength_monotonicity():
    model=DATA['model'];x={k:0 for k in model['features']};p0=predict(model,[x[k] for k in model['features']]);x['elo_gap' if 'elo_gap' in model['features'] else 'net_rating_gap']=100
    assert predict(model,[x[k] for k in model['features']])>p0
def test_exported_sample_counts():
    s=json.loads((ROOT/'dist/spatial.json').read_text());assert len(s['lineups'])==s['lineup_count']
    total=0
    for path in (ROOT/'dist/shots').glob('*.json'):
        d=json.loads(path.read_text());total+=len(d['shots']);assert all(len(x)==7 for x in d['shots'])
    assert total==s['shot_count']==219527


def test_shots_match_independent_boxscores(games):
    for team,g in games.groupby('team'):
        shots=json.loads((ROOT/f'dist/shots/{team}.json').read_text())['shots']
        assert len(shots)==int(g.field_goal_attempts.sum())
        assert sum(s[3] for s in shots)==int(g.field_goals_made.sum())
        assert sum(s[3] for s in shots if s[4]==3)==int(g.three_point_makes.sum())

def test_shot_feature_outcome_independence():
    from pipeline.shot_model import prepare,FEATURES
    raw=pd.read_parquet(ROOT/'data/raw/shots_2025.parquet').head(100)
    _,x,_=prepare(raw)
    changed=raw.copy();changed['shot_result']=changed.shot_result.map({'Made':'Missed','Missed':'Made'})
    _,xx,_=prepare(changed)
    assert x.equals(xx)
    assert set(FEATURES)==set(x.columns)

def test_shot_predictions_and_evaluation():
    r=json.loads((ROOT/'dist/shot_evaluation.json').read_text())
    assert r['counts']==[217219,218702,219527]
    assert r['train']<r['validation']<r['test']
    for path in (ROOT/'dist/shots').glob('*.json'):
        d=json.loads(path.read_text());assert all(0<s[6]<1 for s in d['shots'])
    assert sum(x['n'] for x in r['results']['location_context']['calibration'])==219527


def test_elo_updates_only_after_outcome(games):
    from pipeline.elo import ratings_by_game
    initial=ratings_by_game(games)
    change_date=sorted(games.game_date.unique())[25]
    altered=games.copy();mask=altered.game_date==change_date
    altered.loc[mask,'result']=altered.loc[mask,'result'].map({'W':'L','L':'W'})
    updated=ratings_by_game(altered)
    for key in initial:
        if key[1]<change_date:assert initial[key]==updated[key]
        if key[1]==change_date:assert initial[key][0]==updated[key][0]
    assert any(initial[k][1]!=updated[k][1] for k in initial if k[1]==change_date)

def test_elo_reset_conservation_and_order(games):
    from pipeline.elo import ratings_by_game,expected_home
    base=ratings_by_game(games)
    assert base==ratings_by_game(games.sample(frac=1,random_state=42))
    last=[]
    for team,g in games.groupby('team'):
        dates=sorted(g.game_date)
        assert base[('2024-25',dates[0],team)][0]==1500
        last.append(base[('2024-25',dates[-1],team)][1])
    assert sum(last)==pytest.approx(45000)
    assert expected_home(1500,1500,True)==.5
    assert expected_home(1500,1500,False)>.5

def test_calibration_boundaries_partition_samples():
    from pipeline.build import metrics
    result=metrics([0,1,0,1,0,1],np.array([0,.1,.3,.5,.9,1]))
    assert sum(b['n'] for b in result['calibration'])==6

def test_lineup_sensitivity_api():
    a=client.get('/api/lineups/BOS?prior_strength=50').json()
    b=client.get('/api/lineups/BOS?prior_strength=500').json()
    by_ids={tuple(r['ids']):r for r in b}
    for r in a:
        other=by_ids[tuple(r['ids'])]
        assert abs(other['shrunk']-r['prior'])<=abs(r['shrunk']-r['prior'])+1e-10
    assert client.get('/api/lineups/BOS?prior_strength=0').status_code==422

def test_fresh_audit_not_used_for_selection():
    ev=DATA['evaluation']
    assert ev['selected']==min(ev['tuning'],key=lambda k:ev['tuning'][k]['validation_log_loss'])
    assert ev['audit']['season']=='2025-26'
    assert ev['audit']['n']==1071
    assert ev['train_season']=='2022-23' and ev['validation_season']=='2023-24'
