"""Fail closed when basketball data is incomplete or impossible."""

REQUIRED = ("fgm","fga","three_pm","fta","ftm","oreb","dreb","tov","points")

def validate_team(team: dict) -> list[str]:
    errors = []
    for key in REQUIRED:
        if key not in team:
            errors.append(f"missing {key}")
        elif team[key] < 0:
            errors.append(f"{key} cannot be negative")

    if errors:
        return errors
    if team["fgm"] > team["fga"]:
        errors.append("FGM > FGA")
    if team["three_pm"] > team["fgm"]:
        errors.append("3PM > FGM")
    if team["ftm"] > team["fta"]:
        errors.append("FTM > FTA")
    return errors

def validate_game(home: dict, away: dict) -> dict:
    errors = {
        "home": validate_team(home),
        "away": validate_team(away),
    }
    ok = not errors["home"] and not errors["away"]
    return {"status": "verified" if ok else "failed", "errors": errors}
