"""Quality gate for CourtIQ tactical AI output."""
from __future__ import annotations

def gate(events, min_action_confidence=.65, min_coverage_confidence=.6):
    accepted=[]; review=[]; rejected=[]
    for e in events:
        c=e.get("confidence") or {}
        action=float(c.get("action",0) or 0); coverage=float(c.get("coverage",0) or 0)
        valid_time=float(e.get("videoStart",-1))>=0 and float(e.get("videoStart",-1))<=float(e.get("videoTime",-1))<=float(e.get("videoEnd",-1))
        if not valid_time or not e.get("action"):
            rejected.append({**e,"quality_reason":"invalid_contract"}); continue
        if action>=min_action_confidence and coverage>=min_coverage_confidence:
            accepted.append(e)
        elif action>=.45:
            review.append({**e,"verification":"needs_review","quality_reason":"low_confidence"})
        else:
            rejected.append({**e,"quality_reason":"confidence_below_floor"})
    return {"accepted":accepted,"review":review,"rejected":rejected,
            "counts":{"accepted":len(accepted),"review":len(review),"rejected":len(rejected)}}
