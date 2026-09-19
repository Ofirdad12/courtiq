"""Israeli Women's Premier League / Winner Cup ingestion.

Designed for official IBBA/SWISH boxscore exports supplied as CSV or JSON.
We intentionally do not scrape undocumented private endpoints.
"""

import csv
import json
from pathlib import Path

from .tabular import normalize_row
from ..common import build_game

def _load_rows(path: str) -> list[dict]:
    p = Path(path)
    if p.suffix.lower() == ".csv":
        with p.open(encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))

    payload = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    for key in ("teams", "teamStats", "boxscore", "rows"):
        if isinstance(payload.get(key), list):
            return payload[key]
    raise ValueError("Expected a two-team JSON list or an object containing teams/teamStats/boxscore/rows.")

def ingest_israel_women(path: str, *, competition="Israeli Women's Premier League",
                        season=None, game_id=None, date=None) -> dict:
    rows = _load_rows(path)
    if len(rows) != 2:
        raise ValueError(f"Expected exactly 2 team-total rows, got {len(rows)}.")

    # Export order is treated as home then away unless an explicit side field says otherwise.
    home_row, away_row = rows
    for row in rows:
        side = str(row.get("side") or row.get("home_away") or "").lower()
        if side in {"home", "h", "1", "true"}:
            home_row = row
        elif side in {"away", "a", "0", "false"}:
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
        {"provider": "IBBA/SWISH", "input": "official export", "file": p_name(path)},
    )

def p_name(path):
    return Path(path).name
