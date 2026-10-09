"""Official Polish Basketball League (PLK) match URL ingestion."""
from __future__ import annotations

import re
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from data_engine.common import build_game

ALLOWED_HOSTS = {"plk.pl", "www.plk.pl"}


def _ma(value):
    m = re.search(r"(\d+)\s*/\s*(\d+)", value or "")
    if not m:
        raise ValueError(f"Expected made/attempted value, got {value!r}")
    return int(m.group(1)), int(m.group(2))


def _num(value):
    m = re.search(r"-?\d+", (value or "").replace("\xa0", " "))
    if not m:
        return 0
    return int(m.group())


def _minutes(value):
    m = re.fullmatch(r"(\d{1,3}):(\d{2})", (value or "").strip())
    if not m:
        return None
    return round(int(m.group(1)) + int(m.group(2)) / 60, 2)


def validate_plk_url(url):
    p = urlparse(url)
    if (
        p.scheme != "https"
        or p.hostname not in ALLOWED_HOSTS
        or not re.fullmatch(r"/mecz/(\d+)(?:/[^?#]+)?/?", p.path, re.I)
    ):
        raise ValueError("Only official https://plk.pl/mecz/... URLs are supported")
    return url


def fetch_html(url):
    validate_plk_url(url)
    r = requests.get(
        url,
        timeout=20,
        headers={"User-Agent": "CourtIQ/0.7 (+basketball intelligence)"},
    )
    r.raise_for_status()
    return r.text


def _cells(tr):
    return [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]


def _total(cells):
    # PLK total row:
    # label, PTS, MIN, 2P M/A, 2P%, 3P M/A, 3P%, FG M/A, FG%, FT M/A,
    # FT%, OREB, DREB, REB, AST, fouls, fouls drawn, STL, TOV, BLK,
    # BLK against, EVAL.
    if len(cells) < 22:
        raise ValueError(f"Unexpected PLK total row ({len(cells)} cells)")
    two_m, two_a = _ma(cells[3])
    three_m, three_a = _ma(cells[5])
    fgm, fga = _ma(cells[7])
    ftm, fta = _ma(cells[9])
    return {
        "points": _num(cells[1]),
        "fgm": fgm,
        "fga": fga,
        "two_pm": two_m,
        "two_pa": two_a,
        "three_pm": three_m,
        "three_pa": three_a,
        "ftm": ftm,
        "fta": fta,
        "oreb": _num(cells[11]),
        "dreb": _num(cells[12]),
        "tov": _num(cells[18]),
        "ast": _num(cells[14]),
        "steals": _num(cells[17]),
        "blocks": _num(cells[19]),
        "eval": _num(cells[21]),
    }


def _player(cells, team):
    # PLK player row:
    # NR, player, PTS, MIN, 2P M/A, 2P%, 3P M/A, 3P%, FG M/A, FG%,
    # FT M/A, FT%, OREB, DREB, REB, AST, fouls, fouls drawn, STL, TOV,
    # BLK, BLK against, EVAL, +/-.
    if len(cells) < 23 or not re.fullmatch(r"\d+", cells[0] or ""):
        return None
    if not re.fullmatch(r"\d{1,3}:\d{2}", cells[3] or ""):
        return None

    two_m, two_a = _ma(cells[4]) if "/" in cells[4] else (0, 0)
    three_m, three_a = _ma(cells[6]) if "/" in cells[6] else (0, 0)
    fgm, fga = _ma(cells[8]) if "/" in cells[8] else (two_m + three_m, two_a + three_a)
    ftm, fta = _ma(cells[10]) if "/" in cells[10] else (0, 0)
    minutes_raw = cells[3]

    return {
        "team": team,
        "number": _num(cells[0]),
        "name": cells[1],
        "points": _num(cells[2]),
        "minutes_raw": minutes_raw,
        "minutes": _minutes(minutes_raw),
        "starter": None,
        "two_pm": two_m,
        "two_pa": two_a,
        "three_pm": three_m,
        "three_pa": three_a,
        "fgm": fgm,
        "fga": fga,
        "ftm": ftm,
        "fta": fta,
        "oreb": _num(cells[12]),
        "dreb": _num(cells[13]),
        "rebounds": _num(cells[14]),
        "ast": _num(cells[15]),
        "steals": _num(cells[18]),
        "tov": _num(cells[19]),
        "blocks": _num(cells[20]),
        "eval": _num(cells[22]),
        "plus_minus": _num(cells[23]) if len(cells) > 23 else None,
    }


