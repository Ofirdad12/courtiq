from ai.pipeline import run

def test_pipeline_contract_without_screen_claim():
    frames=[]
    for i in range(8):
        frames.append({"frame":i,"players":[
          {"track_id":"h","team":"A","bbox":[10+i,5,12+i,10]},
          {"track_id":"s","team":"A","bbox":[40,30,42,35]},
          {"track_id":"d1","team":"B","bbox":[11+i,5,13+i,10]},
          {"track_id":"d2","team":"B","bbox":[39,30,41,35]},
        ],"ball":{"bbox":[10+i,6,12+i,9]}})
    out=run({"fps":25,"homography":[[1,0,0],[0,1,0],[0,0,1]],"frames":frames})
    assert out["pipeline"]=="courtiq-tracking-to-tactics-v1"
    assert out["stats"]["frames"]==8
    assert out["stats"]["possessions"]==1
    assert out["events"]==[]
