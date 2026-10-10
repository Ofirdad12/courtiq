"""Reliability helpers for CourtIQ Vision Engine v236.

This module deliberately separates *what the detector saw* from *what CourtIQ
is willing to trust*. Short ball gaps may be interpolated for continuity, but
those samples are labelled and never counted as real detections. Quality
metrics are evidence for review decisions, not accuracy claims.
"""
from __future__ import annotations

import copy
import math
import statistics
from collections import Counter


def _lerp(a: float, b: float, t: float) -> float:
    return float(a) + (float(b) - float(a)) * float(t)


def _interpolate_ball(left: dict, right: dict, t: float) -> dict:
    left_box = left["bbox"]
    right_box = right["bbox"]
    confidence = min(float(left.get("confidence", 0)), float(right.get("confidence", 0))) * 0.65
    return {
        "bbox": [round(_lerp(left_box[i], right_box[i], t), 2) for i in range(4)],
        "confidence": round(confidence, 4),
        "source": "interpolated",
        "interpolation": {
            "method": "linear-short-gap",
            "fraction": round(float(t), 4),
        },
    }


def recover_short_ball_gaps(payload: dict, max_gap_frames: int = 4) -> dict:
    """Fill only short *existing-frame* gaps between two observed ball boxes.

    No new video frames are invented. If an emitted frame has no ball but is
    bounded by real observations within ``max_gap_frames`` emitted samples, a
    lower-confidence interpolated ball box is attached and explicitly marked.
    Long gaps and leading/trailing gaps remain missing.
    """
    result = copy.deepcopy(payload)
    frames = result.get("frames") or []
    if not frames or max_gap_frames <= 0:
        return result

    for frame in frames:
        ball = frame.get("ball")
        if ball is not None:
            ball.setdefault("source", "detected")

    i = 0
    while i < len(frames):
        if frames[i].get("ball") is not None:
            i += 1
            continue
        start = i
        while i < len(frames) and frames[i].get("ball") is None:
            i += 1
        end = i - 1
        gap = end - start + 1
        left_index = start - 1
        right_index = i
        if (
            gap <= max_gap_frames
            and left_index >= 0
            and right_index < len(frames)
            and frames[left_index].get("ball") is not None
            and frames[right_index].get("ball") is not None
        ):
            left = frames[left_index]["ball"]
            right = frames[right_index]["ball"]
            left_frame = float(frames[left_index].get("frame", left_index))
            right_frame = float(frames[right_index].get("frame", right_index))
            span = max(1.0, right_frame - left_frame)
            for j in range(start, right_index):
                current_frame = float(frames[j].get("frame", j))
                t = max(0.0, min(1.0, (current_frame - left_frame) / span))
                frames[j]["ball"] = _interpolate_ball(left, right, t)
    return result


def _ratio(numerator: int | float, denominator: int | float) -> float:
    if not denominator:
        return 0.0
    return float(numerator) / float(denominator)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def tracking_quality(payload: dict) -> dict:
    """Return conservative, explainable reliability metrics for one video.

    ``tier`` is intentionally a review gate. It is not a model-accuracy score.
    A good tier means the tracking payload is sufficiently complete for the
    tactical engine to auto-surface evidence; analysts should still review
    high-impact conclusions before publication.
    """
    frames = payload.get("frames") or []
    total_frames = len(frames)
    if total_frames == 0:
        return {
            "tier": "insufficient",
            "score": 0.0,
            "review_required": True,
            "auto_publish": False,
            "warnings": ["no_tracking_frames"],
            "metrics": {
                "frame_count": 0,
                "player_detection_coverage": 0.0,
                "ball_detection_coverage": 0.0,
                "ball_usable_coverage": 0.0,
                "handler_coverage": 0.0,
                "team_assignment_coverage": 0.0,
            },
        }

    player_counts = [len(frame.get("players") or []) for frame in frames]
    frames_with_players = sum(1 for count in player_counts if count > 0)
    frames_with_8_plus = sum(1 for count in player_counts if count >= 8)
    ball_detected = 0
    ball_usable = 0
    handlers = 0
    player_observations = 0
    assigned_observations = 0
    unique_tracks = set()
    track_observations = Counter()

    for frame in frames:
        ball = frame.get("ball")
        if ball is not None:
            ball_usable += 1
            if ball.get("source") != "interpolated":
                ball_detected += 1
        if frame.get("handler_track_id") is not None:
            handlers += 1
        for player in frame.get("players") or []:
            player_observations += 1
            tid = str(player.get("track_id"))
            unique_tracks.add(tid)
            track_observations[tid] += 1
            if player.get("team") in {"team_a", "team_b", "home", "away"}:
                assigned_observations += 1

    median_players = float(statistics.median(player_counts)) if player_counts else 0.0
    max_players = max(player_counts) if player_counts else 0
    player_coverage = _ratio(frames_with_players, total_frames)
    basketball_visibility = _ratio(frames_with_8_plus, total_frames)
    ball_detection_coverage = _ratio(ball_detected, total_frames)
    ball_usable_coverage = _ratio(ball_usable, total_frames)
    handler_coverage = _ratio(handlers, total_frames)
    team_assignment_coverage = _ratio(assigned_observations, player_observations)
    fragmentation_proxy = _ratio(len(unique_tracks), max(1.0, median_players))

    score = (
        0.18 * _clamp01(player_coverage)
        + 0.17 * _clamp01(median_players / 10.0)
        + 0.23 * _clamp01(ball_usable_coverage)
        + 0.20 * _clamp01(handler_coverage)
        + 0.14 * _clamp01(team_assignment_coverage)
        + 0.08 * _clamp01(basketball_visibility)
    )
    score = round(score, 3)

    warnings = []
    if player_coverage < 0.90:
        warnings.append("player_detection_gaps")
    if median_players < 8:
        warnings.append("too_few_visible_players_for_reliable_team_tactics")
    if ball_detection_coverage < 0.45:
        warnings.append("low_real_ball_detection_coverage")
    if ball_usable_coverage < 0.65:
        warnings.append("low_usable_ball_coverage")
    if handler_coverage < 0.55:
        warnings.append("low_ball_handler_coverage")
    if team_assignment_coverage < 0.70:
        warnings.append("low_team_assignment_coverage")
    if fragmentation_proxy > 3.5:
        warnings.append("possible_track_fragmentation_or_many_substitutions")

    hard_insufficient = (
        player_coverage < 0.50
        or median_players < 5
        or ball_usable_coverage < 0.25
        or handler_coverage < 0.20
    )
    if hard_insufficient or score < 0.52:
        tier = "insufficient"
    elif score < 0.78 or warnings:
        tier = "review"
    else:
        tier = "good"

    return {
        "tier": tier,
        "score": score,
        "review_required": tier != "good",
        "auto_publish": tier == "good",
        "warnings": warnings,
        "metrics": {
            "frame_count": total_frames,
            "player_detection_coverage": round(player_coverage, 3),
            "frames_with_8_plus_players": round(basketball_visibility, 3),
            "median_visible_players": round(median_players, 2),
            "max_visible_players": int(max_players),
            "ball_detection_coverage": round(ball_detection_coverage, 3),
            "ball_usable_coverage": round(ball_usable_coverage, 3),
            "handler_coverage": round(handler_coverage, 3),
            "team_assignment_coverage": round(team_assignment_coverage, 3),
            "unique_player_tracks": len(unique_tracks),
            "track_fragmentation_proxy": round(fragmentation_proxy, 3),
            "interpolated_ball_frames": ball_usable - ball_detected,
        },
    }
