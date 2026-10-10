import pytest

from ai.track_normalizer import normalize
from vision_worker.court_calibration import point_in_polygon, validate_calibration
from vision_worker.adapters.ultralytics_tracker import _choose_ball, _infer_handler


def test_calibration_requires_matched_points_and_94x50_coordinates():
    calibration = validate_calibration({
        "image_points": [[10, 10], [100, 10], [100, 80], [10, 80]],
        "court_points": [[0, 0], [94, 0], [94, 50], [0, 50]],
        "play_area_polygon": [[8, 8], [102, 8], [102, 82], [8, 82]],
    })
    assert calibration["coordinate_system"] == "courtiq-94x50-feet"
    assert len(calibration["image_points"]) == 4

    with pytest.raises(ValueError):
        validate_calibration({
            "image_points": [[0, 0], [1, 0], [1, 1]],
            "court_points": [[0, 0], [94, 0], [94, 50]],
        })

    with pytest.raises(ValueError):
        validate_calibration({
            "image_points": [[0, 0], [1, 0], [1, 1], [0, 1]],
            "court_points": [[0, 0], [120, 0], [94, 50], [0, 50]],
        })


def test_play_area_polygon_filters_non_court_people():
    polygon = [[10, 10], [100, 10], [100, 80], [10, 80]]
    assert point_in_polygon((50, 50), polygon) is True
    assert point_in_polygon((5, 50), polygon) is False
    assert point_in_polygon((50, 90), polygon) is False
    assert point_in_polygon((50, 50), None) is True


def test_ball_selection_prefers_temporal_continuity_when_confidence_is_close():
    previous = {"bbox": [100, 100, 110, 110], "confidence": 0.40}
    nearby = {"bbox": [112, 103, 120, 111], "confidence": 0.42}
    far = {"bbox": [900, 600, 910, 610], "confidence": 0.44}
    chosen = _choose_ball([nearby, far], previous, (720, 1280, 3))
    assert chosen is nearby


def test_ball_selection_uses_confidence_without_history():
    low = {"bbox": [0, 0, 5, 5], "confidence": 0.12}
    high = {"bbox": [20, 20, 25, 25], "confidence": 0.31}
    assert _choose_ball([low, high], None, (720, 1280, 3)) is high


def test_handler_is_inferred_in_image_space_near_player_box():
    players = [
        {"track_id": "7", "bbox": [100, 100, 160, 260]},
        {"track_id": "11", "bbox": [300, 100, 360, 260]},
    ]
    ball = {"bbox": [146, 160, 156, 170], "confidence": 0.4}
    assert _infer_handler(players, ball) == "7"


def test_normalizer_prefers_explicit_image_space_handler_over_ball_projection():
    payload = {
        "fps": 25,
        "homography": [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        "frames": [{
            "frame": 10,
            "handler_track_id": "2",
            "players": [
                {"track_id": "1", "team": "a", "bbox": [0, 0, 10, 10]},
                {"track_id": "2", "team": "a", "bbox": [50, 0, 60, 10]},
            ],
            "ball": {"bbox": [0, 0, 5, 5]},
        }],
    }
    result = normalize(payload)
    frame = result["frames"][0]
    assert frame["handler_track_id"] == "2"
    assert frame["handler_source"] == "image_space_detector"
    assert next(p for p in frame["players"] if p["track_id"] == "2")["has_ball"] is True
