from data_engine.metrics import compute_four_factors

def test_four_factors_known_inputs():
    home = {"fgm":35,"fga":72,"three_pm":10,"fta":24,"oreb":11,"dreb":30,"tov":7}
    away = {"fgm":30,"fga":61,"three_pm":12,"fta":15,"oreb":9,"dreb":27,"tov":17}
    result = compute_four_factors(home, away)
    assert result["eFG%"] == 55.6
    assert result["TOV%"] == 7.8
    assert result["ORB%"] == 28.9
    assert result["FTr"] == 33.3
