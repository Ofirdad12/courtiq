"""EuroLeague/EuroCup ingestion adapter."""

from euroleague_api.boxscore_data import BoxScoreData

def fetch_raw_stats(competition: str, season: int, game_code: int) -> list[dict]:
    """
    Fetch the raw 'Stats' payload.

    competition: E = EuroLeague, U = EuroCup
    season: season start year, e.g. 2025 for 2025-26
    """
    if competition not in {"E", "U"}:
        raise ValueError("competition must be 'E' (EuroLeague) or 'U' (EuroCup)")
    api = BoxScoreData(competition)
    return api.get_boxscore_data(season, game_code, "Stats")
