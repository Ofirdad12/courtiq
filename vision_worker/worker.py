"""CourtIQ CV worker v235.

Modes:
- deterministic replay from a validated tracking JSON;
- real raw-MP4 detection through an injected detector adapter;
- media preparation only when no detector is configured.

The worker never fabricates tracks, court coordinates or tactical labels.
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


def _tactical_result(meta, out, detected, source):
    _write_tracking(out, detected)
    tactical = run_tactical_pipeline(detected)
    team_status = (detected.get("team_inference") or {}).get("status")
    if team_status and team_status not in {"inferred", "provided", "disabled"}:
        status = "tracking_ready_needs_team_review"
    elif tactical["counts"].get("review"):
        status = "review_ready"
    else:
        status = "completed"
    result = {
        "pipeline_version": "cv-v235",
        "duration_seconds": float(meta["duration"]),
        "status": status,
        "needs_review": status != "completed",
        "source": source,
        "tracking": detected.get("detector", {}),
        "team_inference": detected.get("team_inference", {}),
        "calibration": detected.get("calibration", {}),
        "tactical": tactical,
        "tactical_events": tactical.get("accepted", []) + tactical.get("review", []),
        "capabilities": {
            "frame_extraction": True,
            "player_tracking": "adapter_payload" if source == "replay" else "real_adapter",
            "ball_tracking": "adapter_payload" if source == "replay" else "real_adapter",
            "court_mapping": "adapter_payload" if source == "replay" else "calibrated_homography",
            "team_assignment": team_status or "payload",
            "jersey_ocr": "not_enabled",
            "scoreboard_ocr": "not_enabled",
            "tactical_engine": "tracking-to-tactics-v2",
            "taxonomy": tactical_capabilities(),
        },
    }
    return _write(out, result)


def analyze(path, out, detection_json=None, detector=None, extract_preview=True):
    path = Path(path)
    out = Path(out)
    meta = probe(path)
    if extract_preview:
        frames(path, out / "frames")

    if detection_json:
        detected = JsonReplayDetector(str(detection_json)).detect(str(path))
        return _tactical_result(meta, out, detected, "replay")

    if detector is not None:
        detected = detector.detect(str(path))
        return _tactical_result(meta, out, detected, "raw_mp4")

    result = {
        "pipeline_version": "cv-v235",
        "duration_seconds": float(meta["duration"]),
        "detections": [],
        "possessions": [],
        "tactical_events": [],
        "status": "awaiting_detector",
        "needs_review": True,
        "capabilities": {
            "frame_extraction": True,
            "player_tracking": "adapter_required",
            "ball_tracking": "adapter_required",
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
        tracker=args.tracker,
        device=args.device,
        imgsz=args.imgsz,
        player_confidence=args.player_confidence,
        ball_confidence=args.ball_confidence,
        sample_every=args.sample_every,
        infer_teams=not args.no_team_inference,
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("video")
    p.add_argument("--out", default="output")
    p.add_argument("--detection-json", help="validated detector/tracker payload for deterministic QA")
    p.add_argument("--adapter", choices=["ultralytics"], help="run a real raw-video detector adapter")
    p.add_argument("--court-calibration", help="JSON with matched image_points and 94x50 court_points")
    p.add_argument("--model", default="yolo26n.pt", help="Ultralytics detection checkpoint or custom basketball model")
    p.add_argument("--tracker", default="bytetrack.yaml")
    p.add_argument("--device", default=None, help="e.g. cpu, 0, cuda:0")
    p.add_argument("--imgsz", type=int, default=1280)
    p.add_argument("--player-confidence", type=float, default=0.28)
    p.add_argument("--ball-confidence", type=float, default=0.10)
    p.add_argument("--sample-every", type=int, default=1, help="emit every Nth frame while tracking every frame")
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
            )
        )
    )
