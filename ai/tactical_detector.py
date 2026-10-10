"""CourtIQ multi-concept tactical detector.

Consumes possession-segmented, court-normalized tracking data and emits conservative,
reviewable tactical events. It combines the existing PnR detector with set-play and
zone-defense classifiers. Spatial-only BLOB/SLOB detections are intentionally lower
confidence unless a possession carries an explicit restart label from synchronized PBP.
"""
from __future__ import annotations

from collections import Counter
import math

from ai.pnr_detector import detect as detect_pnr

COURT_LENGTH = 94.0
COURT_WIDTH = 50.0


def clamp(v):
    return max(0.0, min(1.0, float(v)))


def _attack_x(x, direction=1):
    x = float(x)
    return x if int(direction or 1) >= 0 else COURT_LENGTH - x


def _players(frame, team=None):
    rows = frame.get("players", [])
    return [p for p in rows if team is None or p.get("team") == team]


def _handler(frame, offense):
    return next((p for p in _players(frame, offense) if p.get("has_ball")), None)


def _defense_team(pos):
    offense = pos.get("offense")
    for frame in pos.get("frames", []):
        for p in frame.get("players", []):
            if p.get("team") is not None and p.get("team") != offense:
                return p.get("team")
    return None


def _t(pos, index, fps, offset):
    frames = pos.get("frames", [])
    if not frames:
        return float(offset)
    index = max(0, min(len(frames) - 1, int(index)))
    return float(offset) + float(frames[index].get("frame", index)) / float(fps)


def _restart_label(pos):
    raw = str(pos.get("restart_type") or pos.get("restart") or pos.get("inbound_type") or "").lower()
    if raw in {"blob", "baseline", "baseline_out_of_bounds", "baseline_inbound"}:
        return "blob"
    if raw in {"slob", "sideline", "sideline_out_of_bounds", "sideline_inbound"}:
        return "slob"
    return None


def detect_set_piece(pos, fps, offset):
    """Detect baseline/sideline out-of-bounds starts.

    Explicit PBP restart labels are trusted at high confidence. Tracking-only inference
    requires a front-court boundary start and is deliberately kept near the review gate.
    """
    frames = pos.get("frames", [])
    if len(frames) < 2:
        return None
    offense = pos.get("offense")
    direction = pos.get("attack_direction", 1)
    explicit = _restart_label(pos)

    first_i = None
    first_handler = None
    for i, frame in enumerate(frames[: min(len(frames), 12)]):
        h = _handler(frame, offense)
        if h:
            first_i, first_handler = i, h
            break
    if first_handler is None:
        return None

    x = _attack_x(first_handler.get("x", 0), direction)
    y = float(first_handler.get("y", 25))
    offense_rows = _players(frames[first_i], offense)
    frontcourt = sum(1 for p in offense_rows if _attack_x(p.get("x", 0), direction) >= 47)

    action = explicit
    evidence = {"restart_source": "explicit" if explicit else "tracking_inference", "start_x": round(x, 2), "start_y": round(y, 2), "frontcourt_attackers": frontcourt}
    confidence = 0.92 if explicit else 0.0

    if action is None and frontcourt >= 4:
        # Extreme boundary starts can pass the auto gate; softer boundary starts stay in review.
        if x >= 91 and 4 <= y <= 46:
            action, confidence = "blob", 0.69
        elif x >= 88 and 4 <= y <= 46:
            action, confidence = "blob", 0.57
        elif x >= 52 and (y <= 1.8 or y >= 48.2):
            action, confidence = "slob", 0.69
        elif x >= 52 and (y <= 3.8 or y >= 46.2):
            action, confidence = "slob", 0.57

    if action is None:
        return None

    end_i = min(len(frames) - 1, first_i + max(5, int(round(float(fps) * 5))))
    return {
        "id": f"ai_{action}_{pos.get('id', first_i)}",
        "type": "tactical",
        "tactic": action,
        "action": action,
        "offense": offense,
        "offenseTeam": offense,
        "defenseTeam": _defense_team(pos),
        "videoStart": round(_t(pos, max(0, first_i - 1), fps, offset), 3),
        "videoTime": round(_t(pos, first_i, fps, offset), 3),
        "videoEnd": round(_t(pos, end_i, fps, offset), 3),
        "points": int((pos.get("outcome") or {}).get("points", 0) or 0),
        "tags": [action, "set_play", evidence["restart_source"]],
        "confidence": {"action": round(confidence, 3)},
        "verification": "ai",
        "model": "courtiq-setplay-heuristic-v234",
        "evidence": evidence,
    }


def _nearest_distance(player, others):
    if not others:
        return 99.0
    return min(math.hypot(float(player["x"]) - float(o["x"]), float(player["y"]) - float(o["y"])) for o in others)


