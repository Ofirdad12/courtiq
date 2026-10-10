import math

from vision_worker.court_calibration import calibration_quality, project_point
from vision_worker.tracking_quality import recover_short_ball_gaps, tracking_quality


def _player(track_id, team="team_a"):
    return {
        "track_id": str(track_id),
        "bbox": [10 + track_id, 20, 20 + track_id, 60],
        "confidence": 0.9,
        "team": team,
    }


def _ball(x, confidence=0.8):
    return {"bbox": [x, 10, x + 4, 14], "confidence": confidence}


def test_short_ball_gap_is_interpolated_and_marked():
    payload = {
        "fps": 25,
        "frames": [
            {"frame": 0, "players": [], "ball": _ball(0)},
            {"frame": 1, "players": [], "ball": None},
            {"frame": 2, "players": [], "ball": None},
            {"frame": 3, "players": [], "ball": _ball(30, 0.7)},
        ],
    }
    recovered = recover_short_ball_gaps(payload, max_gap_frames=2)
    first = recovered["frames"][1]["ball"]
    second = recovered["frames"][2]["ball"]

    assert first["source"] == "interpolated"
    assert second["source"] == "interpolated"
    assert first["bbox"][0] == 10.0
    assert second["bbox"][0] == 20.0
    assert first["confidence"] < 0.7
    assert payload["frames"][1]["ball"] is None  # input stays immutable


def test_long_ball_gap_is_not_invented():
    payload = {
        "fps": 25,
        "frames": [
            {"frame": 0, "players": [], "ball": _ball(0)},
            {"frame": 1, "players": [], "ball": None},
            {"frame": 2, "players": [], "ball": None},
            {"frame": 3, "players": [], "ball": None},
            {"frame": 4, "players": [], "ball": _ball(40)},
        ],
    }
    recovered = recover_short_ball_gaps(payload, max_gap_frames=2)
    assert all(recovered["frames"][i]["ball"] is None for i in (1, 2, 3))


def test_quality_gate_flags_weak_tracking():
    frames = []
    for frame_index in range(10):
        frames.append({
            "frame": frame_index,
            "players": [_player(i, None) for i in range(4)],
            "ball": None,
            "handler_track_id": None,
        })
    quality = tracking_quality({"fps": 25, "frames": frames})
    assert quality["tier"] == "insufficient"
    assert quality["review_required"] is True
    assert "too_few_visible_players_for_reliable_team_tactics" in quality["warnings"]
    assert "low_usable_ball_coverage" in quality["warnings"]


def test_quality_gate_accepts_complete_tracking_payload():
    frames = []
    for frame_index in range(20):
        players = [
            _player(i, "team_a" if i < 5 else "team_b")
            for i in range(10)
        ]
        frames.append({
            "frame": frame_index,
            "players": players,
            "ball": _ball(100 + frame_index),
            "handler_track_id": "0",
        })
    quality = tracking_quality({"fps": 25, "frames": frames})
    assert quality["tier"] == "good"
    assert quality["score"] >= 0.78
    assert quality["auto_publish"] is True
    assert quality["metrics"]["ball_detection_coverage"] == 1.0
    assert quality["metrics"]["team_assignment_coverage"] == 1.0


def test_interpolated_ball_improves_usable_not_real_detection_coverage():
    frames = []
    for frame_index in range(6):
        players = [_player(i, "team_a" if i < 5 else "team_b") for i in range(10)]
        ball = None if frame_index in {2, 3} else _ball(10 * frame_index)
        frames.append({
            "frame": frame_index,
            "players": players,
            "ball": ball,
            "handler_track_id": "0" if ball else None,
        })
    recovered = recover_short_ball_gaps({"fps": 25, "frames": frames}, max_gap_frames=2)
    quality = tracking_quality(recovered)
    assert math.isclose(quality["metrics"]["ball_detection_coverage"], 4 / 6, abs_tol=0.001)
    assert quality["metrics"]["ball_usable_coverage"] == 1.0
    assert quality["metrics"]["interpolated_ball_frames"] == 2


def test_calibration_quality_reports_reprojection_and_redundancy():
    calibration = {
        "image_points": [[0, 0], [94, 0], [94, 50], [0, 50]],
        "court_points": [[0, 0], [94, 0], [94, 50], [0, 50]],
    }
    identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    assert project_point(identity, [12, 7]) == [12.0, 7.0]
    quality = calibration_quality(calibration, identity)
    assert quality["rms_error_ft"] == 0.0
    assert quality["tier"] == "review"
    assert "limited_landmark_redundancy" in quality["warnings"]


def test_six_consistent_calibration_points_can_be_good():
    calibration = {
        "image_points": [[0, 0], [94, 0], [94, 50], [0, 50], [47, 0], [47, 50]],
        "court_points": [[0, 0], [94, 0], [94, 50], [0, 50], [47, 0], [47, 50]],
    }
    identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    quality = calibration_quality(calibration, identity)
    assert quality["tier"] == "good"
    assert quality["redundant_landmarks"] == 2
