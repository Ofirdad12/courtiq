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
