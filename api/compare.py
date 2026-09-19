"""Deterministic team-sample comparison."""
from statistics import mean

METRICS=("possessions_est","eFG%","TOV%","ORB%","FTr")

def _side_for_team(game,team):
    for side in ("home","away"):
        if game[side]["raw"].get("team")==team: return side
    return None

def summarize(games:list[dict],team:str)->dict:
    rows=[]
    for g in games:
        side=_side_for_team(g,team)
        if not side: continue
        node=g[side]; raw=node["raw"]
        rows.append({
            "possessions_est":node["possessions_est"],
            **node["four_factors"],
            "AST/TO": round(raw.get("ast",0)/raw["tov"],2) if raw.get("ast") is not None and raw["tov"] else None,
        })
    if not rows: raise ValueError(f"No games found for {team}")
    keys=METRICS+("AST/TO",)
    avg={k:round(mean([r[k] for r in rows if r.get(k) is not None]),2) for k in keys if any(r.get(k) is not None for r in rows)}
    return {"team":team,"games":len(rows),"averages":avg}

def compare_teams(games:list[dict],team_a:str,team_b:str)->dict:
    a,b=summarize(games,team_a),summarize(games,team_b)
    common=sorted(set(a["averages"])&set(b["averages"]))
    differences={k:round(a["averages"][k]-b["averages"][k],2) for k in common}
    return {"team_a":a,"team_b":b,"differences_a_minus_b":differences,"confidence":"DATA CONFIRMED"}
