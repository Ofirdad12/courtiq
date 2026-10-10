"""Map CourtIQ v233 pipeline output to tactical_events rows.
This module is intentionally transport-agnostic so a GPU worker can persist through Supabase service-role APIs without changing basketball logic.
"""
from __future__ import annotations

def event_row(event,ctx,verification=None):
    return {
        'game_id':int(ctx['game_id']),
        'video_id':int(ctx['video_id']),
        'club_id':int(ctx['club_id']),
        'job_id':ctx.get('job_id'),
        'external_event_id':event.get('id'),
        'period':event.get('period'),
        'game_clock':event.get('gameClock'),
        'video_start':float(event['videoStart']),
        'video_time':float(event['videoTime']),
        'video_end':float(event['videoEnd']),
        'offense_team':event.get('offenseTeam') or event.get('offense'),
        'defense_team':event.get('defenseTeam') or event.get('defense_team'),
        'action_type':event.get('action') or event.get('tactic') or 'unknown',
        'coverage_type':event.get('coverage') or (event.get('defense') or {}).get('coverage'),
        'ball_handler_ref':event.get('ballHandler'),
        'screener_ref':event.get('screener'),
        'outcome_type':(event.get('outcome') or {}).get('type'),
        'points':int(event.get('points',0) or 0),
        'tags':event.get('tags') or [],
        'confidence':event.get('confidence') or {},
        'verification':verification or event.get('verification') or 'ai',
        'model_version':event.get('model'),
        'evidence':event.get('evidence') or {},
    }

def rows_from_pipeline(result,ctx):
    accepted=[event_row(e,ctx,'ai') for e in result.get('accepted',[])]
    review=[event_row(e,ctx,'needs_review') for e in result.get('review',[])]
    return {'accepted':accepted,'review':review,'all':accepted+review}

def job_result(result):
    counts=result.get('counts') or {}
    return {
        'status':'review_ready' if counts.get('review',0) else 'completed',
        'stage':'review',
        'progress':100,
        'accepted_events':int(counts.get('accepted',0) or 0),
        'review_required':int(counts.get('review',0) or 0),
        'result_summary':{
            'pipeline':result.get('pipeline'),
            'model':result.get('model'),
            'stats':result.get('stats') or {},
            'counts':counts,
        },
        'error':None,
    }
