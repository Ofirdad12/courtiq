from ai.track_normalizer import normalize

def test_projects_pixels_and_assigns_ball_handler():
    payload={
      "fps":25,
      "homography":[[1,0,0],[0,1,0],[0,0,1]],
      "max_ball_distance_ft":6,
      "frames":[{
        "frame":25,
        "players":[
          {"track_id":"7","team":"A","bbox":[8,5,12,10],"confidence":.9},
          {"track_id":"9","team":"B","bbox":[30,5,34,10],"confidence":.9}
        ],
        "ball":{"bbox":[9,6,11,9]}
      }]
    }
    out=normalize(payload)
    assert out["fps"]==25
    assert out["frames"][0]["players"][0]["x"]==10
    assert out["frames"][0]["players"][0]["has_ball"] is True
    assert out["frames"][0]["players"][1]["has_ball"] is False

def test_requires_calibration():
    try:
        normalize({"frames":[]})
        assert False, "expected ValueError"
    except ValueError as e:
        assert "homography" in str(e)
