"""CourtIQ CV worker v236.

Modes:
- deterministic replay from a validated tracking JSON;
- real raw-MP4 detection through an injected detector adapter;
- media preparation only when no detector is configured.

v236 adds a vision reliability layer before tactical inference: short ball gaps
may be explicitly interpolated, tracking completeness is scored, and weak
vision is routed to review instead of being silently treated as production
truth. The worker never fabricates player tracks, court coordinates or labels.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ai.pipeline import run as run_tactical_pipeline
from ai.tactical_taxonomy import capabilities as tactical_capabilities
from ai.video_detector import JsonReplayDetector
from vision_worker.tracking_quality import recover_short_ball_gaps, tracking_quality

LEGACY_PIPELINE_VERSION = "cv-v235"
PIPELINE_VERSION = "cv-v236"


def probe(path):
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)]
    return json.loads(subprocess.check_output(cmd))["format"]


def frames(path, out, fps=2):
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(path), "-vf", f"fps={fps}", str(out / "%08d.jpg")],
        check=True,
    )


def _write(out, result):
    out.mkdir(parents=True, exist_ok=True)
    (out / "result.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def _write_tracking(out, detected):
    out.mkdir(parents=True, exist_ok=True)
    (out / "tracking.json").write_text(json.dumps(detected, indent=2), encoding="utf-8")


def _result_status(detected, tactical, vision_quality):
    team_status = (detected.get("team_inference") or {}).get("status")
    calibration_tier = (((detected.get("calibration") or {}).get("quality") or {}).get("tier"))

    if vision_quality.get("tier") == "insufficient" or calibration_tier == "poor":
        return "vision_quality_insufficient"
    if vision_quality.get("tier") == "review" or calibration_tier == "review":
        return "vision_quality_review"
    if team_status and team_status not in {"inferred", "provided", "disabled"}:
        return "tracking_ready_needs_team_review"
    if tactical["counts"].get("review"):
        return "review_ready"
    return "completed"


def _tactical_result(meta, out, detected, source, max_ball_gap=4):
    detected = recover_short_ball_gaps(detected, max_gap_frames=max_ball_gap)
    vision_quality = tracking_quality(detected)
    detected["vision_quality"] = vision_quality
    _write_tracking(out, detected)

    tactical = run_tactical_pipeline(detected)
    team_status = (detected.get("team_inference") or {}).get("status")
    status = _result_status(detected, tactical, vision_quality)
    result = {
        "pipeline_version": PIPELINE_VERSION,
        "compatible_with": [LEGACY_PIPELINE_VERSION, "tracking-to-tactics-v2"],
        "duration_seconds": float(meta["duration"]),
        "status": status,
        "needs_review": status != "completed",
        "source": source,
        "vision_quality": vision_quality,
        "tracking": detected.get("detector", {}),
        "team_inference": detected.get("team_inference", {}),
        "calibration": detected.get("calibration", {}),
        "tactical": tactical,
        "tactical_events": tactical.get("accepted", []) + tactical.get("review", []),
        "capabilities": {
            "frame_extraction": True,
            "player_tracking": "adapter_payload" if source == "replay" else "real_adapter",
            "ball_tracking": "adapter_payload" if source == "replay" else "real_adapter",
            "ball_gap_recovery": f"short_gap_only_max_{max_ball_gap}_emitted_frames",
            "vision_quality_gate": "vision-v236",
            "court_mapping": "adapter_payload" if source == "replay" else "calibrated_homography",
            "team_assignment": team_status or "payload",
            "jersey_ocr": "not_enabled",
            "scoreboard_ocr": "not_enabled",
            "tactical_engine": "tracking-to-tactics-v2",
            "taxonomy": tactical_capabilities(),
        },
    }
    return _write(out, result)


def analyze(path, out, detection_json=None, detector=None, extract_preview=True, max_ball_gap=4):
    path = Path(path)
    out = Path(out)
    meta = probe(path)
    if extract_preview:
        frames(path, out / "frames")

    if detection_json:
        detected = JsonReplayDetector(str(detection_json)).detect(str(path))
        return _tactical_result(meta, out, detected, "replay", max_ball_gap=max_ball_gap)

    if detector is not None:
        detected = detector.detect(str(path))
        return _tactical_result(meta, out, detected, "raw_mp4", max_ball_gap=max_ball_gap)

    result = {
        "pipeline_version": PIPELINE_VERSION,
        "compatible_with": [LEGACY_PIPELINE_VERSION],
        "duration_seconds": float(meta["duration"]),
        "detections": [],
        "possessions": [],
        "tactical_events": [],
        "status": "awaiting_detector",
        "needs_review": True,
        "vision_quality": {
            "tier": "insufficient",
            "score": 0.0,
            "review_required": True,
            "auto_publish": False,
            "warnings": ["detector_not_configured"],
        },
        "capabilities": {
            "frame_extraction": True,
            "player_tracking": "adapter_required",
            "ball_tracking": "adapter_required",
            "ball_gap_recovery": "ready_after_detection",
            "vision_quality_gate": "vision-v236",
            "court_mapping": "calibration_required",
            "team_assignment": "adapter_required",
            "jersey_ocr": "not_enabled",
            "scoreboard_ocr": "not_enabled",
            "tactical_engine": "ready_after_tracking",
            "taxonomy": tactical_capabilities(),
        },
    }
    return _write(out, result)


def _build_cli_detector(args):
    if args.adapter != "ultralytics":
        return None
    if not args.court_calibration:
        raise SystemExit("--court-calibration is required with --adapter ultralytics")
    from vision_worker.adapters.ultralytics_tracker import UltralyticsTrackingDetector

    return UltralyticsTrackingDetector(
        court_calibration=args.court_calibration,
        model=args.model,
        ball_model=args.ball_model,
        tracker=args.tracker,
        device=args.device,
        imgsz=args.imgsz,
        player_confidence=args.player_confidence,
        ball_confidence=args.ball_confidence,
        sample_every=args.sample_every,
        player_class_id=args.player_class_id,
        ball_class_id=args.ball_class_id,
        infer_teams=not args.no_team_inference,
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("video")
    p.add_argument("--out", default="output")
    p.add_argument("--detection-json", help="validated detector/tracker payload for deterministic QA")
    p.add_argument("--adapter", choices=["ultralytics"], help="run a real raw-video detector adapter")
    p.add_argument("--court-calibration", help="JSON with matched image_points and 94x50 court_points")
    p.add_argument("--model", default="yolo26n.pt", help="player detection/tracking checkpoint")
    p.add_argument("--ball-model", default=None, help="optional dedicated basketball-ball checkpoint")
    p.add_argument("--tracker", default="tracktrack.yaml", help="Ultralytics tracker config")
    p.add_argument("--device", default=None, help="e.g. cpu, 0, cuda:0")
    p.add_argument("--imgsz", type=int, default=1280)
    p.add_argument("--player-confidence", type=float, default=0.28)
    p.add_argument("--ball-confidence", type=float, default=0.10)
    p.add_argument("--player-class-id", type=int, default=0)
    p.add_argument("--ball-class-id", type=int, default=32, help="sports-ball class for generic model; override for a custom ball model")
    p.add_argument("--sample-every", type=int, default=1, help="emit every Nth frame while tracking every frame")
    p.add_argument("--max-ball-gap", type=int, default=4, help="interpolate only bounded ball gaps up to N emitted frames")
    p.add_argument("--no-team-inference", action="store_true")
    p.add_argument("--no-preview-frames", action="store_true")
    a = p.parse_args()
    detector = _build_cli_detector(a)
    print(
        json.dumps(
            analyze(
                Path(a.video),
                Path(a.out),
                a.detection_json,
                detector,
                not a.no_preview_frames,
                a.max_ball_gap,
            )
        )
    )
