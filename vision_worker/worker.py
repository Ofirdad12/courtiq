"""CourtIQ CV worker v234.

The worker owns media preparation and the detector-adapter boundary.  When a
validated tracking payload is available it runs the full CourtIQ tactical
pipeline and writes reviewable/accepted events.  It never invents tracks from
an MP4 when no detector adapter is configured.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0,str(ROOT))

from ai.pipeline import run as run_tactical_pipeline
from ai.tactical_taxonomy import capabilities as tactical_capabilities
from ai.video_detector import JsonReplayDetector


def probe(path):
    cmd=["ffprobe","-v","error","-show_entries","format=duration","-of","json",str(path)]
    return json.loads(subprocess.check_output(cmd))["format"]


def frames(path,out,fps=2):
    out.mkdir(parents=True,exist_ok=True)
    subprocess.run(["ffmpeg","-y","-i",str(path),"-vf",f"fps={fps}",str(out/"%08d.jpg")],check=True)


def _write(out,result):
    out.mkdir(parents=True,exist_ok=True)
    (out/"result.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    return result


def analyze(path,out,detection_json=None,extract_preview=True):
    path=Path(path); out=Path(out)
    meta=probe(path)
    if extract_preview:
        frames(path,out/"frames")

    if detection_json:
        detected=JsonReplayDetector(str(detection_json)).detect(str(path))
        tactical=run_tactical_pipeline(detected)
        result={
            "pipeline_version":"cv-v234",
            "duration_seconds":float(meta["duration"]),
            "status":"review_ready" if tactical["counts"].get("review") else "completed",
            "needs_review":bool(tactical["counts"].get("review")),
            "tactical":tactical,
            "tactical_events":tactical.get("accepted",[])+tactical.get("review",[]),
            "capabilities":{
                "frame_extraction":True,
                "player_tracking":"adapter_payload",
                "ball_tracking":"adapter_payload",
                "court_mapping":"adapter_payload",
                "tactical_engine":"tracking-to-tactics-v2",
                "taxonomy":tactical_capabilities(),
            },
        }
        return _write(out,result)

    result={
        "pipeline_version":"cv-v234",
        "duration_seconds":float(meta["duration"]),
        "detections":[],
        "possessions":[],
        "tactical_events":[],
        "status":"awaiting_detector",
        "needs_review":True,
        "capabilities":{
            "frame_extraction":True,
            "player_tracking":"adapter_required",
            "ball_tracking":"adapter_required",
            "court_mapping":"adapter_required",
            "jersey_ocr":"adapter_required",
            "scoreboard_ocr":"adapter_required",
            "tactical_engine":"ready_after_tracking",
            "taxonomy":tactical_capabilities(),
        },
    }
    return _write(out,result)


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("video")
    p.add_argument("--out",default="output")
    p.add_argument("--detection-json",help="validated detector/tracker payload for end-to-end tactical analysis")
    p.add_argument("--no-preview-frames",action="store_true")
    a=p.parse_args()
    print(json.dumps(analyze(Path(a.video),Path(a.out),a.detection_json,not a.no_preview_frames)))