def _player_shooting_valid(p):
    return (
        p["two_pm"] <= p["two_pa"]
        and p["three_pm"] <= p["three_pa"]
        and p["ftm"] <= p["fta"]
        and 2 * p["two_pm"] + 3 * p["three_pm"] + p["ftm"] == p["points"]
    )


def _data_quality(home, away, home_players, away_players):
    all_players = home_players + away_players
    player_points_match = bool(home_players and away_players) and (
        sum(p["points"] for p in home_players) == home["points"]
        and sum(p["points"] for p in away_players) == away["points"]
    )
    shooting_consistent = bool(all_players) and all(_player_shooting_valid(p) for p in all_players)
    checks = {
        "team_totals_verified": True,
        "player_rows_present": bool(home_players and away_players),
        "player_points_match_team_totals": player_points_match,
        "player_shooting_rows_consistent": shooting_consistent,
        "starter_flags_from_source": False,
    }
    weights = {
        "team_totals_verified": 40,
        "player_rows_present": 20,
        "player_points_match_team_totals": 20,
        "player_shooting_rows_consistent": 15,
        "starter_flags_from_source": 5,
    }
    score = sum(weights[k] for k, ok in checks.items() if ok)
    warnings = [
        "PLK box score does not provide a reliable starter flag in this parser; players remain starter=unknown."
    ]
    if checks["player_rows_present"] and not player_points_match:
        warnings.append("Player point totals do not reconcile to team totals; review player-level conclusions.")
    if checks["player_rows_present"] and not shooting_consistent:
        warnings.append("One or more PLK player shooting rows are inconsistent with points.")
    return {
        "score": score,
        "grade": "verified" if score >= 90 else "usable" if score >= 70 else "limited",
        "checks": checks,
        "warnings": warnings,
    }


def parse_plk_html(html, url):
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    m = re.search(r"(.+?)\s+vs\s+(.+?)\s*\|", title, re.I)
    if not m:
        raise ValueError("Could not identify PLK teams from page title")
    home_name, away_name = m.group(1).strip(), m.group(2).strip()

    total_rows = []
    player_groups = [[], []]
    group = 0
    for tr in soup.find_all("tr"):
        cells = _cells(tr)
        if not cells:
            continue
        if cells[0].lower() == "suma":
            total_rows.append(cells)
            group = min(len(total_rows), 1)
            continue
        if (
            len(cells) >= 23
            and re.fullmatch(r"\d+", cells[0] or "")
            and re.fullmatch(r"\d{1,3}:\d{2}", cells[3] or "")
        ):
            player_groups[group].append(cells)
    if len(total_rows) != 2:
        raise ValueError(f"Expected 2 PLK team total rows, got {len(total_rows)}")

    home = _total(total_rows[0])
    away = _total(total_rows[1])
    home["team"] = home_name
    away["team"] = away_name

    home_players = [p for r in player_groups[0] if (p := _player(r, home_name))]
    away_players = [p for r in player_groups[1] if (p := _player(r, away_name))]

    game_id = re.search(r"/mecz/(\d+)", url).group(1)
    text = soup.get_text(" ", strip=True)
    dm = re.search(r"\b(\d{2}\.\d{2}\.\d{4})\b", text)
    metadata = {
        "id": game_id,
        "competition": "Polska Liga Koszykówki",
        "home_team": home_name,
        "away_team": away_name,
        "date": dm.group(1) if dm else None,
        "title": title,
        "score": [home["points"], away["points"]],
    }
    game = build_game(
        home,
        away,
        metadata,
        {"provider": "PLK", "url": url, "input": "official match URL"},
    )
    game["players"] = {"home": home_players, "away": away_players}
    game["home"]["raw"].update({k: home[k] for k in ("two_pm", "two_pa", "ast", "steals", "blocks", "eval")})
    game["away"]["raw"].update({k: away[k] for k in ("two_pm", "two_pa", "ast", "steals", "blocks", "eval")})
    game["data_quality"] = _data_quality(home, away, home_players, away_players)
    game["evidence"] = {
        "provider": "PLK",
        "source_url": url,
        "game_id": game_id,
        "team_boxscore": True,
        "player_boxscore": bool(home_players and away_players),
        "starter_flags_verified": False,
    }
    return game


def import_plk_url(url):
    return parse_plk_html(fetch_html(url), validate_plk_url(url))
