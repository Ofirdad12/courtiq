"""IBBA match URL ingestion. Server-side only.

The parser intentionally keeps calculations deterministic and treats the official
box score as evidence. Player starter/bench labels are only emitted when the
source provides an explicit starter indicator; otherwise they remain unknown.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from data_engine.common import build_game

ALLOWED_HOSTS = {"ibasketball.co.il", "www.ibasketball.co.il"}


def _ma(value: str) -> tuple[int, int]:
    m = re.search(r"(\d+)\s*-\s*(\d+)", value or "")
    if not m:
        raise ValueError(f"Expected made-attempted value, got {value!r}")
    return int(m.group(1)), int(m.group(2))


def _ma_optional(value: str):
    try:
        return _ma(value)
    except ValueError:
        return None


def _num(value: str) -> int:
    m = re.search(r"-?\d+", (value or "").replace(",", ""))
    if not m:
        raise ValueError(f"Expected numeric value, got {value!r}")
    return int(m.group())


def _num_optional(value: str):
    try:
        return _num(value)
    except ValueError:
        return None


def _minutes(value: str):
    """Return numeric IBBA minutes while preserving raw source separately.

    Existing CourtIQ UI treats IBBA values such as 22:77 as decimal hundredths,
    not clock seconds, so the backend mirrors that convention.
    """
    s = (value or "").strip()
    m = re.fullmatch(r"(\d{1,3}):(\d{1,2})", s)
    if m:
        return round(int(m.group(1)) + int(m.group(2)) / 100, 2)
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def validate_ibba_url(url: str) -> str:
    p = urlparse(url)
    if (
        p.scheme != "https"
        or p.hostname not in ALLOWED_HOSTS
        or not re.fullmatch(r"/match/[a-z0-9]+(?:-[a-z0-9]+)*/?", p.path, re.I)
    ):
        raise ValueError("Only official https://ibasketball.co.il/match/... URLs are supported")
    return url


def fetch_html(url: str) -> str:
    validate_ibba_url(url)
    r = requests.get(
        url,
        timeout=15,
        headers={"User-Agent": "CourtIQ/0.7 (+basketball intelligence)"},
    )
    r.raise_for_status()
    return r.text


def _headers(table):
    row = table.find("tr")
    return [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])] if row else []


def _cells(tr):
    return [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]


def _find_idx(headers, needles):
    for i, h in enumerate(headers):
        if any(n in h for n in needles):
            return i
    raise ValueError(f"Missing expected IBBA column: {needles}")


def _maybe_idx(headers, needles):
    for i, h in enumerate(headers):
        if any(n in h for n in needles):
            return i
    return None


def _at(cells, idx):
    return cells[idx] if idx is not None and idx < len(cells) else ""


def _team_total(table):
    headers = _headers(table)
    total = None
    for tr in table.find_all("tr"):
        cells = _cells(tr)
        if any("סך הכל" in c for c in cells):
            total = cells
            break
    if not total:
        raise ValueError("IBBA player table has no total row")

    pts = _num(total[_find_idx(headers, ["נק'", "נק׳", "נקודות"])])
    two_m, two_a = _ma(total[_find_idx(headers, ["2 נק"])])
    three_m, three_a = _ma(total[_find_idx(headers, ["3 נק"])])
    ftm, fta = _ma(total[_find_idx(headers, ["מהקו", "עונשין"])])
    dreb = _num(total[_find_idx(headers, ["ריב׳ הג׳", "ריב' הג'", "ריב הג", "הגנה"])])
    oreb = _num(total[_find_idx(headers, ["ריב׳ הת׳", "ריב' הת'", "ריב הת", "התקפה"])])
    tov = _num(total[_find_idx(headers, ["איב'", "איב׳", "איבודים"])])
    ast = _num(total[_find_idx(headers, ["אס'", "אס׳", "אסיסטים"])])
    return {
        "points": pts,
        "fgm": two_m + three_m,
        "fga": two_a + three_a,
        "three_pm": three_m,
        "three_pa": three_a,
        "ftm": ftm,
        "fta": fta,
        "oreb": oreb,
        "dreb": dreb,
        "tov": tov,
        "ast": ast,
        "two_pm": two_m,
        "two_pa": two_a,
    }


def _starter_value(value: str):
    s = (value or "").strip().lower()
    if s in {"1", "כן", "yes", "y", "true", "✓", "*", "פתח", "חמישייה"}:
        return True
    if s in {"0", "לא", "no", "n", "false", "-"}:
        return False
    return None


def _player_rows(table, team_name: str):
    headers = _headers(table)
    name_idx = _maybe_idx(headers, ["שחקן", "שם"])
    if name_idx is None:
        return []

    idx = {
        "number": _maybe_idx(headers, ["#", "מס'", "מס׳"]),
        "starter": _maybe_idx(headers, ["חמיש", "פתח", "starter"]),
        "minutes": _maybe_idx(headers, ["דק'", "דק׳", "דקות", "זמן"]),
        "points": _maybe_idx(headers, ["נק'", "נק׳", "נקודות"]),
        "two": _maybe_idx(headers, ["2 נק"]),
        "three": _maybe_idx(headers, ["3 נק"]),
        "ft": _maybe_idx(headers, ["מהקו", "עונשין"]),
        "dreb": _maybe_idx(headers, ["ריב׳ הג׳", "ריב' הג'", "ריב הג", "הגנה"]),
        "oreb": _maybe_idx(headers, ["ריב׳ הת׳", "ריב' הת'", "ריב הת", "התקפה"]),
        "tov": _maybe_idx(headers, ["איב'", "איב׳", "איבודים"]),
        "ast": _maybe_idx(headers, ["אס'", "אס׳", "אסיסטים"]),
        "steals": _maybe_idx(headers, ["חט'", "חט׳", "חטיפות"]),
        "blocks": _maybe_idx(headers, ["חס'", "חס׳", "חסימות"]),
        "plus_minus": _maybe_idx(headers, ["+/-", "+/−", "פלוס מינוס"]),
    }

    players = []
    for tr in table.find_all("tr")[1:]:
        cells = _cells(tr)
        if not cells or any("סך הכל" in c for c in cells):
            continue
        name = _at(cells, name_idx).strip()
        if not name:
            continue

        p = {"team": team_name, "name": name}
        number = _num_optional(_at(cells, idx["number"]))
        if number is not None:
            p["number"] = number

        starter = _starter_value(_at(cells, idx["starter"])) if idx["starter"] is not None else None
        p["starter"] = starter

        minutes_raw = _at(cells, idx["minutes"])
        minutes = _minutes(minutes_raw)
        if minutes_raw:
            p["minutes_raw"] = minutes_raw
        if minutes is not None:
            p["minutes"] = minutes

        for field in ("points", "dreb", "oreb", "tov", "ast", "steals", "blocks", "plus_minus"):
            value = _num_optional(_at(cells, idx[field]))
            if value is not None:
                p[field] = value

        for src, made_key, att_key in (
            ("two", "two_pm", "two_pa"),
            ("three", "three_pm", "three_pa"),
            ("ft", "ftm", "fta"),
        ):
            ma = _ma_optional(_at(cells, idx[src]))
            if ma is not None:
                p[made_key], p[att_key] = ma

        if "oreb" in p and "dreb" in p:
            p["rebounds"] = p["oreb"] + p["dreb"]
        if all(k in p for k in ("two_pm", "three_pm")):
            p["fgm"] = p["two_pm"] + p["three_pm"]
        if all(k in p for k in ("two_pa", "three_pa")):
            p["fga"] = p["two_pa"] + p["three_pa"]

        # Require at least one basketball value so footer/label rows cannot leak in.
        if any(k in p for k in ("points", "minutes", "two_pa", "three_pa", "fta", "rebounds", "ast", "tov")):
            players.append(p)
    return players


def _shooting_row_valid(player: dict) -> bool:
    required = ("points", "two_pm", "two_pa", "three_pm", "three_pa", "ftm", "fta")
    if not all(k in player for k in required):
        return False
    if player["two_pm"] > player["two_pa"] or player["three_pm"] > player["three_pa"] or player["ftm"] > player["fta"]:
        return False
    return 2 * player["two_pm"] + 3 * player["three_pm"] + player["ftm"] == player["points"]


def _data_quality(home: dict, away: dict, home_players: list[dict], away_players: list[dict]) -> dict:
    players = home_players + away_players
    points_match = bool(home_players and away_players) and (
        sum(p.get("points", 0) for p in home_players) == home["points"]
        and sum(p.get("points", 0) for p in away_players) == away["points"]
    )
    shooting_complete = bool(players) and all(_shooting_row_valid(p) for p in players if p.get("minutes", 0) > 0 or p.get("points", 0) > 0)
    starter_values = [p.get("starter") for p in players if p.get("starter") is not None]
    explicit_starters = bool(starter_values)

    checks = {
        "team_totals_verified": True,
        "player_rows_present": bool(home_players and away_players),
        "player_points_match_team_totals": points_match,
        "player_shooting_rows_consistent": shooting_complete,
        "starter_flags_from_source": explicit_starters,
    }
    weights = {
        "team_totals_verified": 40,
        "player_rows_present": 20,
        "player_points_match_team_totals": 20,
        "player_shooting_rows_consistent": 15,
        "starter_flags_from_source": 5,
    }
    score = sum(weights[k] for k, ok in checks.items() if ok)
    warnings = []
    if not checks["player_rows_present"]:
        warnings.append("Player rows were not available in the parsed box score; player scouting is limited.")
    if checks["player_rows_present"] and not points_match:
        warnings.append("Player point totals do not reconcile to team totals; player conclusions should be reviewed.")
    if checks["player_rows_present"] and not shooting_complete:
        warnings.append("One or more player shooting rows are incomplete or inconsistent.")
    if not explicit_starters:
        warnings.append("Starter flags were not supplied by the source; CourtIQ will not label unknown players as bench.")

    return {
        "score": score,
        "grade": "verified" if score >= 90 else "usable" if score >= 70 else "limited",
        "checks": checks,
        "warnings": warnings,
    }


def parse_ibba_html(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    # Quarter table: identify by Hebrew quarter headers.
    qtable = None
    for t in soup.find_all("table"):
        hs = " | ".join(_headers(t))
        if "רבע 1" in hs and "רבע 4" in hs:
            qtable = t
            break
    if not qtable:
        raise ValueError("Could not locate IBBA quarter table")

    rows = []
    for tr in qtable.find_all("tr")[1:]:
        cells = _cells(tr)
        if len(cells) >= 6 and cells[0]:
            rows.append(cells)
    if len(rows) < 2:
        raise ValueError("Could not read two teams from IBBA quarter table")

    home_name, away_name = rows[0][0], rows[1][0]
    quarters = {
        "home": [_num(x) for x in rows[0][1:5]],
        "away": [_num(x) for x in rows[1][1:5]],
    }

    player_tables = []
    for t in soup.find_all("table"):
        hs = " | ".join(_headers(t))
        if "2 נק" in hs and "3 נק" in hs and "איב" in hs and "אס" in hs:
            player_tables.append(t)
    if len(player_tables) < 2:
        raise ValueError("Could not locate both IBBA team box-score tables")

    home = _team_total(player_tables[0])
    away = _team_total(player_tables[1])
    home["team"] = home_name
    away["team"] = away_name

    home_players = _player_rows(player_tables[0], home_name)
    away_players = _player_rows(player_tables[1], away_name)

    title = soup.title.get_text(" ", strip=True) if soup.title else f"{home_name} — {away_name}"
    text = soup.get_text(" ", strip=True)
    date_match = re.search(r"\b(\d{2}-\d{2}-\d{4})\b", text)
    metadata = {
        "id": re.search(r"/match/([^/]+)", url).group(1),
        "home_team": home_name,
        "away_team": away_name,
        "date": date_match.group(1) if date_match else None,
        "title": title,
        "quarters": quarters,
        "score": [home["points"], away["points"]],
    }

    game = build_game(
        home,
        away,
        metadata,
        {"provider": "IBBA", "url": url, "input": "official match URL"},
    )
    game["home"]["raw"]["ast"] = home["ast"]
    game["away"]["raw"]["ast"] = away["ast"]
    game["players"] = {"home": home_players, "away": away_players}
    game["data_quality"] = _data_quality(home, away, home_players, away_players)
    game["evidence"] = {
        "provider": "IBBA",
        "source_url": url,
        "game_id": metadata["id"],
        "team_boxscore": True,
        "player_boxscore": bool(home_players and away_players),
        "starter_flags_verified": game["data_quality"]["checks"]["starter_flags_from_source"],
    }
    return game


def import_ibba_url(url: str) -> dict:
    return parse_ibba_html(fetch_html(url), validate_ibba_url(url))
