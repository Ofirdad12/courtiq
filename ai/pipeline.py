"""CourtIQ AI pipeline orchestration.

Input is detector/tracker JSON with image-space bounding boxes and a court homography.
Output is the tactical event contract consumed by the product UI and persistence layer.
"""
from __future__ import annotations
import json, sys
from ai.track_normalizer import normalize
from ai.possession_segmenter import segment
from ai.pnr_detector import detect

def run(payload):
    normalized=normalize(payload)
    normalized["video_offset"]=float(payload.get("video_offset",0))
    possessions=segment(normalized,min_control_frames=int(payload.get("min_control_frames",3)))
    result=detect(possessions)
    return {
      **result,
      "pipeline":"courtiq-tracking-to-tactics-v1",
      "stats":{"frames":len(normalized["frames"]),"possessions":len(possessions["possessions"]),"tactical_events":len(result["events"])},
      "events":result["events"]
    }

def main():
    src=json.load(open(sys.argv[1],encoding="utf-8")) if len(sys.argv)>1 else json.load(sys.stdin)
    json.dump(run(src),sys.stdout,ensure_ascii=False,indent=2)

if __name__=="__main__": main()
