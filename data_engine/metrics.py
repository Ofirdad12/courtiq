"""Pure basketball calculations. No LLM calculations live here."""

def _pct(n, d):
    return round((n / d) * 100, 1) if d else 0.0

def compute_four_factors(team: dict, opponent: dict) -> dict:
    """Dean Oliver-style Four Factors from normalized team totals."""
    fgm = team["fgm"]
    fga = team["fga"]
    three_pm = team["three_pm"]
    fta = team["fta"]
    oreb = team["oreb"]
    tov = team["tov"]
    opp_dreb = opponent["dreb"]

    # TOV factor denominator is scoring attempts + turnovers.
    tov_opportunities = fga + 0.44 * fta + tov

    return {
        "eFG%": _pct(fgm + 0.5 * three_pm, fga),
        "TOV%": _pct(tov, tov_opportunities),
        "ORB%": _pct(oreb, oreb + opp_dreb),
        "FTr": _pct(fta, fga),
    }

def estimate_possessions(team: dict) -> float:
    """Simple team possession estimate for downstream ratings."""
    return round(
        team["fga"] + 0.44 * team["fta"] - team["oreb"] + team["tov"],
        2,
    )

def compute_team_analytics(team: dict, opponent: dict, game_minutes: float = 40) -> dict:
    """CourtIQ formula set v2 from verified box-score totals."""
    poss = estimate_possessions(team)
    opp_poss = estimate_possessions(opponent)
    fgm, fga = team["fgm"], team["fga"]
    two_pm, two_pa = team["two_pm"], team["two_pa"]
    three_pm, three_pa = team["three_pm"], team["three_pa"]
    ftm, fta = team["ftm"], team["fta"]
    trb = team["oreb"] + team["dreb"]
    opp_trb = opponent["oreb"] + opponent["dreb"]
    ortg = round(team["points"] / poss * 100, 1) if poss else 0.0
    drtg = round(opponent["points"] / opp_poss * 100, 1) if opp_poss else 0.0
    return {
        "FG%": _pct(fgm, fga), "2P%": _pct(two_pm, two_pa), "3P%": _pct(three_pm, three_pa), "FT%": _pct(ftm, fta),
        "eFG%": _pct(fgm + 0.5 * three_pm, fga),
        "TS%": _pct(team["points"], 2 * (fga + 0.44 * fta)),
        "PPS": round(team["points"] / fga, 2) if fga else 0.0,
        "3PA Rate": _pct(three_pa, fga), "Poss": poss,
        "ORtg": ortg, "DRtg": drtg, "Net Rating": round(ortg - drtg, 1),
        "TOV%": _pct(team["tov"], fga + 0.44 * fta + team["tov"]),
        "ORB%": _pct(team["oreb"], team["oreb"] + opponent["dreb"]),
        "DRB%": _pct(team["dreb"], team["dreb"] + opponent["oreb"]),
        "TRB%": _pct(trb, trb + opp_trb),
        "AST/TO": round(team["ast"] / team["tov"], 2) if team["tov"] else ("∞" if team["ast"] else 0),
        "Assisted FG%": _pct(team["ast"], fgm), "FTr": _pct(fta, fga),
        "Pace": round(poss / game_minutes * 40, 1) if game_minutes else 0.0,
        "+/-": team["points"] - opponent["points"],
    }