def _zone_shape(frame, offense, direction=1):
    defenders = [dict(p, ax=_attack_x(p.get("x", 0), direction)) for p in frame.get("players", []) if p.get("team") is not None and p.get("team") != offense]
    attackers = [dict(p, ax=_attack_x(p.get("x", 0), direction)) for p in frame.get("players", []) if p.get("team") == offense]
    if len(defenders) < 5 or len(attackers) < 4:
        return None
    defenders = sorted(defenders, key=lambda p: p["ax"], reverse=False)[:5]
    if sum(1 for p in defenders if p["ax"] >= 48) < 5:
        return None
    if max(float(p.get("y", 25)) for p in defenders) - min(float(p.get("y", 25)) for p in defenders) < 18:
        return None

    top = sum(1 for p in defenders if p["ax"] < 74)
    middle = sum(1 for p in defenders if 74 <= p["ax"] < 86)
    low = sum(1 for p in defenders if p["ax"] >= 86)
    perimeter = sum(1 for p in defenders if p["ax"] < 80)
    interior = 5 - perimeter

    shape = None
    if top == 1 and middle == 3 and low == 1:
        shape = "zone_1_3_1"
    elif top == 2 and middle == 1 and low == 2:
        shape = "zone_2_1_2"
    elif perimeter == 2 and interior == 3:
        shape = "zone_2_3"
    elif perimeter == 3 and interior == 2:
        shape = "zone_3_2"
    if not shape:
        return None

    close = sum(1 for d in defenders if _nearest_distance(d, attackers) <= 3.5) / 5.0
    return {"shape": shape, "man_close_fraction": round(close, 3)}


def detect_zone(pos, fps, offset):
    frames = pos.get("frames", [])
    if len(frames) < 8:
        return None
    offense = pos.get("offense")
    direction = pos.get("attack_direction", 1)
    # Sample the settled half-court portion rather than transition frames.
    start = min(len(frames) - 1, max(0, int(len(frames) * 0.18)))
    stop = max(start + 1, int(len(frames) * 0.82))
    sample_idx = list(range(start, min(len(frames), stop), max(1, (stop - start) // 24 or 1)))
    observations = []
    for i in sample_idx:
        obs = _zone_shape(frames[i], offense, direction)
        if obs:
            observations.append((i, obs))
    if len(observations) < 5:
        return None

    counts = Counter(obs["shape"] for _, obs in observations)
    shape, shape_hits = counts.most_common(1)[0]
    ratio = shape_hits / max(1, len(sample_idx))
    if ratio < 0.48:
        return None
    matched = [(i, obs) for i, obs in observations if obs["shape"] == shape]
    close = sum(obs["man_close_fraction"] for _, obs in matched) / max(1, len(matched))
    confidence = clamp(0.43 + 0.48 * ratio + 0.12 * (1.0 - close))
    first_i, last_i = matched[0][0], matched[-1][0]
    return {
        "id": f"ai_zone_{pos.get('id', first_i)}",
        "type": "tactical",
        "tactic": "zone_defense",
        "action": "zone_defense",
        "coverage": shape,
        "defense": {"coverage": shape},
        "offense": offense,
        "offenseTeam": offense,
        "defenseTeam": _defense_team(pos),
        "videoStart": round(_t(pos, first_i, fps, offset), 3),
        "videoTime": round(_t(pos, first_i, fps, offset), 3),
        "videoEnd": round(_t(pos, last_i, fps, offset), 3),
        "points": int((pos.get("outcome") or {}).get("points", 0) or 0),
        "tags": ["zone_defense", shape],
        "confidence": {"action": round(confidence, 3), "coverage": round(confidence, 3)},
        "verification": "ai",
        "model": "courtiq-zone-shape-v234",
        "evidence": {"shape_ratio": round(ratio, 3), "matched_frames": shape_hits, "sampled_frames": len(sample_idx), "man_close_fraction": round(close, 3)},
    }


def detect(payload):
    fps = float(payload.get("fps", 25) or 25)
    offset = float(payload.get("video_offset", 0) or 0)
    events = []

    # Existing PnR detector remains the source of coverage labels such as Drop, Switch,
    # ICE, Hedge/Show, Trap and Under. Multi-concept detection is additive.
    pnr = detect_pnr(payload)
    events.extend(pnr.get("events", []))

    for pos in payload.get("possessions", []):
        set_piece = detect_set_piece(pos, fps, offset)
        if set_piece:
            events.append(set_piece)
        zone = detect_zone(pos, fps, offset)
        if zone:
            events.append(zone)

    events.sort(key=lambda e: (float(e.get("videoStart", 0)), str(e.get("action", ""))))
    return {"schema": "courtiq-tactical-events-v2", "model": "courtiq-tactical-suite-v234", "events": events}
