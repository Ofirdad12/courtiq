"""Normalize common basketball boxscore rows from CSV/JSON exports."""

ALIASES = {
    "team": ("team", "team_name", "Team", "TeamName", "name", "שם קבוצה"),
    "side": ("side", "home_away", "homeAway", "isHome"),
    "points": ("points", "PTS", "Points", "sPoints", "נקודות"),
    "fgm": ("fgm", "FGM", "FieldGoalsMade", "sFieldGoalsMade"),
    "fga": ("fga", "FGA", "FieldGoalsAttempted", "sFieldGoalsAttempted"),
    "two_pm": ("two_pm", "2PM", "TwoPointersMade", "sTwoPointersMade"),
    "two_pa": ("two_pa", "2PA", "TwoPointersAttempted", "sTwoPointersAttempted"),
    "three_pm": ("three_pm", "3PM", "ThreePointersMade", "sThreePointersMade"),
    "three_pa": ("three_pa", "3PA", "ThreePointersAttempted", "sThreePointersAttempted"),
    "ftm": ("ftm", "FTM", "FreeThrowsMade", "sFreeThrowsMade"),
    "fta": ("fta", "FTA", "FreeThrowsAttempted", "sFreeThrowsAttempted"),
    "oreb": ("oreb", "OREB", "OffensiveRebounds", "sReboundsOffensive"),
    "dreb": ("dreb", "DREB", "DefensiveRebounds", "sReboundsDefensive"),
    "tov": ("tov", "TOV", "TO", "Turnovers", "sTurnovers"),
}

def _find(row, field):
    for key in ALIASES[field]:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return None

def _num(value, field):
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return float(str(value).replace("%", "").strip())
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid numeric value for {field}: {value!r}") from exc

def normalize_row(row: dict, side: str) -> dict:
    three_pm = _find(row, "three_pm")
    three_pa = _find(row, "three_pa")
    if three_pm is None or three_pa is None:
        raise KeyError("3PM and 3PA are required for CourtIQ Four Factors.")
    three_pm, three_pa = _num(three_pm, "three_pm"), _num(three_pa, "three_pa")

    fgm, fga = _find(row, "fgm"), _find(row, "fga")
    if fgm is None:
        two_pm = _find(row, "two_pm")
        if two_pm is None:
            raise KeyError("Need FGM or 2PM to derive total field goals made.")
        fgm = _num(two_pm, "two_pm") + three_pm
    else:
        fgm = _num(fgm, "fgm")

    if fga is None:
        two_pa = _find(row, "two_pa")
        if two_pa is None:
            raise KeyError("Need FGA or 2PA to derive total field goal attempts.")
        fga = _num(two_pa, "two_pa") + three_pa
    else:
        fga = _num(fga, "fga")

    def required(field):
        value = _find(row, field)
        if value is None:
            raise KeyError(f"Missing required field '{field}'. Available: {sorted(row.keys())}")
        return _num(value, field)

    return {
        "side": side,
        "team": str(_find(row, "team") or side),
        "points": required("points"),
        "fgm": fgm,
        "fga": fga,
        "three_pm": three_pm,
        "three_pa": three_pa,
        "ftm": required("ftm"),
        "fta": required("fta"),
        "oreb": required("oreb"),
        "dreb": required("dreb"),
        "tov": required("tov"),
    }
