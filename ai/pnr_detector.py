"""CourtIQ automatic Pick-and-Roll detector.

Consumes normalized tracking data and emits AI-tagged tactical events.
Coordinates are expected in feet on a 94x50 court, with offense attacking +x.
"""
from __future__ import annotations
import json, math, sys
from dataclasses import dataclass

def dist(a,b): return math.hypot(float(a["x"])-float(b["x"]), float(a["y"])-float(b["y"]))

def nearest(target, players, exclude=()):
    pool=[p for p in players if p.get("track_id") not in set(exclude)]
    return min(pool,key=lambda p:dist(target,p)) if pool else None

def clamp(x): return max(0.0,min(1.0,x))

@dataclass
class Candidate:
    start:int; screen:int; end:int; handler:str; screener:str; coverage:str; confidence:float; features:dict

def _player(frame, track_id):
    return next((p for p in frame.get("players",[]) if str(p.get("track_id"))==str(track_id)),None)

def detect_possession(pos):
    frames=pos.get("frames",[])
    if len(frames)<6:return None
    offense=pos.get("offense")
    # Ball handler comes from explicit possession flag; this keeps identity separate from ball detection.
    handler_samples=[]
    for i,f in enumerate(frames):
        for p in f.get("players",[]):
            if p.get("team")==offense and p.get("has_ball"): handler_samples.append((i,p))
    if not handler_samples:return None
    screen_best=None
    for i,h in handler_samples:
        mates=[p for p in frames[i].get("players",[]) if p.get("team")==offense and p.get("track_id")!=h.get("track_id")]
        defenders=[p for p in frames[i].get("players",[]) if p.get("team")!=offense]
        for s in mates:
            d=nearest(s,defenders)
            # A plausible screen: teammate is close to handler and close enough to a defender to impede path.
            hd,sd=dist(h,s),(dist(s,d) if d else 99)
            score=clamp((8-hd)/5)*0.6+clamp((5-sd)/4)*0.4
            if hd<=8 and sd<=5 and (screen_best is None or score>screen_best[0]):
                screen_best=(score,i,str(h["track_id"]),str(s["track_id"]))
    if not screen_best or screen_best[0]<0.45:return None
    screen_score,si,hid,sid=screen_best
    pre=frames[max(0,si-3)]; post=frames[min(len(frames)-1,si+5)]
    h0,s0=_player(pre,hid),_player(pre,sid); h1,s1=_player(post,hid),_player(post,sid)
    if not all((h0,s0,h1,s1)):return None
    pre_defs=[p for p in pre.get("players",[]) if p.get("team")!=offense]
    post_defs=[p for p in post.get("players",[]) if p.get("team")!=offense]
    dh0=nearest(h0,pre_defs); ds0=nearest(s0,pre_defs,exclude=[dh0.get("track_id")] if dh0 else [])
    if not dh0 or not ds0:return None
    dh1=_player(post,dh0["track_id"]); ds1=_player(post,ds0["track_id"])
    if not dh1 or not ds1:return None
    same=dist(h1,dh1)+dist(s1,ds1)
    switched=dist(h1,ds1)+dist(s1,dh1)
    handler_def_gap=min(dist(h1,dh1),dist(h1,ds1))
    screener_def_gap=min(dist(s1,dh1),dist(s1,ds1))
    blitz=sum(1 for d in post_defs if dist(h1,d)<4.5)
    coverage="under"
    cov_score=.55
    if switched+1.5<same:
        coverage,cov_score="switch",clamp((same-switched)/8+.55)
    elif blitz>=2:
        coverage,cov_score="trap",.78
    elif handler_def_gap<4 and screener_def_gap>7:
        coverage,cov_score="hedge_show",.7
    elif handler_def_gap>7:
        coverage,cov_score="drop",.66
    # ICE is supplied only when sideline geometry supports it; avoid overclaiming from ambiguous tracks.
    if abs(float(h0["y"])-25)>17 and float(h1["y"])*float(h0["y"])>0 and abs(float(h1["y"])-25)>=abs(float(h0["y"])-25):
        coverage,cov_score="ice",max(cov_score,.62)
    conf=clamp(.55*screen_score+.45*cov_score)
    return Candidate(max(0,si-3),si,min(len(frames)-1,si+8),hid,sid,coverage,conf,{
        "screen_score":round(screen_score,3),"coverage_score":round(cov_score,3),
        "assignment_cost_same":round(same,2),"assignment_cost_switch":round(switched,2),
        "handler_defender_gap":round(handler_def_gap,2),"screener_defender_gap":round(screener_def_gap,2)
    })

def event_from_candidate(pos,c,fps,offset):
    frames=pos["frames"]
    def t(i): return offset+float(frames[i].get("frame",i))/fps
    outcome=pos.get("outcome",{})
    return {
      "id":"ai_pnr_"+str(pos.get("id",c.screen)),
      "type":"tactical","tactic":"pick_and_roll","action":"pick_and_roll","coverage":c.coverage,
      "defense":{"coverage":c.coverage},"ballHandler":c.handler,"screener":c.screener,
      "videoStart":round(t(c.start),3),"videoTime":round(t(c.screen),3),"videoEnd":round(t(c.end),3),
      "outcome":outcome,"points":int(outcome.get("points",0) or 0),
      "tags":["pick_and_roll",c.coverage,str(outcome.get("type","")).lower()],
      "confidence":{"action":round(c.confidence,3),"coverage":round(c.confidence,3)},
      "verification":"ai","model":"courtiq-pnr-heuristic-v1","evidence":c.features
    }

def detect(payload):
    fps=float(payload.get("fps",25)); offset=float(payload.get("video_offset",0))
    events=[]
    for pos in payload.get("possessions",[]):
        c=detect_possession(pos)
        if c:events.append(event_from_candidate(pos,c,fps,offset))
    return {"schema":"courtiq-tactical-events-v1","model":"courtiq-pnr-heuristic-v1","events":events}

def main():
    payload=json.load(open(sys.argv[1],encoding="utf-8")) if len(sys.argv)>1 else json.load(sys.stdin)
    json.dump(detect(payload),sys.stdout,ensure_ascii=False,indent=2)

if __name__=="__main__": main()
