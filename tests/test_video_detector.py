from ai.video_detector import validate_detection

def test_accepts_valid_detector_contract():
    payload={"fps":25,"frames":[{"frame":0,"players":[{"track_id":"7","team":"A","bbox":[1,2,3,4]}],"ball":{"bbox":[2,2,3,3]}}]}
    assert validate_detection(payload) is payload

def test_rejects_duplicate_track_ids():
    payload={"fps":25,"frames":[{"frame":0,"players":[{"track_id":"7","bbox":[1,2,3,4]},{"track_id":"7","bbox":[2,2,4,4]}]}]}
    try: validate_detection(payload)
    except ValueError as e: assert "duplicate" in str(e)
    else: assert False

def test_rejects_bad_fps():
    try: validate_detection({"fps":0,"frames":[]})
    except ValueError as e: assert "fps" in str(e)
    else: assert False
