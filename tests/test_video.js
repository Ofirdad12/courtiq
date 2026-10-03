const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const storage=new Map();const context={URL,console,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{querySelector:()=>null,querySelectorAll:()=>[],documentElement:{}},MutationObserver:class{observe(){}},window:{}};
vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../video.js'),'utf8'),context);const api=context.window.CourtIQVideo;
const game={id:'001',home:'H',away:'A',date:'2026-10-03',comp:'League',sourceUrl:'https://example.com/game/1/'};
api.setGame(game);let key='courtiq_video_room_v2:'+api.identity(game);
storage.set('courtiq_video_room_v1',JSON.stringify({videoId:'legacy',anchor:{period:1,clock:'10:00',videoSeconds:5}}));
assert.equal(api.videoForPbp(1,'09:00'),null,'legacy video is not attached automatically');
storage.set(key,JSON.stringify({videoId:'gameOne',anchor:{period:1,clock:'10:00',videoSeconds:100}}));
assert.equal(api.videoForPbp(1,'09:00').seconds,160);
assert.equal(api.videoForPbp(2,'09:00'),null,'quarter-break time cannot be inferred');
assert.equal(api.videoForPbp(1,'09:99'),null);assert.equal(api.videoForPbp(1,'11:00'),null);assert.equal(api.videoForPbp(0,'10:00'),null);
assert.equal(api.identity({...game,sourceUrl:game.sourceUrl+'?utm_source=chatgpt'}),api.identity(game));
api.setGame({...game,sourceUrl:'https://example.com/game/2/'});assert.equal(api.videoForPbp(1,'09:00'),null,'other game cannot inherit video');
api.setGame(game);assert.equal(api.videoForPbp(1,'09:00').seconds,160,'original game retains video');
const events=[{period:1,clock:'09:00',description:'2pt made',player:'H1',team:'H'}];
assert.equal(api.importPbp([...events,...events]).added,1);assert.equal(api.importPbp(events).added,0);
assert.equal(api.state().events[0].kind,'evidence','shot event does not establish a full possession');
const state=api.state();state.anchors={5:{period:5,clock:'05:00',videoSeconds:1000},6:{period:6,clock:'05:00',videoSeconds:1400}};storage.set(key,JSON.stringify(state));
assert.equal(api.videoForPbp(5,'04:00').seconds,1060);assert.equal(api.videoForPbp(6,'04:00').seconds,1460);assert.equal(api.videoForPbp(5,'06:00'),null);
storage.set(key,'invalid');assert.equal(api.videoForPbp(1,'09:00'),null);
assert.ok(storage.has('courtiq_video_room_v1'),'unassigned legacy data preserved');
console.log('Video: per-game isolation, legacy preservation, period-specific sync, clock validation, overtime, deduplication and evidence-only PBP passed.');
const evidenceState={videoId:'abcdefghijk',anchors:{1:{period:1,clock:'10:00',videoSeconds:100}},events:[
{source:'official-pbp',kind:'evidence',period:1,gameClock:'09:00',tag:'Shot',offense:'H',players:'P1',note:'Made shot'},
{source:'official-pbp',kind:'evidence',period:2,gameClock:'09:00',time:'01:00',tag:'Shot',offense:'A'},
{source:'analyst-video',kind:'possession',time:'00:00',tag:'Pick & Roll',offense:'H',coverage:'Drop',note:'Manual review'},
{source:'analyst-video',kind:'evidence',time:'wrong',tag:'Other'}]};
const evidence=api.evidenceRows(evidenceState);
assert.equal(evidence[0].videoSeconds,160);assert.equal(evidence[0].estimated,true);
assert.equal(evidence[1].clipUrl,null,'stale PBP timestamp cannot replace missing period anchor');
assert.equal(evidence[2].clipUrl,'https://youtu.be/abcdefghijk?t=0s','zero timestamp remains valid');
assert.equal(evidence[2].estimated,false);assert.equal(evidence[3].clipUrl,null);
assert.equal(api.filterEvidence(evidence,{offense:'H',source:'analyst-video',kind:'possession',search:'DROP'}).length,1);
assert.equal(api.filterEvidence(evidence,{search:'p1'}).length,1);assert.equal(api.filterEvidence(evidence,{tag:'Shot',offense:'A'}).length,1);
assert.equal(api.filterEvidence(evidence,{search:'absent'}).length,0);assert.equal(api.filterEvidence(evidence).length,4);
assert.equal(evidenceState.events[0].videoSeconds,undefined,'presentation does not mutate saved records');
console.log('Video evidence: combined filters, clip links, unknown sync, zero timestamps and immutable source records passed.');
