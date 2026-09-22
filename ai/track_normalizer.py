"""Normalize raw detector/tracker output into CourtIQ court coordinates."""
from __future__ import annotations
import json, math, sys

def project(x,y,H):
    w=H[2][0]*x+H[2][1]*y+H[2][2]
    if abs(w)<1e-9: raise ValueError("invalid homography")
    return ((H[0][0]*x+H[0][1]*y+H[0][2])/w,(H[1][0]*x+H[1][1]*y+H[1][2])/w)

def foot(box):
    x1,y1,x2,y2=map(float,box); return ((x1+x2)/2,y2)

def normalize(payload):
    H=payload.get("homography")
    if not H or len(H)!=3 or any(len(r)!=3 for r in H): raise ValueError("3x3 homography required")
    max_d=float(payload.get("max_ball_distance_ft",6))
    frames=[]; previous=None
    for raw in payload.get("frames",[]):
        players=[]
        for p in raw.get("players",[]):
            x,y=project(*foot(p["bbox"]),H)
            players.append({"track_id":str(p["track_id"]),"team":p.get("team"),"x":round(x,3),"y":round(y,3),"confidence":float(p.get("confidence",1))})
        ball=raw.get("ball"); ball_xy=None
        if ball and ball.get("bbox"): ball_xy=project(*foot(ball["bbox"]),H)
        handler=None
        if ball_xy and players:
            ranked=sorted((math.hypot(p["x"]-ball_xy[0],p["y"]-ball_xy[1]),p) for p in players)
            if ranked[0][0]<=max_d: handler=ranked[0][1]["track_id"]
            if previous:
                prev=next((d for d,p in ranked if p["track_id"]==previous),99)
                if prev<=max_d*1.2: handler=previous
        previous=handler or previous
        for p in players: p["has_ball"]=p["track_id"]==handler
        frames.append({"frame":int(raw.get("frame",len(frames))),"players":players,"ball":({"x":round(ball_xy[0],3),"y":round(ball_xy[1],3)} if ball_xy else None)})
    return {"fps":float(payload.get("fps",25)),"frames":frames}

def main():
    src=json.load(open(sys.argv[1],encoding="utf-8")) if len(sys.argv)>1 else json.load(sys.stdin)
    json.dump(normalize(src),sys.stdout,indent=2)

if __name__=="__main__": main()
