import pytest

from vision_worker.court_calibration import point_in_polygon, validate_calibration
from vision_worker.adapters.ultralytics_tracker import _choose_ball


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
