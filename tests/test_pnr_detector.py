from ai.pnr_detector import detect

def frame(i, switch=False):
    # offense A: handler h + screener s. defense B: dh + ds.
    players=[
      {"track_id":"h","team":"A","x":30+i*.4,"y":24,"has_ball":True},
      {"track_id":"s","team":"A","x":33+i*.15,"y":25},
    ]
    if switch and i>=6:
      players += [{"track_id":"dh","team":"B","x":34+i*.15,"y":25},{"track_id":"ds","team":"B","x":31+i*.4,"y":24}]
    else:
      players += [{"track_id":"dh","team":"B","x":31+i*.4,"y":24},{"track_id":"ds","team":"B","x":34+i*.15,"y":25}]
    return {"frame":i*25,"players":players}

def test_detects_pnr_and_emits_ai_contract():
    payload={"fps":25,"possessions":[{"id":"p1","offense":"A","frames":[frame(i,True) for i in range(14)],"outcome":{"type":"3PT_MADE","points":3}}]}
    out=detect(payload)
    assert out["schema"]=="courtiq-tactical-events-v1"
    assert len(out["events"])==1
    e=out["events"][0]
    assert e["action"]=="pick_and_roll"
    assert e["coverage"] in {"switch","hedge_show","drop","under","ice","trap"}
    assert e["verification"]=="ai"
    assert e["videoStart"] <= e["videoTime"] <= e["videoEnd"]
    assert 0 <= e["confidence"]["action"] <= 1

def test_no_screen_no_tactical_claim():
    frames=[]
    for i in range(10):
      frames.append({"frame":i*25,"players":[
        {"track_id":"h","team":"A","x":20+i,"y":10,"has_ball":True},
        {"track_id":"s","team":"A","x":45,"y":40},
        {"track_id":"dh","team":"B","x":21+i,"y":10},
        {"track_id":"ds","team":"B","x":44,"y":40},
      ]})
    assert detect({"fps":25,"possessions":[{"id":"p2","offense":"A","frames":frames}]})["events"]==[]
