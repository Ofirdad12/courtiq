"""Court calibration helpers for the CourtIQ vision worker.

v236 keeps explicit image-to-court correspondences and adds reprojection
quality evidence. The homography maps image pixels to CourtIQ's canonical
94x50-foot basketball court; calibration quality is reported rather than
silently assuming every four-point fit generalizes to the full playing area.
"""
from __future__ import annotations

import json
import math
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
    """Compute image-pixel -> 94x50 court homography using RANSAC."""
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


def project_point(homography: list[list[float]], point: list[float] | tuple[float, float]) -> list[float]:
    """Project one image-space point through a 3x3 homography, dependency-free."""
    if len(homography) != 3 or any(len(row) != 3 for row in homography):
        raise ValueError("homography must be a 3x3 matrix")
    x, y = float(point[0]), float(point[1])
    denominator = homography[2][0] * x + homography[2][1] * y + homography[2][2]
    if abs(denominator) < 1e-12:
        raise ValueError("homography projects point to infinity")
    px = (homography[0][0] * x + homography[0][1] * y + homography[0][2]) / denominator
    py = (homography[1][0] * x + homography[1][1] * y + homography[1][2]) / denominator
    return [float(px), float(py)]


def calibration_quality(calibration: dict, homography: list[list[float]]) -> dict:
    """Measure calibration-point reprojection error in court feet.

    Four-point homographies can fit their four correspondences exactly, so a
    four/five-point calibration is never labelled ``good`` solely because its
    training-point error is tiny. Six or more landmarks provide redundancy for
    a stronger quality signal.
    """
    calibration = validate_calibration(calibration)
    errors = []
    for image_point, expected in zip(calibration["image_points"], calibration["court_points"]):
        projected = project_point(homography, image_point)
        errors.append(math.hypot(projected[0] - expected[0], projected[1] - expected[1]))

    rms = math.sqrt(sum(error * error for error in errors) / max(1, len(errors)))
    maximum = max(errors) if errors else float("inf")
    warnings = []
    if len(errors) < 6:
        warnings.append("limited_landmark_redundancy")
    if rms > 1.5:
        warnings.append("court_reprojection_error_above_1_5ft")
    if maximum > 3.0:
        warnings.append("court_reprojection_outlier_above_3ft")

    if rms > 3.0 or maximum > 6.0:
        tier = "poor"
    elif rms > 1.5 or len(errors) < 6:
        tier = "review"
    else:
        tier = "good"

    return {
        "tier": tier,
        "rms_error_ft": round(rms, 3),
        "max_error_ft": round(maximum, 3),
        "landmarks": len(errors),
        "redundant_landmarks": max(0, len(errors) - 4),
        "warnings": warnings,
    }


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
