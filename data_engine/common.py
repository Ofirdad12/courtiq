"""Shared CourtIQ game assembly for every competition/source."""

from .metrics import compute_four_factors, estimate_possessions
from .validate import validate_game

def build_game(home: dict, away: dict, metadata: dict, source: dict) -> dict:
    validation = validate_game(home, away)
    if validation["status"] != "verified":
        raise ValueError(f"Boxscore validation failed: {validation['errors']}")

    return {
        "schema_version": "courtiq.game.v0.3",
        "game": metadata,
        "source": source,
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
