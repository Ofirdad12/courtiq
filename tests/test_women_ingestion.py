import json
from pathlib import Path

from data_engine.adapters.israel_women import ingest_israel_women
from data_engine.adapters.fiba_women import ingest_fiba_women

ROOT = Path(__file__).resolve().parents[1]

def _assert_verified(game):
    assert game["validation"]["status"] == "verified"
    assert game["home"]["four_factors"]["eFG%"] > 0
    assert game["away"]["four_factors"]["eFG%"] > 0
    assert game["schema_version"] == "courtiq.game.v0.3"

def test_israel_women_example():
    game = ingest_israel_women(str(ROOT / "examples" / "israel_women_boxscore.csv"))
    _assert_verified(game)
    assert game["game"]["home_team"] == "Example Home"
    assert game["source"]["provider"] == "IBBA/SWISH"

def test_fiba_women_example():
    game = ingest_fiba_women(str(ROOT / "examples" / "fiba_women_boxscore.json"))
    _assert_verified(game)
    assert game["game"]["home_team"] == "Example Home"
    assert game["source"]["provider"] == "FIBA LiveStats/GDAP"
