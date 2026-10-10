"""CourtIQ tracking-to-tactics pipeline.
Raw video detection is an adapter boundary; this module starts once detector/tracker frames and a court homography exist.
"""
from __future__ import annotations
from ai.track_normalizer import normalize
from ai.team_assignment import assign
from ai.possession_segmenter import segment
from ai.pnr_detector import detect
from ai.quality_gate import gate

def run(payload):
    prepared=assign(payload) if payload.get('teams') else payload
    normalized=normalize(prepared)
    normalized['video_offset']=float(payload.get('video_offset',0))
    possessions=segment(normalized,min_control_frames=int(payload.get('min_control_frames',3)))
    tactical=detect(possessions)
    gated=gate(tactical['events'],float(payload.get('min_action_confidence',.65)),float(payload.get('min_coverage_confidence',.60)))
    return {'schema':'courtiq-video-intelligence-v233','pipeline':'tracking-to-tactics-v1','model':tactical['model'],'stats':{'frames':len(normalized['frames']),'team_assignments':len(prepared.get('team_assignments',{})),'possessions':len(possessions['possessions']),'tactical_events':len(tactical['events'])},'accepted':gated['accepted'],'review':gated['review'],'rejected':gated['rejected'],'counts':gated['counts']}
