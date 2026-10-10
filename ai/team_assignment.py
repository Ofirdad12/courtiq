"""Confidence-gated team assignment from upstream appearance samples."""
from __future__ import annotations
import math

def _distance(a,b): return math.sqrt(sum((float(x)-float(y))**2 for x,y in zip(a,b)))

def assign(payload):
    teams=payload.get('teams',{})
    if len(teams)!=2: raise ValueError('exactly two team appearance centroids are required')
    names=list(teams); centroids={k:teams[k]['centroid'] for k in names}
    threshold=float(payload.get('max_color_distance',90)); margin=float(payload.get('min_assignment_margin',12)); votes={}
    for frame in payload.get('frames',[]):
        for p in frame.get('players',[]):
            sample=p.get('appearance')
            if not sample: continue
            ds=sorted((_distance(sample,centroids[name]),name) for name in names)
            if ds[0][0]<=threshold and ds[1][0]-ds[0][0]>=margin:votes.setdefault(str(p['track_id']),[]).append(ds[0][1])
    track_team={}
    for tid,items in votes.items():
        counts={name:items.count(name) for name in names}; winner=max(counts,key=counts.get); confidence=counts[winner]/len(items)
        if confidence>=float(payload.get('min_track_confidence',.7)):track_team[tid]={'team':winner,'confidence':round(confidence,3)}
    frames=[]
    for frame in payload.get('frames',[]):
        copied={**frame,'players':[]}
        for p in frame.get('players',[]):
            q=dict(p); match=track_team.get(str(p.get('track_id'))); q['team']=match['team'] if match else p.get('team'); q['team_confidence']=match['confidence'] if match else 0; copied['players'].append(q)
        frames.append(copied)
    return {**payload,'frames':frames,'team_assignments':track_team}
