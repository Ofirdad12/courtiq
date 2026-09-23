from ai.quality_gate import gate

def event(conf):
    return {"action":"pick_and_roll","coverage":"switch","videoStart":1,"videoTime":2,"videoEnd":3,"confidence":{"action":conf,"coverage":conf},"verification":"ai"}

def test_quality_gate_routes_by_confidence():
    out=gate([event(.9),event(.55),event(.2)])
    assert out["counts"]=={"accepted":1,"review":1,"rejected":1}
    assert out["review"][0]["verification"]=="needs_review"

def test_quality_gate_rejects_invalid_timestamps():
    e=event(.9); e["videoEnd"]=0
    assert gate([e])["counts"]["rejected"]==1
