"""CourtIQ CV worker v1.
Processes an MP4 into reviewable basketball detections.
It never promotes tactical labels to verified without evidence/confidence.
"""
import argparse, json, os, subprocess
from pathlib import Path

def probe(path):
    cmd=["ffprobe","-v","error","-show_entries","format=duration","-of","json",str(path)]
    return json.loads(subprocess.check_output(cmd))["format"]

def frames(path,out,fps=2):
    out.mkdir(parents=True,exist_ok=True)
    subprocess.run(["ffmpeg","-y","-i",str(path),"-vf",f"fps={fps}",str(out/"%08d.jpg")],check=True)

def analyze(path,out):
    meta=probe(path); frames(path,out/"frames")
    # v1 contract: downstream detector/tracker writes observations here.
    # Unknown tactical concepts remain reviewable, never fabricated.
    result={"pipeline_version":"cv-v1","duration_seconds":float(meta["duration"]),
      "detections":[],"possessions":[],"tactical_events":[],
      "status":"review","needs_review":True,
      "capabilities":{"frame_extraction":True,"player_tracking":"adapter_required",
        "ball_tracking":"adapter_required","jersey_ocr":"adapter_required",
        "pnr_classification":"model_required","coverage_classification":"model_required"}}
    (out/"result.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    return result

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("video");p.add_argument("--out",default="output")
    a=p.parse_args();print(json.dumps(analyze(Path(a.video),Path(a.out))))
