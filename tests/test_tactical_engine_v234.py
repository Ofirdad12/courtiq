from ai.quality_gate import gate
from ai.tactical_engine import detect_handoffs, detect_restart_phase, detect_defense
from ai.tactical_taxonomy import capabilities


def _p(tid, team, x, y, ball=False):
    return {'track_id': tid, 'team': team, 'x': x, 'y': y, 'has_ball': ball}


def test_taxonomy_exposes_broad_basketball_language():
    caps=capabilities()
    assert caps['total_labels'] >= 50
    assert 'blob' in caps['detectable']
    assert 'zone_2_3' in caps['detectable']
    assert 'spain_pnr' in caps['reviewable']
    assert 'scram_switch' in caps['reviewable']


def test_blob_detection_from_boundary_restart_geometry():
    frames=[]
    for i in range(12):
        frames.append({'frame':i,'players':[
            _p('H','A',2+i*.1,25,True),
            _p('A2','A',62,8),_p('A3','A',66,18),_p('A4','A',70,32),_p('A5','A',75,42),
            _p('D1','B',64,9),_p('D2','B',67,19),_p('D3','B',72,30),_p('D4','B',78,40),_p('D5','B',80,25),
        ]})
    pos={'id':'p1','offense':'A','frames':frames}
    events=detect_restart_phase(pos,10,0)
    assert any(e['action']=='blob' for e in events)


def test_handoff_detects_close_ball_exchange():
    frames=[]
    for i in range(10):
        old=i<5
        frames.append({'frame':i,'players':[
            _p('A1','A',40+i*.3,24,old),
            _p('A2','A',42+i*.25,25,not old),
            _p('A3','A',55,8),_p('A4','A',58,38),_p('A5','A',70,25),
            _p('D1','B',41+i*.2,23),_p('D2','B',48,27),_p('D3','B',60,8),_p('D4','B',62,38),_p('D5','B',74,25),
        ]})
    pos={'id':'p2','offense':'A','frames':frames}
    events=detect_handoffs(pos,10,0)
    assert events
    assert events[0]['action']=='handoff'
    assert events[0]['confidence']['action'] >= .45


def test_zone_23_detection_uses_persistent_defensive_layers():
    frames=[]
    for i in range(15):
        frames.append({'frame':i,'players':[
            _p('H','A',50+i*.3,25,True),
            _p('A2','A',60,5+i*.3),_p('A3','A',64,15+i*.2),_p('A4','A',68,35-i*.2),_p('A5','A',74,45-i*.3),
            _p('D1','B',65,16),_p('D2','B',66,34),
            _p('D3','B',82,8),_p('D4','B',83,25),_p('D5','B',84,42),
        ]})
    pos={'id':'p3','offense':'A','frames':frames}
    events=detect_defense(pos,10,0)
    zone=[e for e in events if e.get('coverage')=='zone_2_3']
    assert zone
    assert zone[0]['confidence']['coverage'] >= .60


def test_non_coverage_actions_do_not_need_fake_coverage_confidence():
    e={'action':'blob','videoStart':1,'videoTime':2,'videoEnd':3,'confidence':{'action':.72}}
    out=gate([e])
    assert out['counts']['accepted']==1
