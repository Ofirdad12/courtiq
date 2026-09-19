"""Normalize EuroLeague raw boxscore totals into CourtIQ's stable schema."""

ALIASES = {
    "fgm": ("FieldGoalsMade", "FGM", "fieldGoalsMade"),
    "fga": ("FieldGoalsAttempted", "FGA", "fieldGoalsAttempted"),
    "three_pm": ("ThreePointersMade", "3PM", "ThreePointsMade", "threePointersMade"),
    "fta": ("FreeThrowsAttempted", "FTA", "freeThrowsAttempted"),
    "ftm": ("FreeThrowsMade", "FTM", "freeThrowsMade"),
    "oreb": ("OffensiveRebounds", "OREB", "OffensiveRebound", "offensiveRebounds"),
    "dreb": ("DefensiveRebounds", "DREB", "DefensiveRebound", "defensiveRebounds"),
    "tov": ("Turnovers", "TOV", "TO", "turnovers"),
    "points": ("Points", "PTS", "points"),
}

def _pick(row: dict, aliases: tuple[str, ...], field: str):
    for key in aliases:
        if key in row and row[key] is not None:
            return row[key]
    raise KeyError(
        f"Cannot map '{field}'. Available API fields: {sorted(row.keys())}"
    )

def _number(value):
    if isinstance(value, str):
        value = value.replace("%", "").strip()
    try:
        return int(value)
    except (TypeError, ValueError):
        return float(value)

def normalize_total(row: dict, side: str) -> dict:
    result = {"side": side}
    for field, aliases in ALIASES.items():
        result[field] = _number(_pick(row, aliases, field))
    return result

def extract_team_totals(raw_stats: list[dict]) -> tuple[dict, dict]:
    """
    euroleague-api Stats payload contains home/away dictionaries.
    The library itself builds team totals from each item's 'totr' object.
    """
    if not isinstance(raw_stats, list) or len(raw_stats) != 2:
        raise ValueError("Expected exactly two team objects in Stats payload.")

    home_raw = raw_stats[0].get("totr")
    away_raw = raw_stats[1].get("totr")
    if not isinstance(home_raw, dict) or not isinstance(away_raw, dict):
        raise KeyError("EuroLeague Stats payload did not contain expected 'totr' totals.")

    return normalize_total(home_raw, "home"), normalize_total(away_raw, "away")
