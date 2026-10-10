"""CourtIQ tracking-to-tactics pipeline v234.

Raw pixel detection/tracking remains an adapter boundary. Once stable tracks,
teams and a court homography exist, the pipeline segments possessions and emits
multi-layer basketball concepts with evidence/confidence.
"""
from __future__ import annotations
from ai.track_normalizer import normalize
from ai.team_assignment import assign
from ai.possession_segmenter import segment
from ai.tactical_engine import detect
from ai.tactical_taxonomy import capabilities
from ai.quality_gate import gate

LEGACY_PIPELINE='tracking-to-tactics-v1'
CURRENT_PIPELINE='tracking-to-tactics-v2'


def run(payload):
    prepared=assign(payload) if payload.get('teams') else payload
    normalized=normalize(prepared)
    normalized['video_offset']=float(payload.get('video_offset',0))
    possessions=segment(normalized,min_control_frames=int(payload.get('min_control_frames',3)))
    tactical=detect(possessions)
    gated=gate(
        tactical['events'],
        float(payload.get('min_action_confidence',.65)),
        float(payload.get('min_secondary_confidence',payload.get('min_coverage_confidence',.60)))
    )
    return {
        'schema':'courtiq-video-intelligence-v234',
        'pipeline':CURRENT_PIPELINE,
        'compatible_with':[LEGACY_PIPELINE],
        'model':tactical['model'],
        'stats':{
            'frames':len(normalized['frames']),
            'team_assignments':len(prepared.get('team_assignments',{})),
            'possessions':len(possessions['possessions']),
            'tactical_events':len(tactical['events']),
            'labels':tactical.get('labels',{}),
        },
        'capabilities':capabilities(),
        'accepted':gated['accepted'],
        'review':gated['review'],
        'rejected':gated['rejected'],
        'counts':gated['counts']
    }
