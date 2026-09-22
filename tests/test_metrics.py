from data_engine.metrics import compute_four_factors, compute_team_analytics

def test_four_factors_known_inputs():
    home = {"fgm":35,"fga":72,"three_pm":10,"fta":24,"oreb":11,"dreb":30,"tov":7}
    away = {"fgm":30,"fga":61,"three_pm":12,"fta":15,"oreb":9,"dreb":27,"tov":17}
    result = compute_four_factors(home, away)
    assert result["eFG%"] == 55.6
    assert result["TOV%"] == 7.8
    assert result["ORB%"] == 28.9
    assert result["FTr"] == 33.3

def test_courtiq_formula_set_v2():
    home = {"points":101,"fgm":35,"fga":72,"two_pm":25,"two_pa":45,"three_pm":10,"three_pa":27,"ftm":21,"fta":24,"oreb":11,"dreb":30,"tov":7,"ast":20}
    away = {"points":83,"fgm":30,"fga":61,"two_pm":18,"two_pa":31,"three_pm":12,"three_pa":30,"ftm":11,"fta":15,"oreb":9,"dreb":27,"tov":17,"ast":18}
    result = compute_team_analytics(home, away)
    assert result["FG%"] == 48.6
    assert result["eFG%"] == 55.6
    assert result["TS%"] == 61.2
    assert result["PPS"] == 1.4
    assert result["3PA Rate"] == 37.5
    assert result["ORtg"] == 128.6
    assert result["DRtg"] == 109.8
    assert result["Net Rating"] == 18.8
    assert result["DRB%"] == 76.9
    assert result["TRB%"] == 53.2
    assert result["Assisted FG%"] == 57.1
    assert result["+/-"] == 18

def test_formula_set_handles_zero_attempts():
    empty = {"points":0,"fgm":0,"fga":0,"two_pm":0,"two_pa":0,"three_pm":0,"three_pa":0,"ftm":0,"fta":0,"oreb":0,"dreb":0,"tov":0,"ast":0}
    result = compute_team_analytics(empty, empty)
    assert result["FG%"] == 0.0
    assert result["TS%"] == 0.0
    assert result["PPS"] == 0.0
    assert result["ORtg"] == 0.0
    assert result["AST/TO"] == 0
