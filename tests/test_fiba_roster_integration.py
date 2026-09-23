from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_eurocup_women_url_import_is_wired_to_player_analytics():
    source = (ROOT / "supabase/functions/import-ibba-game/index.ts").read_text()
    assert 'provider:isFiba?"FIBA"' in source
    assert '"fiba-next-v1"' in source
    assert "fibaPageData($)" in source
    assert "fibaTeamData(teams[0]" in source
    assert "fibaPlayByPlay(fibaData" in source
    assert "linked_player_samples" in source
    assert 'provider==="IBBA"||provider==="FIBA"' in source


def test_ashdod_roster_is_available_in_compare_players_without_fabricated_stats():
    migration = (ROOT / "supabase/migrations/20260923_ashdod_roster_comparison.sql").read_text()
    players = (ROOT / "players.js").read_text()
    expected = [
        "Anja Fuchs-Robetin", "Dor Saar", "Tzilil Vaturi", "Gal Cohen",
        "Abby Meyers", "Jazmine Jones", "Kat Vuckovic", "Yahel Jovanovic",
        "Paula Estebas", "Dalayah Daniels",
    ]
    for name in expected:
        assert name in migration
    assert "AWAITING OFFICIAL GAME DATA" in players
    assert "Metrics will appear automatically" in players
