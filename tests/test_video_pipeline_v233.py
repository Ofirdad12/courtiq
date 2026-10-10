from ai.quality_gate import gate
from ai.pnr_detector import detect
from ai.possession_segmenter import segment
from ai.job_contract import rows_from_pipeline, job_result


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


def test_job_contract_preserves_review_state():
    event={'id':'e1','action':'pick_and_roll','coverage':'drop','videoStart':1,'videoTime':2,'videoEnd':3,'points':0,'confidence':{'action':.55,'coverage':.4},'verification':'needs_review','model':'m1','evidence':{}}
    result={'pipeline':'tracking-to-tactics-v1','model':'m1','stats':{'frames':100},'accepted':[],'review':[event],'counts':{'accepted':0,'review':1,'rejected':0}}
    rows=rows_from_pipeline(result,{'club_id':1,'game_id':2,'video_id':3,'job_id':'00000000-0000-0000-0000-000000000001'})
    assert rows['review'][0]['verification']=='needs_review'
    assert rows['review'][0]['coverage_type']=='drop'
    job=job_result(result)
    assert job['status']=='review_ready'
    assert job['review_required']==1
