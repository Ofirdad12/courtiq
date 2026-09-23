from ai.team_assignment import assign

def test_assigns_stable_tracks_to_team():
    frames=[{"frame":i,"players":[
      {"track_id":"a","bbox":[0,0,1,1],"appearance":[220,20,20]},
      {"track_id":"b","bbox":[0,0,1,1],"appearance":[20,20,220]},
    ]} for i in range(4)]
    out=assign({"teams":{"HOME":{"centroid":[230,20,20]},"AWAY":{"centroid":[20,20,230]}},"frames":frames})
    assert out["team_assignments"]["a"]["team"]=="HOME"
    assert out["team_assignments"]["b"]["team"]=="AWAY"
    assert out["frames"][0]["players"][0]["team"]=="HOME"

def test_uncertain_appearance_is_not_forced():
    frames=[{"frame":0,"players":[{"track_id":"x","bbox":[0,0,1,1],"appearance":[125,20,125]}]}]
    out=assign({"teams":{"HOME":{"centroid":[230,20,20]},"AWAY":{"centroid":[20,20,230]}},"frames":frames})
    assert "x" not in out["team_assignments"]
    assert out["frames"][0]["players"][0].get("team") is None
