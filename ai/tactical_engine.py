"""CourtIQ v234 multi-layer basketball tactical detector.

Input is the normalized possession payload emitted by `possession_segmenter`.
The engine is evidence-first: heuristics emit confidence plus the features that
caused a label.  Low-confidence events are kept for review by `quality_gate`.

Coordinates are 94x50 feet.  The code estimates attacking direction per
possession so detectors work from either broadcast direction.
"""
from __future__ import annotations

import math
import statistics
from collections import Counter, defaultdict
from typing import Iterable

from ai.pnr_detector import detect as detect_pnr


def clamp(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def dist(a: dict, b: dict) -> float:
    return math.hypot(float(a.get("x", 0)) - float(b.get("x", 0)), float(a.get("y", 0)) - float(b.get("y", 0)))


def players(frame: dict, team=None) -> list[dict]:
    xs = list(frame.get("players", []))
    return xs if team is None else [p for p in xs if p.get("team") == team]


def handler(frame: dict, team=None):
    return next((p for p in players(frame, team) if p.get("has_ball")), None)


def by_id(frame: dict, track_id: str):
    return next((p for p in frame.get("players", []) if str(p.get("track_id")) == str(track_id)), None)


def median(vals: Iterable[float], default=0.0) -> float:
    vals = [float(v) for v in vals]
    return statistics.median(vals) if vals else float(default)


def attack_sign(pos: dict) -> int:
    """Estimate attack direction from handler/offense motion; +1 attacks x=94."""
    fs = pos.get("frames", [])
    if not fs:
        return 1
    offense = pos.get("offense")
    n = max(1, min(8, len(fs) // 3 or 1))
    first, last = fs[:n], fs[-n:]
    h0 = [handler(f, offense) for f in first]
    h1 = [handler(f, offense) for f in last]
    h0 = [p for p in h0 if p]
    h1 = [p for p in h1 if p]
    if h0 and h1:
        dx = median(p["x"] for p in h1) - median(p["x"] for p in h0)
        if abs(dx) >= 2:
            return 1 if dx > 0 else -1
    c0 = [median(p["x"] for p in players(f, offense)) for f in first if players(f, offense)]
    c1 = [median(p["x"] for p in players(f, offense)) for f in last if players(f, offense)]
    if c0 and c1:
        dx = median(c1) - median(c0)
        if abs(dx) >= 1.5:
            return 1 if dx > 0 else -1
    # If movement is ambiguous, infer from where offense spends the latter half.
    late = [p["x"] for f in fs[len(fs)//2:] for p in players(f, offense)]
    return 1 if median(late, 47) >= 47 else -1


def ax(p: dict, sign: int) -> float:
    x = float(p.get("x", 0))
    return x if sign > 0 else 94 - x


def frame_time(frame: dict, fps: float, offset: float) -> float:
    return offset + float(frame.get("frame", 0)) / max(float(fps), 1e-6)


def event(pos: dict, fps: float, offset: float, action: str, start_i: int, end_i: int,
          confidence: float, *, coverage=None, family="offense", subtype=None,
          evidence=None, tags=None, confidence_key=None) -> dict:
    fs = pos.get("frames", [])
    if not fs:
        raise ValueError("event requires frames")
    start_i = max(0, min(int(start_i), len(fs)-1))
    end_i = max(start_i, min(int(end_i), len(fs)-1))
    mid_i = (start_i + end_i) // 2
    c = {"action": round(clamp(confidence), 3)}
    if confidence_key and confidence_key != "action":
        c[confidence_key] = round(clamp(confidence), 3)
    out = {
        "id": f"ai_{action}_{pos.get('id', 'pos')}_{start_i}",
        "type": "tactical",
        "family": family,
        "action": action,
        "tactic": action,
        "subtype": subtype,
        "offenseTeam": pos.get("offense"),
        "videoStart": round(frame_time(fs[start_i], fps, offset), 3),
        "videoTime": round(frame_time(fs[mid_i], fps, offset), 3),
        "videoEnd": round(frame_time(fs[end_i], fps, offset), 3),
        "confidence": c,
        "confidence_key": confidence_key or "action",
        "verification": "ai",
        "model": "courtiq-tactical-heuristics-v234",
        "evidence": evidence or {},
        "tags": list(dict.fromkeys([action] + list(tags or []))),
        "points": int((pos.get("outcome") or {}).get("points", 0) or 0),
        "outcome": pos.get("outcome") or {},
    }
    if coverage:
        out["coverage"] = coverage
        out["defense"] = {"coverage": coverage}
        out["confidence"]["coverage"] = round(clamp(confidence), 3)
        out["confidence_key"] = "coverage"
        out["tags"].append(coverage)
    return out


def possession_seconds(pos: dict, fps: float) -> float:
    fs = pos.get("frames", [])
    if len(fs) < 2:
        return 0.0
    return max(0.0, (float(fs[-1].get("frame", 0)) - float(fs[0].get("frame", 0))) / max(fps, 1e-6))


def detect_restart_phase(pos: dict, fps: float, offset: float) -> list[dict]:
    fs = pos.get("frames", [])
    if len(fs) < 3:
        return []
    offense = pos.get("offense")
    sign = attack_sign(pos)
    first = next((handler(f, offense) for f in fs[:min(len(fs), max(3, int(fps * .8)))) if handler(f, offense)), None)
    if not first:
        return []
    out = []
    baseline = min(float(first["x"]), 94-float(first["x"]))
    sideline = min(float(first["y"]), 50-float(first["y"]))
    # Restart tags are conservative: require half-court spacing and little initial handler travel.
    early = fs[:min(len(fs), max(4, int(fps * 1.5)))]
    hs = [handler(f, offense) for f in early]
    hs = [p for p in hs if p]
    travel = dist(hs[0], hs[-1]) if len(hs) > 1 else 99
    halfcourt = sum(1 for f in early for p in players(f, offense) if ax(p, sign) > 47)
    visible = sum(len(players(f, offense)) for f in early)
    half_ratio = halfcourt / visible if visible else 0
    if baseline <= 4.5 and travel <= 10 and half_ratio >= .6:
        conf = clamp(.52 + (4.5-baseline)/10 + .12*half_ratio)
        out.append(event(pos, fps, offset, "blob", 0, min(len(fs)-1, int(fps*4)), conf,
                         family="restart", evidence={"boundary_ft": round(baseline,2), "initial_travel_ft": round(travel,2), "frontcourt_ratio": round(half_ratio,3)}))
    elif sideline <= 3.5 and travel <= 10 and half_ratio >= .55:
        conf = clamp(.52 + (3.5-sideline)/9 + .12*half_ratio)
        out.append(event(pos, fps, offset, "slob", 0, min(len(fs)-1, int(fps*4)), conf,
                         family="restart", evidence={"boundary_ft": round(sideline,2), "initial_travel_ft": round(travel,2), "frontcourt_ratio": round(half_ratio,3)}))

    sec = possession_seconds(pos, fps)
    early_h = [handler(f, offense) for f in fs[:min(len(fs), max(3, int(fps*5)))] ]
    early_h = [p for p in early_h if p]
    if len(early_h) >= 2:
        progress = ax(early_h[-1], sign) - ax(early_h[0], sign)
        start_ax = ax(early_h[0], sign)
        if start_ax < 47 and progress >= 20 and sec <= 12:
            conf = clamp(.55 + progress/90 + (12-sec)/40)
            out.append(event(pos, fps, offset, "transition", 0, min(len(fs)-1, int(fps*8)), conf,
                             family="phase", evidence={"progress_ft": round(progress,2), "start_attack_x": round(start_ax,2), "possession_seconds": round(sec,2)}))
        elif start_ax < 55 and progress >= 10 and sec <= 15:
            out.append(event(pos, fps, offset, "early_offense", 0, min(len(fs)-1, int(fps*7)), clamp(.5+progress/80),
                             family="phase", evidence={"progress_ft": round(progress,2), "possession_seconds": round(sec,2)}))
        else:
            out.append(event(pos, fps, offset, "halfcourt", 0, min(len(fs)-1, int(fps*8)), .68,
                             family="phase", evidence={"progress_ft": round(progress,2), "possession_seconds": round(sec,2)}))
    return out


def handler_changes(pos: dict) -> list[tuple[int, str, str]]:
    offense = pos.get("offense")
    fs = pos.get("frames", [])
    last = None
    changes = []
    for i, f in enumerate(fs):
        h = handler(f, offense)
        hid = str(h.get("track_id")) if h else None
        if hid and last and hid != last:
            changes.append((i, last, hid))
        if hid:
            last = hid
    return changes


def detect_handoffs(pos: dict, fps: float, offset: float) -> list[dict]:
    fs = pos.get("frames", [])
    out = []
    for i, old_id, new_id in handler_changes(pos):
        pre = fs[max(0, i-2)]
        post = fs[min(len(fs)-1, i+2)]
        a0, b0 = by_id(pre, old_id), by_id(pre, new_id)
        a1, b1 = by_id(post, old_id), by_id(post, new_id)
        if not all((a0,b0,a1,b1)):
            continue
        close = min(dist(a0,b0), dist(a1,b1))
        if close <= 4.5:
            movement = dist(b0,b1)
            conf = clamp(.58 + (4.5-close)/8 + min(movement,8)/30)
            out.append(event(pos, fps, offset, "handoff", max(0,i-4), min(len(fs)-1,i+6), conf,
                             evidence={"exchange_distance_ft": round(close,2), "receiver_move_ft": round(movement,2), "from": old_id, "to": new_id},
                             tags=["dho"]))
    return out


def detect_cuts_screens_isos(pos: dict, fps: float, offset: float) -> list[dict]:
    fs = pos.get("frames", [])
    if len(fs) < 5:
        return []
    offense = pos.get("offense")
    sign = attack_sign(pos)
    out = []
    # Track non-handler player motion toward the attacking basket.
    tracks = defaultdict(list)
    for i, f in enumerate(fs):
        h = handler(f, offense)
        hid = str(h.get("track_id")) if h else None
        for p in players(f, offense):
            if str(p.get("track_id")) != hid:
                tracks[str(p.get("track_id"))].append((i, p))
    best_cut = None
    for tid, seq in tracks.items():
        if len(seq) < 4:
            continue
        i0,p0 = seq[0]; i1,p1 = seq[-1]
        advance = ax(p1, sign)-ax(p0, sign)
        lateral = abs(float(p1["y"])-float(p0["y"]))
        if advance >= 10 and ax(p1, sign) >= 72:
            score = clamp(.48 + advance/45 + min(lateral,10)/80)
            cand = (score, tid, i0, i1, advance)
            if best_cut is None or cand[0] > best_cut[0]:
                best_cut = cand
    if best_cut:
        score, tid, i0, i1, advance = best_cut
        out.append(event(pos, fps, offset, "cut", i0, i1, score,
                         evidence={"cutter": tid, "rimward_advance_ft": round(advance,2)}, tags=["basket_cut"]))

    # Off-ball screen: two non-handler teammates converge while one then separates quickly.
    best_screen = None
    sample_step = max(1, int(max(1, fps//4)))
    for i in range(1, len(fs)-2, sample_step):
        f = fs[i]; h = handler(f, offense); hid = str(h.get("track_id")) if h else None
        mates = [p for p in players(f, offense) if str(p.get("track_id")) != hid]
        for a_i in range(len(mates)):
            for b_i in range(a_i+1, len(mates)):
                a,b = mates[a_i], mates[b_i]
                close = dist(a,b)
                if close > 4:
                    continue
                post = fs[min(len(fs)-1, i+max(2,int(fps*.8)))]
                a1,b1 = by_id(post,a["track_id"]), by_id(post,b["track_id"])
                if not a1 or not b1:
                    continue
                separation = dist(a1,b1)-close
                if separation >= 5:
                    score = clamp(.48 + (4-close)/8 + separation/25)
                    cand=(score,i,str(a['track_id']),str(b['track_id']),close,separation)
                    if best_screen is None or score > best_screen[0]: best_screen=cand
    if best_screen:
        score,i,a,b,close,separation=best_screen
        out.append(event(pos,fps,offset,"off_ball_screen",max(0,i-3),min(len(fs)-1,i+int(fps*2)),score,
                         evidence={"screen_pair":[a,b],"min_distance_ft":round(close,2),"post_separation_ft":round(separation,2)}))

    # Isolation: same handler controls for a sustained window with teammates spaced and no nearby screener.
    counts=Counter()
    for f in fs:
        h=handler(f,offense)
        if h: counts[str(h['track_id'])]+=1
    if counts:
        hid,held=counts.most_common(1)[0]
        ratio=held/len(fs)
        sample=[]
        for f in fs:
            h=by_id(f,hid)
            if not h: continue
            mates=[p for p in players(f,offense) if str(p.get('track_id'))!=hid]
            if mates: sample.append(min(dist(h,m) for m in mates))
        spacing=median(sample,0)
        if ratio>=.62 and spacing>=9 and possession_seconds(pos,fps)>=3:
            conf=clamp(.5+(ratio-.62)*.8+(spacing-9)/30)
            out.append(event(pos,fps,offset,"isolation",0,len(fs)-1,conf,
                             evidence={"handler":hid,"control_ratio":round(ratio,3),"nearest_teammate_median_ft":round(spacing,2)}))

    # Post-up/touch: sustained handler control near a basket and lane/post channel.
    post_samples=[]
    for i,f in enumerate(fs):
        h=handler(f,offense)
        if h and ax(h,sign)>=76 and 8 <= float(h['y']) <= 42:
            post_samples.append((i,h))
    if len(post_samples)>=max(3,int(fps*.7)):
        i0=post_samples[0][0]; i1=post_samples[-1][0]
        conf=clamp(.55+len(post_samples)/max(len(fs),1)*.3)
        out.append(event(pos,fps,offset,"post_up",i0,i1,conf,
                         evidence={"post_frames":len(post_samples),"attack_x_median":round(median(ax(p,sign) for _,p in post_samples),2)}))
    return out


def nearest_assignments(frame: dict, offense, defense) -> dict[str,str]:
    offs=players(frame,offense); defs=players(frame,defense)
    assigned={}; used=set()
    pairs=[]
    for d in defs:
        for o in offs:
            pairs.append((dist(d,o),str(d['track_id']),str(o['track_id'])))
    for _,d,o in sorted(pairs):
        if d not in assigned and o not in used:
            assigned[d]=o; used.add(o)
    return assigned


def _zone_shape(defs: list[dict], sign: int) -> tuple[str,float,dict]:
    if len(defs) < 5:
        return "unknown",0.0,{}
    ds=sorted(defs,key=lambda p:ax(p,sign))
    xs=[ax(p,sign) for p in ds]
    gaps=[xs[i+1]-xs[i] for i in range(len(xs)-1)]
    if not gaps:
        return "unknown",0.0,{}
    # 1-3-1 when two strong layer gaps isolate one high and one low defender.
    ranked=sorted(range(len(gaps)),key=lambda i:gaps[i],reverse=True)
    if len(ranked)>=2:
        cuts=sorted([ranked[0]+1, ranked[1]+1])
        sizes=[cuts[0],cuts[1]-cuts[0],len(ds)-cuts[1]]
        if sizes==[1,3,1] and min(gaps[ranked[0]],gaps[ranked[1]])>=3.0:
            return "zone_1_3_1",clamp(.58+min(gaps[ranked[0]],gaps[ranked[1]])/20),{"layers":sizes,"x_gaps":[round(g,2) for g in gaps]}
    cut=max(range(len(gaps)),key=lambda i:gaps[i])+1
    front=cut; back=len(ds)-cut
    gap=max(gaps)
    if gap<2.0:
        return "unknown",.35,{"layers":[front,back],"x_gaps":[round(g,2) for g in gaps]}
    if (front,back)==(2,3):
        return "zone_2_3",clamp(.55+gap/22),{"layers":[2,3],"x_gap":round(gap,2)}
    if (front,back)==(3,2):
        return "zone_3_2",clamp(.55+gap/22),{"layers":[3,2],"x_gap":round(gap,2)}
    return "unknown",.4,{"layers":[front,back],"x_gap":round(gap,2)}


def detect_defense(pos: dict, fps: float, offset: float) -> list[dict]:
    fs=pos.get('frames',[]); offense=pos.get('offense')
    if len(fs)<5 or offense is None:return []
    team_names=[p.get('team') for f in fs for p in f.get('players',[]) if p.get('team') is not None and p.get('team')!=offense]
    if not team_names:return []
    defense=Counter(team_names).most_common(1)[0][0]; sign=attack_sign(pos)
    out=[]; shapes=[]; assignment_changes=[]; prev=None
    sample_step=max(1,int(max(1,fps//3)))
    for i in range(0,len(fs),sample_step):
        f=fs[i]; defs=players(f,defense); offs=players(f,offense)
        if len(defs)>=5 and len(offs)>=4 and median(ax(p,sign) for p in defs)>=52:
            shape,score,feat=_zone_shape(defs,sign)
            if shape!='unknown': shapes.append((i,shape,score,feat))
        ass=nearest_assignments(f,offense,defense)
        if prev and ass:
            common=set(prev)&set(ass)
            if common: assignment_changes.append(sum(prev[d]!=ass[d] for d in common)/len(common))
        if ass:prev=ass
    if shapes:
        by=Counter(s for _,s,_,_ in shapes); shape,n=by.most_common(1)[0]
        consistency=n/len(shapes); avg=median(score for _,s,score,_ in shapes if s==shape)
        change=median(assignment_changes,0)
        # Zone becomes more plausible when spatial layers persist while nearest assignments change.
        conf=clamp(.45+.25*consistency+.18*change+.12*avg)
        if conf>=.48:
            first=next(i for i,s,_,_ in shapes if s==shape); last=max(i for i,s,_,_ in shapes if s==shape)
            out.append(event(pos,fps,offset,"defensive_scheme",first,last,conf,coverage=shape,family="defense",
                             evidence={"shape_consistency":round(consistency,3),"assignment_change":round(change,3),"sample_count":len(shapes)},tags=["zone",shape]))
    # Man detection is the fallback only if match assignments are relatively stable and no strong zone was emitted.
    if not any(e.get('coverage','').startswith('zone_') for e in out) and assignment_changes:
        change=median(assignment_changes,1)
        conf=clamp(.72-.45*change)
        if conf>=.5:
            out.append(event(pos,fps,offset,"defensive_scheme",0,len(fs)-1,conf,coverage="man",family="defense",
                             evidence={"assignment_change":round(change,3)},tags=["man_to_man"]))

    # Pressure / trapping: count defenders near handler before offense reaches front court.
    pressure_samples=[]; trap_samples=[]
    for i,f in enumerate(fs):
        h=handler(f,offense)
        if not h:continue
        defs=players(f,defense); near=sum(1 for d in defs if dist(h,d)<=5)
        hx=ax(h,sign)
        if hx<47: pressure_samples.append((i,near,hx))
        if near>=2: trap_samples.append((i,near,hx))
    if pressure_samples:
        pressured=sum(1 for _,near,_ in pressure_samples if near>=1)/len(pressure_samples)
        deepest=min(hx for _,_,hx in pressure_samples)
        if pressured>=.65 and deepest<25:
            out.append(event(pos,fps,offset,"full_court_press",pressure_samples[0][0],pressure_samples[-1][0],clamp(.5+.35*pressured),family="defense",
                             evidence={"pressured_ratio":round(pressured,3),"deepest_attack_x":round(deepest,2)}))
        elif pressured>=.65:
            out.append(event(pos,fps,offset,"half_court_press",pressure_samples[0][0],pressure_samples[-1][0],clamp(.48+.3*pressured),family="defense",
                             evidence={"pressured_ratio":round(pressured,3)}))
    if len(trap_samples)>=max(2,int(fps*.4)):
        out.append(event(pos,fps,offset,"trap",trap_samples[0][0],trap_samples[-1][0],clamp(.55+len(trap_samples)/max(len(fs),1)*.35),family="defense",
                         evidence={"two_defender_frames":len(trap_samples)}))
    return out


def detect_help_rotations(pos: dict, fps: float, offset: float) -> list[dict]:
    fs=pos.get('frames',[]); offense=pos.get('offense')
    if len(fs)<7:return []
    team_names=[p.get('team') for f in fs for p in f.get('players',[]) if p.get('team') is not None and p.get('team')!=offense]
    if not team_names:return []
    defense=Counter(team_names).most_common(1)[0][0]
    sign=attack_sign(pos); candidates=[]
    for i in range(2,len(fs)-2):
        f0,f1=fs[i-2],fs[i+2]; h0,h1=handler(f0,offense),handler(f1,offense)
        if not h0 or not h1:continue
        # Rimward handler movement is the trigger for help.
        if ax(h1,sign)-ax(h0,sign)<3:continue
        defs0=players(f0,defense); defs1=players(f1,defense)
        if len(defs0)<3 or len(defs1)<3:continue
        near0=sorted((dist(h0,d),d) for d in defs0)
        near1=sorted((dist(h1,d),d) for d in defs1)
        if len(near1)>=2 and near1[1][0]<=6 and (len(near0)<2 or near0[1][0]>7):
            score=clamp(.5+(7-near1[1][0])/12+(ax(h1,sign)-ax(h0,sign))/25)
            candidates.append((score,i,near1[0][1]['track_id'],near1[1][1]['track_id']))
    if not candidates:return []
    score,i,d1,d2=max(candidates)
    return [event(pos,fps,offset,"help_and_recover",max(0,i-int(fps)),min(len(fs)-1,i+int(fps*1.5)),score,family="defense",
                  evidence={"primary_defender":str(d1),"helper":str(d2)},tags=["help","rotation"])]


def _dedupe(events: list[dict]) -> list[dict]:
    """Keep strongest overlapping event per action/coverage while preserving layers."""
    ordered=sorted(events,key=lambda e:(e.get('videoStart',0),-(e.get('confidence') or {}).get('action',0)))
    kept=[]
    for e in ordered:
        duplicate=False
        for k in kept:
            same=e.get('action')==k.get('action') and e.get('coverage')==k.get('coverage')
            overlap=min(e['videoEnd'],k['videoEnd'])-max(e['videoStart'],k['videoStart'])
            if same and overlap>=0 and overlap>=.5*max(.1,min(e['videoEnd']-e['videoStart'],k['videoEnd']-k['videoStart'])):
                duplicate=True;break
        if not duplicate:kept.append(e)
    return kept


def detect(payload: dict) -> dict:
    fps=float(payload.get('fps',25)); offset=float(payload.get('video_offset',0)); events=[]
    # Keep the specialised PnR detector and add all other layers around it.
    pnr=detect_pnr(payload)
    for e in pnr.get('events',[]):
        e['family']='ball_screen';e['model']='courtiq-tactical-heuristics-v234';e.setdefault('confidence_key','coverage')
        events.append(e)
    for pos in payload.get('possessions',[]):
        events.extend(detect_restart_phase(pos,fps,offset))
        events.extend(detect_handoffs(pos,fps,offset))
        events.extend(detect_cuts_screens_isos(pos,fps,offset))
        events.extend(detect_defense(pos,fps,offset))
        events.extend(detect_help_rotations(pos,fps,offset))
    events=_dedupe(events)
    counts=Counter()
    for e in events:
        counts[e.get('action','unknown')]+=1
        if e.get('coverage'):counts[e['coverage']]+=1
    return {
        'schema':'courtiq-tactical-events-v2',
        'model':'courtiq-tactical-heuristics-v234',
        'events':events,
        'labels':dict(counts),
    }
