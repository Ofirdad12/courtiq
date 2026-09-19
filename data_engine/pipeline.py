"""CourtIQ V0.2: API -> normalize -> validate -> calculate -> JSON."""

import argparse
import json
from pathlib import Path

from .fetch_game import fetch_raw_stats
from .metrics import compute_four_factors, estimate_possessions
from .normalize import extract_team_totals
from .validate import validate_game

def analyze_game(competition: str, season: int, game_code: int) -> dict:
    raw = fetch_raw_stats(competition, season, game_code)
    home, away = extract_team_totals(raw)

    validation = validate_game(home, away)
    if validation["status"] != "verified":
        raise ValueError(f"Boxscore validation failed: {validation['errors']}")

    return {
        "schema_version": "courtiq.game.v0.2",
        "game": {
            "competition_code": competition,
            "season": season,
            "game_code": game_code,
        },
        "home": {
            "raw": home,
            "possessions_est": estimate_possessions(home),
            "four_factors": compute_four_factors(home, away),
        },
        "away": {
            "raw": away,
            "possessions_est": estimate_possessions(away),
            "four_factors": compute_four_factors(away, home),
        },
        "validation": validation,
    }

def main():
    parser = argparse.ArgumentParser(description="CourtIQ EuroLeague data engine")
    parser.add_argument("--competition", default="E", choices=["E", "U"])
    parser.add_argument("--season", type=int, required=True)
    parser.add_argument("--game", type=int, required=True)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    result = analyze_game(args.competition, args.season, args.game)
    text = json.dumps(result, indent=2, ensure_ascii=False)

    if args.out:
        path = Path(args.out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text + "\n", encoding="utf-8")
        print(f"Wrote verified CourtIQ game JSON -> {path}")
    else:
        print(text)

if __name__ == "__main__":
    main()
