"""FIBA / EuroCup Women ingestion from official FIBA LiveStats/GDAP JSON exports.

Supports common team-stat structures and the documented s* statistics names.
Direct GDAP pulling is deliberately separate because FIBA requires authenticated
product access/subscription for its APIs.
"""

import json
from pathlib import Path

from .tabular import normalize_row
from ..common import build_game

def _team_rows(payload: dict) -> list[dict]:
    # Common export shapes.
    for key in ("teams", "teamStats", "boxscore", "competitors"):
        value = payload.get(key)
        if isinstance(value, list) and len(value) == 2:
            return value

    # FIBA LiveStats feeds may expose teams as a dictionary.
    teams = payload.get("team") or payload.get("Teams")
    if isinstance(teams, dict) and len(teams) == 2:
        return list(teams.values())

    raise ValueError(
        "Could not find two team-stat objects in FIBA JSON. "
        "Export official team boxscore JSON and inspect its top-level structure."
    )

def _flatten(row: dict) -> dict:
    stats = row.get("statistics") or row.get("stats") or {}
    merged = dict(row)
    if isinstance(stats, dict):
        merged.update(stats)
    # Preserve common team-name locations.
    merged["team"] = (
        row.get("teamName")
        or row.get("name")
        or row.get("team")
        or merged.get("team")
    )
    return merged

def ingest_fiba_women(path: str, *, competition="EuroCup Women",
                      season=None, game_id=None, date=None) -> dict:
    p = Path(path)
    payload = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("FIBA ingestion expects a JSON object.")

    rows = [_flatten(r) for r in _team_rows(payload)]

    # Prefer explicit FIBA home markers where present.
    home_row, away_row = rows
    for row in rows:
        home_marker = row.get("isHomeCompetitor")
        side = str(row.get("side") or "").lower()
        if home_marker in (1, "1", True) or side == "home":
            home_row = row
        elif home_marker in (0, "0", False) or side == "away":
            away_row = row

    home = normalize_row(home_row, "home")
    away = normalize_row(away_row, "away")
    metadata = {
        "competition": competition,
        "season": season,
        "game_id": game_id,
        "date": date,
        "home_team": home["team"],
        "away_team": away["team"],
        "score": [home["points"], away["points"]],
    }
    return build_game(
        home, away, metadata,
        {"provider": "FIBA LiveStats/GDAP", "input": "official JSON export", "file": p.name},
    )
