"""Raw-video detector adapter contract for CourtIQ.

The production pipeline must not be coupled to a single vision vendor. Adapters emit the
same frame schema: player bounding boxes with stable track IDs, optional team labels, and
one basketball bounding box. A real detector implementation can replace the adapter
without changing normalization, possession segmentation or tactical inference.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
import json, sys

class VideoDetector(ABC):
    @abstractmethod
    def detect(self, video_path: str) -> dict:
        """Return {fps, frames:[{frame, players, ball}]}."""

def validate_detection(payload: dict) -> dict:
    fps=float(payload.get("fps",0))
    if fps<=0: raise ValueError("detector output requires positive fps")
    frames=payload.get("frames")
    if not isinstance(frames,list): raise ValueError("detector output requires frames")
    previous=-1
    for f in frames:
        idx=int(f.get("frame",-1))
        if idx<0 or idx<previous: raise ValueError("frame indices must be ordered")
        previous=idx
        ids=set()
        for p in f.get("players",[]):
            tid=str(p.get("track_id",""))
            if not tid: raise ValueError("every player requires track_id")
            if tid in ids: raise ValueError("duplicate player track_id in frame")
            ids.add(tid)
            box=p.get("bbox")
            if not isinstance(box,list) or len(box)!=4: raise ValueError("player bbox must be [x1,y1,x2,y2]")
        ball=f.get("ball")
        if ball is not None and (not isinstance(ball.get("bbox"),list) or len(ball["bbox"])!=4):
            raise ValueError("ball bbox must be [x1,y1,x2,y2]")
    return payload

class JsonReplayDetector(VideoDetector):
    """Development adapter: replays captured detector output for deterministic QA."""
    def __init__(self, detection_json: str): self.detection_json=detection_json
    def detect(self, video_path: str) -> dict:
        with open(self.detection_json,encoding="utf-8") as fh: return validate_detection(json.load(fh))

def main():
    payload=json.load(sys.stdin)
    validate_detection(payload)
    json.dump({"valid":True,"fps":payload["fps"],"frames":len(payload["frames"])},sys.stdout)

if __name__=="__main__": main()
