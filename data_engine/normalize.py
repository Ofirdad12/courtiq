"""Normalize EuroLeague raw boxscore totals into CourtIQ's stable schema."""

ALIASES = {
    "fgm": ("FieldGoalsMade", "FGM", "fieldGoalsMade"),
    "fga": ("FieldGoalsAttempted", "FGA", "fieldGoalsAttempted"),
    "two_pm": ("TwoPointersMade", "2PM", "FieldGoalsMade2", "twoPointersMade"),
    "two_pa": ("TwoPointersAttempted", "2PA", "FieldGoalsAttempted2", "twoPointersAttempted"),
    "three_pm": ("ThreePointersMade", "3PM", "FieldGoalsMade3", "ThreePointsMade", "threePointersMade"),
    "three_pa": ("ThreePointersAttempted", "3PA", "FieldGoalsAttempted3", "threePointersAttempted"),
    "fta": ("FreeThrowsAttempted", "FTA", "freeThrowsAttempted"),
    "ftm": ("FreeThrowsMade", "FTM", "freeThrowsMade"),
    "oreb": ("OffensiveRebounds", "OREB", "OffensiveRebound", "offensiveRebounds"),
    "dreb": ("DefensiveRebounds", "DREB", "DefensiveRebound", "defensiveRebounds"),
    "tov": ("Turnovers", "TOV", "TO", "turnovers"),
    "points": ("Points", "PTS", "points"),
}

def _find(row: dict, aliases: tuple[str, ...]):
    for key in aliases:
        if key in row and row[key] is not None:
            return row[key]
    return None

def _number(value):
    if isinstance(value, str):
        value = value.replace("%", "").strip()
    try:
        return int(value)
    except (TypeError, ValueError):
        return float(value)

def _required(row: dict, field: str):
    value = _find(row, ALIASES[field])
    if value is None:
        raise KeyError(f"Cannot map '{field}'. Available API fields: {sorted(row.keys())}")
    return _number(value)

def normalize_total(row: dict, side: str) -> dict:
    # Some API versions expose total FGM/FGA; others expose 2P + 3P splits.
    three_pm = _required(row, "three_pm")
    three_pa = _required(row, "three_pa")

    fgm_raw = _find(row, ALIASES["fgm"])
    fga_raw = _find(row, ALIASES["fga"])
    if fgm_raw is None:
        fgm = _required(row, "two_pm") + three_pm
    else:
        fgm = _number(fgm_raw)
    if fga_raw is None:
        fga = _required(row, "two_pa") + three_pa
    else:
        fga = _number(fga_raw)

    return {
        "side": side,
        "fgm": fgm,
        "fga": fga,
        "three_pm": three_pm,
        "three_pa": three_pa,
        "fta": _required(row, "fta"),
        "ftm": _required(row, "ftm"),
        "oreb": _required(row, "oreb"),
        "dreb": _required(row, "dreb"),
        "tov": _required(row, "tov"),
        "points": _required(row, "points"),
    }

def extract_team_totals(raw_stats: list[dict]) -> tuple[dict, dict]:
    """
    euroleague-api Stats payload contains home/away dictionaries.
    The upstream library builds each team's total row from the 'totr' object.
    """
    if not isinstance(raw_stats, list) or len(raw_stats) != 2:
        raise ValueError("Expected exactly two team objects in Stats payload.")

    home_raw = raw_stats[0].get("totr")
    away_raw = raw_stats[1].get("totr")
    if not isinstance(home_raw, dict) or not isinstance(away_raw, dict):
        raise KeyError("EuroLeague Stats payload did not contain expected 'totr' totals.")

    return normalize_total(home_raw, "home"), normalize_total(away_raw, "away")
