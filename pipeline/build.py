"""Reproduce features, chronological evaluation, and portable dashboard artifacts."""
from pathlib import Path
import json, hashlib, datetime, sqlite3
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss, brier_score_loss, accuracy_score
ROOT=Path(__file__).resolve().parents[1]
CORE_FEATURES=['net_rating_gap','efg_gap','turnover_gap','rebound_gap','rest_gap']
FEATURES=CORE_FEATURES+['vulnerability_gap','elo_gap']
try:
    from pipeline.elo import ratings_by_game
except ModuleNotFoundError:
    from elo import ratings_by_game

def records(df): return json.loads(df.to_json(orient='records'))
def save(name,obj):
    (ROOT/'dist'/name).write_text(json.dumps(obj,allow_nan=False,separators=(',',':')))

def validate_games(d):
    assert not d.duplicated(['season','team','game_date']).any(), 'Duplicate team game'
    assert not d.isna().any().any(), 'Missing game fields'
    assert (d.field_goals_made<=d.field_goal_attempts).all()
    assert (d.three_point_makes<=d.three_point_attempts).all()
    assert ((d.points-d.opponent_points)==d.point_diff).all()
    assert (d.result.eq('W')==d.point_diff.gt(0)).all()
    other=d[['season','game_date','team','opponent','points','home']].rename(columns={'team':'opponent','opponent':'team','points':'paired_points','home':'paired_home'})
    joined=d.merge(other,on=['season','game_date','team','opponent'],validate='one_to_one')
    assert len(joined)==len(d) and (joined.opponent_points==joined.paired_points).all()
    assert not (joined.home & joined.paired_home).any(), 'Two home teams'
    # Both home flags false identify neutral-site games; preserve but do not predict these.

def vulnerability(a,b):
    # Descriptive strength × opponent weakness, fixed scales; not causal impact.
    return (max(0,(a['efg']-.54)/.05)*max(0,(b['allowed_efg']-.54)/.05)+max(0,(a['orb']-.27)/.05)*max(0,(b['allowed_orb']-.27)/.05)+max(0,(.13-a['tov'])/.03)*max(0,(.13-b['forced_tov'])/.03))/3

def feature_vector(a,b,rest=0):
    return [a['net']-b['net'],a['efg']-b['efg'],a['tov']-b['tov'],a['orb']-b['orb'],rest,vulnerability(a,b)-vulnerability(b,a),a.get('elo',1500)-b.get('elo',1500)]

def prepare_games(d):
    d=d.sort_values(['season','game_date','team']).copy()
    ratings=ratings_by_game(d)
    d['pre_elo']=[ratings[(r.season,r.game_date,r.team)][0] for r in d.itertuples()]
    d['post_elo']=[ratings[(r.season,r.game_date,r.team)][1] for r in d.itertuples()]
    opp=d[['season','game_date','team','field_goals_made','field_goal_attempts','three_point_makes','offensive_rebounds','defensive_rebounds','turnovers','free_throw_attempts','home']].rename(columns={c:'opp_'+c for c in ['field_goals_made','field_goal_attempts','three_point_makes','offensive_rebounds','defensive_rebounds','turnovers','free_throw_attempts','home']}).rename(columns={'team':'opponent'})
    d=d.merge(opp,on=['season','game_date','opponent'],validate='one_to_one')
    d['neutral']=(~d.home)&(~d.opp_home)
    d['poss']=.5*((d.field_goal_attempts+.44*d.free_throw_attempts-d.offensive_rebounds+d.turnovers)+(d.opp_field_goal_attempts+.44*d.opp_free_throw_attempts-d.opp_offensive_rebounds+d.opp_turnovers))
    d['net']=100*d.point_diff/d.poss
    d['off']=100*d.points/d.poss;d['def']=100*d.opponent_points/d.poss
    d['efg']=(d.field_goals_made+.5*d.three_point_makes)/d.field_goal_attempts
    d['allowed_efg']=(d.opp_field_goals_made+.5*d.opp_three_point_makes)/d.opp_field_goal_attempts
    d['tov']=d.turnovers/(d.field_goal_attempts+.44*d.free_throw_attempts+d.turnovers)
    d['forced_tov']=d.opp_turnovers/(d.opp_field_goal_attempts+.44*d.opp_free_throw_attempts+d.opp_turnovers)
    d['orb']=d.offensive_rebounds/(d.offensive_rebounds+d.opp_defensive_rebounds)
    d['allowed_orb']=d.opp_offensive_rebounds/(d.opp_offensive_rebounds+d.defensive_rebounds)
    metrics=['net','efg','allowed_efg','tov','forced_tov','orb','allowed_orb','off','def','poss']
    g=d.groupby(['season','team'],sort=False)
    for m in metrics: d['pre_'+m]=g[m].transform(lambda s:s.shift(1).rolling(10,min_periods=10).mean())
    dates=pd.to_datetime(d.game_date)
    d['rest']=dates.groupby([d.season,d.team]).diff().dt.days.clip(upper=7)-1
    d['history_last_date']=g.game_date.shift(1)
    lookup={(r.season,r.game_date,r.team):r for r in d.itertuples()}
    rows=[]
    for r in d[d.home].itertuples():
        o=lookup[(r.season,r.game_date,r.opponent)]
        if np.isnan(r.pre_net) or np.isnan(o.pre_net):continue
        a={m:getattr(r,'pre_'+m) for m in metrics};b={m:getattr(o,'pre_'+m) for m in metrics}
        a['elo']=r.pre_elo;b['elo']=o.pre_elo
        rows.append(dict(season=r.season,date=r.game_date,home=r.team,away=r.opponent,y=int(r.result=='W'),home_history=r.history_last_date,away_history=o.history_last_date,**dict(zip(FEATURES,feature_vector(a,b,r.rest-o.rest)))))
    return d,pd.DataFrame(rows),metrics

