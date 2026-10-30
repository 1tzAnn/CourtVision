"""Sequential opponent-adjusted baseline with declared, fixed assumptions."""
import math

def expected_home(home,away,neutral=False):
    return 1/(1+10**(-((home-away)+(0 if neutral else 75))/400))

def ratings_by_game(frame):
    """Return pre/post ratings keyed by (season, date, team), never future outcomes."""
    output={}
    for season,season_games in frame.groupby('season',sort=True):
        ratings={t:1500.0 for t in season_games.team.unique()}
        paired=season_games.copy()
        paired['pair']=paired.apply(lambda r:'-'.join(sorted([r.team,r.opponent])),axis=1)
        for (date,_),g in paired.groupby(['game_date','pair'],sort=True):
            assert len(g)==2
            homes=g[g.home]
            neutral=homes.empty
            first=(g.sort_values('team') if neutral else homes).iloc[0]
            second=g[g.team==first.opponent].iloc[0]
            a,b=first.team,second.team
            pre_a,pre_b=ratings[a],ratings[b]
            p=expected_home(pre_a,pre_b,neutral)
            change=20*(int(first.result=='W')-p)
            ratings[a]+=change;ratings[b]-=change
            output[(season,date,a)]=(pre_a,ratings[a])
            output[(season,date,b)]=(pre_b,ratings[b])
    return output
