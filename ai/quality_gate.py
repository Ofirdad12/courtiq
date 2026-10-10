"""Quality gate for CourtIQ tactical AI output.

v234 supports far more than PnR. Coverage/scheme confidence is required only
when an event actually carries a coverage/scheme label. Other actions are gated
on action confidence alone. Low-confidence concepts remain reviewable.
"""
from __future__ import annotations


def _secondary(event, confidence):
    key=str(event.get('confidence_key') or '')
    if key and key!='action':
        return key,float(confidence.get(key,0) or 0)
    if event.get('coverage') is not None:
        return 'coverage',float(confidence.get('coverage',0) or 0)
    if event.get('scheme') is not None:
        return 'scheme',float(confidence.get('scheme',0) or 0)
    return 'action',float(confidence.get('action',0) or 0)


def gate(events,min_action_confidence=.65,min_secondary_confidence=.60):
    accepted=[]; review=[]; rejected=[]
    for e in events:
        c=e.get('confidence') or {}
        action=float(c.get('action',0) or 0)
        secondary_key,secondary=_secondary(e,c)
        start=float(e.get('videoStart',-1)); mid=float(e.get('videoTime',-1)); end=float(e.get('videoEnd',-1))
        valid_time=start>=0 and start<=mid<=end
        action_type=str(e.get('action') or '')
        if not valid_time or not action_type:
            rejected.append({**e,'quality_reason':'invalid_contract'}); continue
        if action>=min_action_confidence and secondary>=min_secondary_confidence:
            accepted.append(e)
        elif action>=.45:
            reason=f'low_{secondary_key}_confidence' if secondary_key!='action' else 'low_action_confidence'
            review.append({**e,'verification':'needs_review','quality_reason':reason})
        else:
            rejected.append({**e,'quality_reason':'confidence_below_floor'})
    return {'accepted':accepted,'review':review,'rejected':rejected,'counts':{'accepted':len(accepted),'review':len(review),'rejected':len(rejected)}}
