"""CourtIQ v234 multi-layer basketball tactical detector.

Consumes normalized 94x50 court tracking and emits evidence-first tactical
labels. Strong labels can pass automatically; uncertain labels are left for the
quality gate and analyst review.
"""
from __future__ import annotations

import math
import statistics
from collections import Counter, defaultdict

from ai.pnr_detector import detect as detect_pnr


def clamp(v):
    return max(0.0, min(1.0, float(v)))


def dist(a, b):
    return math.hypot(float(a.get('x', 0)) - float(b.get('x', 0)), float(a.get('y', 0)) - float(b.get('y', 0)))


def players(frame, team=None):
    rows = list(frame.get('players', []))
    return rows if team is None else [p for p in rows if p.get('team') == team]


def handler(frame, team=None):
    return next((p for p in players(frame, team) if p.get('has_ball')), None)


def by_id(frame, track_id):
    return next((p for p in frame.get('players', []) if str(p.get('track_id')) == str(track_id)), None)


def median(values, default=0.0):
    values = [float(v) for v in values]
    return statistics.median(values) if values else float(default)


def attack_sign(pos):
    """+1 means offense attacks x=94, -1 means offense attacks x=0."""
    fs = pos.get('frames', [])
    if not fs:
        return 1
    offense = pos.get('offense')
    n = max(1, min(8, max(1, len(fs) // 3)))
    first = [handler(f, offense) for f in fs[:n]]
    last = [handler(f, offense) for f in fs[-n:]]
    first = [p for p in first if p]
    last = [p for p in last if p]
    if first and last:
        delta = median([p['x'] for p in last]) - median([p['x'] for p in first])
        if abs(delta) >= 2:
            return 1 if delta > 0 else -1
    late = [p['x'] for f in fs[len(fs)//2:] for p in players(f, offense)]
    return 1 if median(late, 47) >= 47 else -1


def ax(player, sign):
    x = float(player.get('x', 0))
    return x if sign > 0 else 94 - x


def _time(frame, fps, offset):
    return float(offset) + float(frame.get('frame', 0)) / max(float(fps), 1e-6)


def make_event(pos, fps, offset, action, start_i, end_i, confidence, *, coverage=None, family='offense', evidence=None, tags=None):
    fs = pos.get('frames', [])
    start_i = max(0, min(int(start_i), len(fs) - 1))
    end_i = max(start_i, min(int(end_i), len(fs) - 1))
    mid_i = (start_i + end_i) // 2
    conf = {'action': round(clamp(confidence), 3)}
    event = {
        'id': f"ai_{action}_{pos.get('id', 'pos')}_{start_i}",
        'type': 'tactical',
        'family': family,
        'action': action,
        'tactic': action,
        'offenseTeam': pos.get('offense'),
        'videoStart': round(_time(fs[start_i], fps, offset), 3),
        'videoTime': round(_time(fs[mid_i], fps, offset), 3),
        'videoEnd': round(_time(fs[end_i], fps, offset), 3),
        'points': int((pos.get('outcome') or {}).get('points', 0) or 0),
        'outcome': pos.get('outcome') or {},
        'tags': list(dict.fromkeys([action] + list(tags or []))),
        'confidence': conf,
        'confidence_key': 'action',
        'verification': 'ai',
        'model': 'courtiq-tactical-heuristics-v234',
        'evidence': evidence or {},
    }
    if coverage:
        event['coverage'] = coverage
        event['defense'] = {'coverage': coverage}
        event['confidence']['coverage'] = round(clamp(confidence), 3)
        event['confidence_key'] = 'coverage'
        event['tags'].append(coverage)
    return event


def possession_seconds(pos, fps):
    fs = pos.get('frames', [])
    if len(fs) < 2:
        return 0.0
    return max(0.0, (float(fs[-1].get('frame', 0)) - float(fs[0].get('frame', 0))) / max(float(fps), 1e-6))


def detect_restart_phase(pos, fps, offset):
    fs = pos.get('frames', [])
    if len(fs) < 3:
        return []
    offense = pos.get('offense')
    sign = attack_sign(pos)
    early_count = min(len(fs), max(3, int(float(fps) * 1.5)))
    early = fs[:early_count]
    first = None
    for f in early:
        h = handler(f, offense)
        if h:
            first = h
            break
    if not first:
        return []

    out = []
    explicit = str(pos.get('restart_type') or pos.get('restart') or '').lower()
    baseline = min(float(first['x']), 94 - float(first['x']))
    sideline = min(float(first['y']), 50 - float(first['y']))
    hs = [handler(f, offense) for f in early]
    hs = [p for p in hs if p]
    travel = dist(hs[0], hs[-1]) if len(hs) > 1 else 99
    visible = sum(len(players(f, offense)) for f in early)
    front = sum(1 for f in early for p in players(f, offense) if ax(p, sign) > 47)
    front_ratio = front / visible if visible else 0

    if explicit in {'blob', 'baseline', 'baseline_inbound'}:
        out.append(make_event(pos, fps, offset, 'blob', 0, min(len(fs)-1, int(fps*4)), .93, family='restart', evidence={'source':'pbp_sync'}))
    elif explicit in {'slob', 'sideline', 'sideline_inbound'}:
        out.append(make_event(pos, fps, offset, 'slob', 0, min(len(fs)-1, int(fps*4)), .93, family='restart', evidence={'source':'pbp_sync'}))
    elif baseline <= 4.5 and travel <= 10 and front_ratio >= .60:
        conf = clamp(.52 + (4.5 - baseline) / 10 + .12 * front_ratio)
        out.append(make_event(pos, fps, offset, 'blob', 0, min(len(fs)-1, int(fps*4)), conf, family='restart', evidence={'boundary_ft':round(baseline,2),'initial_travel_ft':round(travel,2),'frontcourt_ratio':round(front_ratio,3)}))
    elif sideline <= 3.5 and travel <= 10 and front_ratio >= .55:
        conf = clamp(.52 + (3.5 - sideline) / 9 + .12 * front_ratio)
        out.append(make_event(pos, fps, offset, 'slob', 0, min(len(fs)-1, int(fps*4)), conf, family='restart', evidence={'boundary_ft':round(sideline,2),'initial_travel_ft':round(travel,2),'frontcourt_ratio':round(front_ratio,3)}))

    phase_frames = fs[:min(len(fs), max(3, int(fps * 5)))]
    phase_handlers = [handler(f, offense) for f in phase_frames]
    phase_handlers = [p for p in phase_handlers if p]
    if len(phase_handlers) >= 2:
        progress = ax(phase_handlers[-1], sign) - ax(phase_handlers[0], sign)
        start_x = ax(phase_handlers[0], sign)
        sec = possession_seconds(pos, fps)
        if start_x < 47 and progress >= 20 and sec <= 12:
            out.append(make_event(pos, fps, offset, 'transition', 0, min(len(fs)-1, int(fps*8)), clamp(.55 + progress/90 + (12-sec)/40), family='phase', evidence={'progress_ft':round(progress,2),'possession_seconds':round(sec,2)}))
        elif start_x < 55 and progress >= 10 and sec <= 15:
            out.append(make_event(pos, fps, offset, 'early_offense', 0, min(len(fs)-1, int(fps*7)), clamp(.50 + progress/80), family='phase', evidence={'progress_ft':round(progress,2)}))
        else:
            out.append(make_event(pos, fps, offset, 'halfcourt', 0, min(len(fs)-1, int(fps*8)), .68, family='phase', evidence={'progress_ft':round(progress,2)}))
    return out


def _handler_changes(pos):
    offense = pos.get('offense')
    last = None
    changes = []
    for i, frame in enumerate(pos.get('frames', [])):
        h = handler(frame, offense)
        hid = str(h.get('track_id')) if h else None
        if hid and last and hid != last:
            changes.append((i, last, hid))
        if hid:
            last = hid
    return changes


def detect_handoffs(pos, fps, offset):
    fs = pos.get('frames', [])
    out = []
    for i, old_id, new_id in _handler_changes(pos):
        pre = fs[max(0, i-2)]
        post = fs[min(len(fs)-1, i+2)]
        a0, b0 = by_id(pre, old_id), by_id(pre, new_id)
        a1, b1 = by_id(post, old_id), by_id(post, new_id)
        if not all((a0, b0, a1, b1)):
            continue
        close = min(dist(a0, b0), dist(a1, b1))
        if close <= 4.5:
            movement = dist(b0, b1)
            conf = clamp(.58 + (4.5-close)/8 + min(movement,8)/30)
            out.append(make_event(pos, fps, offset, 'handoff', max(0,i-4), min(len(fs)-1,i+6), conf, evidence={'exchange_distance_ft':round(close,2),'receiver_move_ft':round(movement,2),'from':old_id,'to':new_id}, tags=['dho']))
    return out


def detect_cuts_screens_isos(pos, fps, offset):
    fs = pos.get('frames', [])
    if len(fs) < 5:
        return []
    offense = pos.get('offense')
    sign = attack_sign(pos)
    out = []

    tracks = defaultdict(list)
    for i, frame in enumerate(fs):
        h = handler(frame, offense)
        hid = str(h.get('track_id')) if h else None
        for p in players(frame, offense):
            if str(p.get('track_id')) != hid:
                tracks[str(p.get('track_id'))].append((i, p))
    best_cut = None
    for tid, seq in tracks.items():
        if len(seq) < 4:
            continue
        i0, p0 = seq[0]
        i1, p1 = seq[-1]
        advance = ax(p1, sign) - ax(p0, sign)
        if advance >= 10 and ax(p1, sign) >= 72:
            score = clamp(.48 + advance/45)
            if best_cut is None or score > best_cut[0]:
                best_cut = (score, tid, i0, i1, advance)
    if best_cut:
        score, tid, i0, i1, advance = best_cut
        out.append(make_event(pos, fps, offset, 'cut', i0, i1, score, evidence={'cutter':tid,'rimward_advance_ft':round(advance,2)}, tags=['basket_cut']))

    step = max(1, int(max(1, fps // 4)))
    best_screen = None
    for i in range(1, len(fs)-2, step):
        frame = fs[i]
        h = handler(frame, offense)
        hid = str(h.get('track_id')) if h else None
        mates = [p for p in players(frame, offense) if str(p.get('track_id')) != hid]
        for a_i in range(len(mates)):
            for b_i in range(a_i+1, len(mates)):
                a, b = mates[a_i], mates[b_i]
                close = dist(a, b)
                if close > 4:
                    continue
                post = fs[min(len(fs)-1, i + max(2, int(fps*.8)))]
                a1, b1 = by_id(post, a['track_id']), by_id(post, b['track_id'])
                if not a1 or not b1:
                    continue
                separation = dist(a1, b1) - close
                if separation >= 5:
                    score = clamp(.48 + (4-close)/8 + separation/25)
                    if best_screen is None or score > best_screen[0]:
                        best_screen = (score, i, str(a['track_id']), str(b['track_id']), close, separation)
    if best_screen:
        score, i, a, b, close, separation = best_screen
        out.append(make_event(pos, fps, offset, 'off_ball_screen', max(0,i-3), min(len(fs)-1,i+int(fps*2)), score, evidence={'screen_pair':[a,b],'min_distance_ft':round(close,2),'post_separation_ft':round(separation,2)}))

    counts = Counter()
    for frame in fs:
        h = handler(frame, offense)
        if h:
            counts[str(h['track_id'])] += 1
    if counts:
        hid, held = counts.most_common(1)[0]
        ratio = held / len(fs)
        nearest = []
        for frame in fs:
            h = by_id(frame, hid)
            if not h:
                continue
            mates = [p for p in players(frame, offense) if str(p.get('track_id')) != hid]
            if mates:
                nearest.append(min(dist(h, m) for m in mates))
        spacing = median(nearest, 0)
        if ratio >= .62 and spacing >= 9 and possession_seconds(pos, fps) >= 3:
            out.append(make_event(pos, fps, offset, 'isolation', 0, len(fs)-1, clamp(.50 + (ratio-.62)*.8 + (spacing-9)/30), evidence={'handler':hid,'control_ratio':round(ratio,3),'nearest_teammate_median_ft':round(spacing,2)}))

    post_samples = []
    for i, frame in enumerate(fs):
        h = handler(frame, offense)
        if h and ax(h, sign) >= 76 and 8 <= float(h['y']) <= 42:
            post_samples.append((i, h))
    if len(post_samples) >= max(3, int(fps*.7)):
        out.append(make_event(pos, fps, offset, 'post_up', post_samples[0][0], post_samples[-1][0], clamp(.55 + len(post_samples)/max(len(fs),1)*.3), evidence={'post_frames':len(post_samples)}))
    return out


def _nearest_assignments(frame, offense, defense):
    offs = players(frame, offense)
    defs = players(frame, defense)
    pairs = sorted((dist(d,o), str(d['track_id']), str(o['track_id'])) for d in defs for o in offs)
    assigned = {}
    used = set()
    for _, d, o in pairs:
        if d not in assigned and o not in used:
            assigned[d] = o
            used.add(o)
    return assigned


def _zone_shape(defenders, sign):
    if len(defenders) < 5:
        return 'unknown', 0.0
    ds = sorted(defenders, key=lambda p: ax(p, sign))[:5]
    xs = [ax(p, sign) for p in ds]
    gaps = [xs[i+1] - xs[i] for i in range(4)]
    ranked = sorted(range(4), key=lambda i: gaps[i], reverse=True)
    if len(ranked) >= 2:
        cuts = sorted([ranked[0]+1, ranked[1]+1])
        sizes = [cuts[0], cuts[1]-cuts[0], 5-cuts[1]]
        if sizes == [1,3,1] and min(gaps[ranked[0]], gaps[ranked[1]]) >= 3:
            return 'zone_1_3_1', clamp(.58 + min(gaps[ranked[0]], gaps[ranked[1]])/20)
    gap = max(gaps)
    cut = gaps.index(gap) + 1
    if gap < 2:
        return 'unknown', .35
    if cut == 2:
        return 'zone_2_3', clamp(.55 + gap/22)
    if cut == 3:
        return 'zone_3_2', clamp(.55 + gap/22)
    return 'unknown', .40


def detect_defense(pos, fps, offset):
    fs = pos.get('frames', [])
    offense = pos.get('offense')
    if len(fs) < 5 or offense is None:
        return []
    names = [p.get('team') for f in fs for p in f.get('players', []) if p.get('team') is not None and p.get('team') != offense]
    if not names:
        return []
    defense = Counter(names).most_common(1)[0][0]
    sign = attack_sign(pos)
    shapes = []
    changes = []
    previous = None
    step = max(1, int(max(1, fps // 3)))
    for i in range(0, len(fs), step):
        frame = fs[i]
        defs = players(frame, defense)
        offs = players(frame, offense)
        if len(defs) >= 5 and len(offs) >= 4 and median([ax(p, sign) for p in defs]) >= 52:
            shape, score = _zone_shape(defs, sign)
            if shape != 'unknown':
                shapes.append((i, shape, score))
        assignment = _nearest_assignments(frame, offense, defense)
        if previous and assignment:
            common = set(previous) & set(assignment)
            if common:
                changes.append(sum(previous[d] != assignment[d] for d in common) / len(common))
        if assignment:
            previous = assignment

    out = []
    if shapes:
        chosen, hits = Counter(s for _, s, _ in shapes).most_common(1)[0]
        consistency = hits / len(shapes)
        change = median(changes, 0)
        avg = median([score for _, s, score in shapes if s == chosen], .5)
        conf = clamp(.45 + .25*consistency + .18*change + .12*avg)
        if conf >= .48:
            idx = [i for i, s, _ in shapes if s == chosen]
            out.append(make_event(pos, fps, offset, 'defensive_scheme', min(idx), max(idx), conf, coverage=chosen, family='defense', evidence={'shape_consistency':round(consistency,3),'assignment_change':round(change,3),'sample_count':len(shapes)}, tags=['zone', chosen]))
    if not any(e.get('coverage','').startswith('zone_') for e in out) and changes:
        change = median(changes, 1)
        conf = clamp(.72 - .45*change)
        if conf >= .5:
            out.append(make_event(pos, fps, offset, 'defensive_scheme', 0, len(fs)-1, conf, coverage='man', family='defense', evidence={'assignment_change':round(change,3)}, tags=['man_to_man']))

    pressure = []
    traps = []
    for i, frame in enumerate(fs):
        h = handler(frame, offense)
        if not h:
            continue
        defs = players(frame, defense)
        near = sum(1 for d in defs if dist(h, d) <= 5)
        hx = ax(h, sign)
        if hx < 47:
            pressure.append((i, near, hx))
        if near >= 2:
            traps.append((i, near, hx))
    if pressure:
        ratio = sum(1 for _, near, _ in pressure if near >= 1) / len(pressure)
        deepest = min(hx for _, _, hx in pressure)
        if ratio >= .65 and deepest < 25:
            out.append(make_event(pos, fps, offset, 'full_court_press', pressure[0][0], pressure[-1][0], clamp(.50 + .35*ratio), family='defense', evidence={'pressured_ratio':round(ratio,3),'deepest_attack_x':round(deepest,2)}))
        elif ratio >= .65:
            out.append(make_event(pos, fps, offset, 'half_court_press', pressure[0][0], pressure[-1][0], clamp(.48 + .30*ratio), family='defense', evidence={'pressured_ratio':round(ratio,3)}))
    if len(traps) >= max(2, int(fps*.4)):
        out.append(make_event(pos, fps, offset, 'trap', traps[0][0], traps[-1][0], clamp(.55 + len(traps)/max(len(fs),1)*.35), family='defense', evidence={'two_defender_frames':len(traps)}))
    return out


def detect_help_rotations(pos, fps, offset):
    fs = pos.get('frames', [])
    offense = pos.get('offense')
    if len(fs) < 7:
        return []
    names = [p.get('team') for f in fs for p in f.get('players', []) if p.get('team') is not None and p.get('team') != offense]
    if not names:
        return []
    defense = Counter(names).most_common(1)[0][0]
    sign = attack_sign(pos)
    best = None
    for i in range(2, len(fs)-2):
        h0 = handler(fs[i-2], offense)
        h1 = handler(fs[i+2], offense)
        if not h0 or not h1 or ax(h1, sign) - ax(h0, sign) < 3:
            continue
        d0 = sorted((dist(h0,d), d) for d in players(fs[i-2], defense))
        d1 = sorted((dist(h1,d), d) for d in players(fs[i+2], defense))
        if len(d1) >= 2 and d1[1][0] <= 6 and (len(d0) < 2 or d0[1][0] > 7):
            score = clamp(.50 + (7-d1[1][0])/12 + (ax(h1,sign)-ax(h0,sign))/25)
            if best is None or score > best[0]:
                best = (score, i, str(d1[0][1]['track_id']), str(d1[1][1]['track_id']))
    if not best:
        return []
    score, i, d1, d2 = best
    return [make_event(pos, fps, offset, 'help_and_recover', max(0,i-int(fps)), min(len(fs)-1,i+int(fps*1.5)), score, family='defense', evidence={'primary_defender':d1,'helper':d2}, tags=['help','rotation'])]


def _dedupe(events):
    ordered = sorted(events, key=lambda e: (float(e.get('videoStart',0)), -float((e.get('confidence') or {}).get('action',0))))
    kept = []
    for e in ordered:
        duplicate = False
        for k in kept:
            same = e.get('action') == k.get('action') and e.get('coverage') == k.get('coverage')
            overlap = min(e['videoEnd'],k['videoEnd']) - max(e['videoStart'],k['videoStart'])
            shorter = min(e['videoEnd']-e['videoStart'], k['videoEnd']-k['videoStart'])
            if same and overlap >= .5 * max(.1, shorter):
                duplicate = True
                break
        if not duplicate:
            kept.append(e)
    return kept


def detect(payload):
    fps = float(payload.get('fps',25) or 25)
    offset = float(payload.get('video_offset',0) or 0)
    events = []
    pnr = detect_pnr(payload)
    for e in pnr.get('events', []):
        e['family'] = 'ball_screen'
        e['model'] = 'courtiq-tactical-heuristics-v234'
        e['confidence_key'] = 'coverage'
        events.append(e)
    for pos in payload.get('possessions', []):
        events.extend(detect_restart_phase(pos, fps, offset))
        events.extend(detect_handoffs(pos, fps, offset))
        events.extend(detect_cuts_screens_isos(pos, fps, offset))
        events.extend(detect_defense(pos, fps, offset))
        events.extend(detect_help_rotations(pos, fps, offset))
    events = _dedupe(events)
    counts = Counter()
    for e in events:
        counts[e.get('action','unknown')] += 1
        if e.get('coverage'):
            counts[e['coverage']] += 1
    return {'schema':'courtiq-tactical-events-v2','model':'courtiq-tactical-heuristics-v234','events':events,'labels':dict(counts)}
