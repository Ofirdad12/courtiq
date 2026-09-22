"""CourtIQ possession segmentation from normalized tracking frames.

Produces the possession contract consumed by tactical detectors. The baseline is conservative:
a possession starts only after a stable ball-handler team is observed and changes only after
the opposing team controls the ball for several consecutive samples.
"""
from __future__ import annotations
import json, sys

def _handler(frame):
    for p in frame.get("players", []):
        if p.get("has_ball") and p.get("team") is not None:
            return p
    return None

def segment(payload, min_control_frames=3):
    frames=payload.get("frames", [])
    fps=float(payload.get("fps",25))
    possessions=[]; current=None; pending_team=None; pending_count=0
    for i,frame in enumerate(frames):
        h=_handler(frame); team=h.get("team") if h else None
        if current is None:
            if team is None: continue
            if team==pending_team: pending_count+=1
            else: pending_team,pending_count=team,1
            if pending_count>=min_control_frames:
                start=max(0,i-min_control_frames+1)
                current={"id":f"pos_{len(possessions)+1}","offense":team,"frames":frames[start:i+1]}
                pending_team=None; pending_count=0
            continue
        current["frames"].append(frame)
        if team and team!=current["offense"]:
            if team==pending_team: pending_count+=1
            else: pending_team,pending_count=team,1
            if pending_count>=min_control_frames:
                cut=max(1,len(current["frames"])-min_control_frames)
                next_frames=current["frames"][cut:]
                current["frames"]=current["frames"][:cut]
                if len(current["frames"])>=2: possessions.append(current)
                current={"id":f"pos_{len(possessions)+1}","offense":team,"frames":next_frames}
                pending_team=None; pending_count=0
        elif team==current["offense"]:
            pending_team=None; pending_count=0
    if current and len(current["frames"])>=2: possessions.append(current)
    return {"fps":fps,"video_offset":float(payload.get("video_offset",0)),"possessions":possessions}

def main():
    src=json.load(open(sys.argv[1],encoding="utf-8")) if len(sys.argv)>1 else json.load(sys.stdin)
    json.dump(segment(src),sys.stdout,indent=2)

if __name__=="__main__": main()