def fit(x,y,c):
    s=StandardScaler().fit(x);m=LogisticRegression(C=c,max_iter=3000,random_state=42).fit(s.transform(x),y)
    return s,m

def bundle(s,m,columns):return dict(features=columns,mean=s.mean_.tolist(),scale=s.scale_.tolist(),coef=m.coef_[0].tolist(),intercept=float(m.intercept_[0]))
def predict(b,x):return 1/(1+np.exp(-((np.asarray(x)-b['mean'])/b['scale']@np.asarray(b['coef'])+b['intercept'])))
def metrics(y,p):
    bins=[]
    p=np.asarray(p)
    assert np.isfinite(p).all() and ((p>=0)&(p<=1)).all()
    bin_ids=np.minimum((p*10).astype(int),9)
    for index in range(10):
        mask=bin_ids==index
        if mask.any():bins.append(dict(predicted=float(p[mask].mean()),observed=float(np.asarray(y)[mask].mean()),n=int(mask.sum())))
    return dict(log_loss=float(log_loss(y,p)),brier=float(brier_score_loss(y,p)),accuracy=float(accuracy_score(y,p>=.5)),n=len(y),calibration=bins)

def main():
    d=pd.concat([pd.read_csv(p) for p in sorted((ROOT/'data/raw').glob('*team-game-results.csv'))],ignore_index=True)
    validate_games(d);d,f,ms=prepare_games(d)
    assert (f.home_history<f.date).all() and (f.away_history<f.date).all()
    train=f[f.season=='2022-23'];valid=f[f.season=='2023-24'];test=f[f.season=='2024-25']
    audit=f[f.season=='2025-26']
    variants={'strength':['net_rating_gap'],'core':CORE_FEATURES,'experimental_mvi':CORE_FEATURES+['vulnerability_gap'],'elo':['elo_gap']}
    results={};models={};tuning={}
    for name,cols in variants.items():
        trials=[]
        for c in [.01,.1,1,10]:
            s,m=fit(train[cols],train.y,c);p=m.predict_proba(s.transform(valid[cols]))[:,1]
            trials.append((log_loss(valid.y,p),c))
        loss,c=min(trials);s,m=fit(pd.concat([train,valid])[cols],pd.concat([train,valid]).y,c)
        b=bundle(s,m,cols);models[name]=b
        results[name]=metrics(test.y,predict(b,test[cols].to_numpy()));tuning[name]=dict(C=c,validation_log_loss=loss)
    audit_results={name:metrics(audit.y,predict(model,audit[model['features']].to_numpy())) for name,model in models.items()}
    # Select on validation only, never on the held-out test performance.
    selected=min(tuning,key=lambda n:tuning[n]['validation_log_loss']);model=models[selected]
    home_rate=float(pd.concat([train,valid]).y.mean());results['home_base_rate']=metrics(test.y,np.full(len(test),home_rate))
    audit_results['home_base_rate']=metrics(audit.y,np.full(len(audit),home_rate))
    boot=[];tr=pd.concat([train,valid]);rng=np.random.default_rng(42)
    weeks=pd.to_datetime(tr.date).dt.to_period('W').astype(str);groups=[np.flatnonzero(weeks.to_numpy()==w) for w in weeks.unique()]
    for _ in range(60):
        idx=np.concatenate([groups[i] for i in rng.integers(0,len(groups),len(groups))]);sample=tr.iloc[idx]
        s,m=fit(sample[model['features']],sample.y,tuning[selected]['C']);boot.append(bundle(s,m,model['features']))
    evaluation=dict(selected=selected,train_season='2022-23',validation_season='2023-24',test_season='2024-25',split_counts={'train':len(train),'validation':len(valid),'test':len(test)},tuning=tuning,results=results,bootstrap='60 training-week block bootstrap refits; 10th–90th percentile model-instability interval, not an outcome guarantee',excluded_games=int(len(d)/2-len(f)))
    evaluation['audit']=dict(season='2025-26',n=len(audit),results=audit_results,protocol='Fresh season evaluated after predeclared Experiment 02; never used for selection or fitting')
    evaluation['elo_constants']=dict(K=20,home_offset=75,scale=400,season_reset=1500)
    # Paired held-out week-block bootstrap: uncertainty in the MVI ablation, not selection.
    pc=predict(models['core'],test[models['core']['features']].to_numpy())
    pm=predict(models['experimental_mvi'],test[models['experimental_mvi']['features']].to_numpy())
    yy=test.y.to_numpy()
    loss=lambda p:-(yy*np.log(np.clip(p,1e-12,1-1e-12))+(1-yy)*np.log(np.clip(1-p,1e-12,1-1e-12)))
    delta=loss(pc)-loss(pm)
    tw=pd.to_datetime(test.date).dt.to_period('W').astype(str).to_numpy()
    tg=[np.flatnonzero(tw==w) for w in np.unique(tw)]
    draws=[float(delta[np.concatenate([tg[i] for i in rng.integers(0,len(tg),len(tg))])].mean()) for _ in range(2000)]
    evaluation['mvi_ablation']=dict(log_loss_improvement=float(delta.mean()),interval_95=np.quantile(draws,[.025,.975]).tolist(),bootstrap_replicates=2000,method='Paired held-out week-block bootstrap; positive favors MVI')
    teams=[]
    for (season,team),g in d[d.season!='2025-26'].groupby(['season','team']):
        last=g.sort_values('game_date').tail(10);profile={m:float(last[m].mean()) for m in ms}
        profile['elo']=float(g.sort_values('game_date').iloc[-1].post_elo)
        totals={m:float(g[m].mean()) for m in ms}
        teams.append(dict(season=season,team=team,games=len(g),wins=int(g.result.eq('W').sum()),last_date=g.game_date.max(),profile=profile,season_profile=totals,home_wins=int((g.home & g.result.eq('W')).sum()),home_games=int(g.home.sum()),away_wins=int((~g.home & ~g.neutral & g.result.eq('W')).sum()),away_games=int((~g.home & ~g.neutral).sum()),trend=records(g.sort_values('game_date')[['game_date','opponent','points','opponent_points','net','result']].tail(20))))
    players=pd.concat([pd.read_csv(p) for p in sorted((ROOT/'data/raw').glob('*player-season-totals.csv'))],ignore_index=True)
    assert not players.duplicated(['season','player_name']).any()
    for col in ['points','assists','rebounds','steals','blocks','turnovers','three_point_attempts']:players[col+'_36']=36*players[col]/players.minutes.replace(0,np.nan)
    # Ratios from attempts, preserving missing denominators.
    players['ts_calc']=players.points/(2*(players.field_goal_attempts+.44*players.free_throw_attempts).replace(0,np.nan))
    players['three_rate']=players.three_point_attempts/players.field_goal_attempts.replace(0,np.nan)
    players['role']=players.position.fillna('Unknown').str[0].replace({'U':'Unknown'})
    players['three_smoothed']=(players.three_point_makes+50*.36)/(players.three_point_attempts+50)
    save('data.json',dict(teams=teams,players=records(players),evaluation=evaluation,model=model,bootstrap=boot,provenance=json.loads((ROOT/'data/provenance.json').read_text()),snapshot='2024-25 completed regular season; historical analysis, not current rosters'))
    save('evaluation.json',evaluation)
    f.to_csv(ROOT/'data/processed/pregame_features.csv',index=False)
    conn=sqlite3.connect(ROOT/'data/processed/courtvision.sqlite');d.to_sql('team_games',conn,if_exists='replace',index=False);players.to_sql('player_seasons',conn,if_exists='replace',index=False);f.to_sql('pregame_features',conn,if_exists='replace',index=False);conn.close()
    (ROOT/'data/processed/model.json').write_text(json.dumps(dict(model=model,bootstrap=boot),indent=2))
    print(json.dumps(evaluation,indent=2))
if __name__=='__main__':main()
