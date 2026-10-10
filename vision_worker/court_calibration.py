"""Court calibration helpers for the CourtIQ vision worker.

v235 deliberately uses explicit image-to-court correspondences instead of
pretending that a broadcast image can always be auto-calibrated.  The output
homography maps image pixels to the canonical 94x50 foot basketball court used
by the downstream tactical engine.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

COURT_LENGTH_FT = 94.0
COURT_WIDTH_FT = 50.0


def _as_xy(point: Any, label: str) -> list[float]:
    if not isinstance(point, (list, tuple)) or len(point) != 2:
        raise ValueError(f"{label} points must be [x, y]")
    return [float(point[0]), float(point[1])]


def validate_calibration(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("court calibration must be an object")

    image_points = [_as_xy(p, "image") for p in payload.get("image_points", [])]
    court_points = [_as_xy(p, "court") for p in payload.get("court_points", [])]
    if len(image_points) < 4 or len(image_points) != len(court_points):
        raise ValueError("court calibration requires >=4 matched image_points/court_points")

    for x, y in court_points:
        if not (-1.0 <= x <= COURT_LENGTH_FT + 1.0 and -1.0 <= y <= COURT_WIDTH_FT + 1.0):
            raise ValueError("court_points must use CourtIQ 94x50 foot coordinates")

    polygon = payload.get("play_area_polygon")
    if polygon is not None:
        polygon = [_as_xy(p, "play_area_polygon") for p in polygon]
        if len(polygon) < 3:
            raise ValueError("play_area_polygon requires at least 3 points")

    return {
        **payload,
        "image_points": image_points,
        "court_points": court_points,
        "play_area_polygon": polygon,
        "coordinate_system": "courtiq-94x50-feet",
    }


def load_calibration(source: str | Path | dict) -> dict:
    if isinstance(source, dict):
        return validate_calibration(source)
    path = Path(source)
    with path.open(encoding="utf-8") as fh:
        return validate_calibration(json.load(fh))


def compute_homography(calibration: dict) -> list[list[float]]:
    """Compute image-pixel -> 94x50 court homography using RANSAC.

    OpenCV is intentionally imported lazily so repository tests and non-CV
    deployments do not require the heavy vision dependency set.
    """
    calibration = validate_calibration(calibration)
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ImportError as exc:  # pragma: no cover - exercised in CV runtime
        raise RuntimeError(
            "Court homography requires the optional vision-worker CV dependencies"
        ) from exc

    src = np.asarray(calibration["image_points"], dtype=np.float32)
    dst = np.asarray(calibration["court_points"], dtype=np.float32)
    matrix, mask = cv2.findHomography(src, dst, cv2.RANSAC, 3.0)
    if matrix is None:
        raise ValueError("unable to solve court homography from calibration points")
    if mask is not None and int(mask.sum()) < 4:
        raise ValueError("court calibration has fewer than four RANSAC inliers")
    return [[float(v) for v in row] for row in matrix.tolist()]


def point_in_polygon(point: tuple[float, float], polygon: list[list[float]] | None) -> bool:
    """Dependency-free ray-casting test used to remove bench/crowd detections."""
    if not polygon:
        return True
    x, y = point
    inside = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        crosses = (yi > y) != (yj > y)
        if crosses:
            x_intersection = (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
            if x < x_intersection:
                inside = not inside
        j = i
    return inside
