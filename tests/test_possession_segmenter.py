from ai.possession_segmenter import segment

def f(i, team):
    return {"frame":i,"players":[
      {"track_id":"a","team":"A","x":10,"y":10,"has_ball":team=="A"},
      {"track_id":"b","team":"B","x":20,"y":20,"has_ball":team=="B"},
    ]}

def test_segments_only_after_stable_control_change():
    frames=[f(i,"A") for i in range(5)]+[f(i,"B") for i in range(5,10)]
    out=segment({"fps":25,"frames":frames},min_control_frames=3)
    assert [p["offense"] for p in out["possessions"]]==["A","B"]
    assert out["possessions"][0]["frames"][0]["frame"]==0
    assert out["possessions"][1]["frames"][0]["frame"]==5

def test_ignores_single_frame_control_noise():
    frames=[f(i,"A") for i in range(4)]+[f(4,"B")]+[f(i,"A") for i in range(5,9)]
    out=segment({"fps":25,"frames":frames},min_control_frames=3)
    assert len(out["possessions"])==1
    assert out["possessions"][0]["offense"]=="A"
