from ai.quality_gate import gate
from ai.pnr_detector import detect
from ai.possession_segmenter import segment


def test_quality_gate_keeps_low_confidence_for_review():
    event={
        'action':'pick_and_roll','videoStart':1,'videoTime':2,'videoEnd':3,
        'confidence':{'action':.55,'coverage':.40},'verification':'ai'
    }
    out=gate([event])
    assert out['counts']=={'accepted':0,'review':1,'rejected':0}
    assert out['review'][0]['verification']=='needs_review'


def test_possession_segmenter_waits_for_stable_control():
    frames=[]
    for i,team in enumerate(['A','A','A','A','B','B','B','B']):
        frames.append({'frame':i,'players':[{'track_id':team,'team':team,'has_ball':True}]})
    out=segment({'fps':25,'frames':frames},min_control_frames=3)
    assert len(out['possessions'])==2
    assert out['possessions'][0]['offense']=='A'
    assert out['possessions'][1]['offense']=='B'


def test_pnr_detector_requires_plausible_screen():
    frames=[]
    for i in range(9):
        frames.append({'frame':i,'players':[
            {'track_id':'H','team':'A','has_ball':True,'x':30+i*.3,'y':25},
            {'track_id':'S','team':'A','has_ball':False,'x':34,'y':25},
            {'track_id':'D1','team':'B','has_ball':False,'x':34.5,'y':25.5},
            {'track_id':'D2','team':'B','has_ball':False,'x':29+i*.2,'y':25.5},
        ]})
    out=detect({'fps':25,'possessions':[{'id':'p1','offense':'A','frames':frames}]})
    assert len(out['events'])==1
    assert out['events'][0]['action']=='pick_and_roll'
    assert out['events'][0]['confidence']['action']>=.45

    no_screen=[]
    for i in range(9):
        no_screen.append({'frame':i,'players':[
            {'track_id':'H','team':'A','has_ball':True,'x':20+i*.3,'y':10},
            {'track_id':'S','team':'A','has_ball':False,'x':45,'y':40},
            {'track_id':'D1','team':'B','has_ball':False,'x':25,'y':35},
            {'track_id':'D2','team':'B','has_ball':False,'x':10,'y':45},
        ]})
    assert detect({'fps':25,'possessions':[{'id':'p2','offense':'A','frames':no_screen}]})['events']==[]
