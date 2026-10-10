"""Raw-video detector adapter contract for CourtIQ.
A production detector must emit ordered frames with stable player track IDs, player boxes and an optional ball box.
"""
from __future__ import annotations
from abc import ABC,abstractmethod

class VideoDetector(ABC):
    @abstractmethod
    def detect(self,video_path:str)->dict:
        """Return {fps,frames:[{frame,players,ball}],homography,...}."""

def validate_detection(payload:dict)->dict:
    fps=float(payload.get('fps',0))
    if fps<=0:raise ValueError('detector output requires positive fps')
    frames=payload.get('frames')
    if not isinstance(frames,list):raise ValueError('detector output requires frames')
    previous=-1
    for f in frames:
        idx=int(f.get('frame',-1))
        if idx<0 or idx<previous:raise ValueError('frame indices must be ordered')
        previous=idx; ids=set()
        for p in f.get('players',[]):
            tid=str(p.get('track_id',''))
            if not tid:raise ValueError('every player requires track_id')
            if tid in ids:raise ValueError('duplicate player track_id in frame')
            ids.add(tid); box=p.get('bbox')
            if not isinstance(box,list) or len(box)!=4:raise ValueError('player bbox must be [x1,y1,x2,y2]')
        ball=f.get('ball')
        if ball is not None and (not isinstance(ball.get('bbox'),list) or len(ball['bbox'])!=4):raise ValueError('ball bbox must be [x1,y1,x2,y2]')
    return payload

class JsonReplayDetector(VideoDetector):
    """Deterministic QA adapter. Real CV adapters replace this without changing downstream analytics."""
    def __init__(self,detection_json:str):self.detection_json=detection_json
    def detect(self,video_path:str)->dict:
        import json
        with open(self.detection_json,encoding='utf-8') as fh:return validate_detection(json.load(fh))
