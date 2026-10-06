const assert=require('assert');
const live=require('../live-bench.js');

const G={
 home:'Home',away:'Away',hs:30,as:26,
 factors:[['eFG%',55,48],['TOV%',12,19],['ORB%',31,25],['FTr',22,18]],
 playByPlay:[
  {period:2,clock:'08:00',score:'20-18',side:'home',type:'2pm'},
  {period:2,clock:'06:20',score:'24-20',side:'home',type:'2pm'},
  {period:2,clock:'04:40',score:'26-24',side:'away',type:'2pm'},
  {period:2,clock:'03:00',score:'30-26',side:'home',type:'2pm'}
 ]
};
assert.equal(live.clockSeconds('03:21'),201);
assert.deepEqual(live.score('30-26'),[30,26]);
assert.equal(live.latestEvent(G).clock,'03:00');
assert.equal(live.scoreOrientation(G),0);
const run=live.recentRun(G,5);
assert.equal(run.home,10);
assert.equal(run.away,8);
const a={hs:20,as:18,eventCount:10,period:2,clock:'08:00',factors:{'eFG%':50,'TOV%':15,'ORB%':25,FTr:20},homeLineup:null,awayLineup:null};
const b={hs:30,as:26,eventCount:14,period:2,clock:'03:00',factors:{'eFG%':55,'TOV%':12,'ORB%':31,FTr:22},homeLineup:null,awayLineup:null};
const changes=live.compareSnapshots(a,b);
assert(changes.some(x=>x.kind==='score'));
assert(changes.some(x=>x.kind==='events'));
assert(changes.some(x=>x.factor==='eFG%'));

const pbp=require('../pbp-explorer.js');
global.CourtIQPlayByPlay=pbp;
const livePbp=live.renderLivePbp(G);
assert.match(livePbp,/LIVE PBP · AUTO-SYNC/);
assert.match(livePbp,/Play-by-Play Command Center/);
assert.match(livePbp,/4 events · recalculated every valid refresh/);
assert.match(livePbp,/SCORING RUNS/);
const emptyPbp=live.renderLivePbp({home:'Home',away:'Away',playByPlay:[]});
assert.match(emptyPbp,/No live PBP events yet/);
assert.equal(live.mountLivePbp(G,null),null);
delete global.CourtIQPlayByPlay;
console.log('live bench tests passed');
