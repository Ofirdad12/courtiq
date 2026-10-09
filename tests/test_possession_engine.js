const assert=require('node:assert/strict');
const possession=require('../possession-engine');

const H=['H1','H2','H3','H4','H5'],A=['A1','A2','A3','A4','A5'];
const roster=names=>names.map((name,i)=>({name,starter:i<5}));
const e=(clock,side,player,type,score,extra={})=>({period:1,clock,side,player,type,score,...extra});

function clearGame(){
  return {
    id:'p1',home:'Home',away:'Away',hs:6,as:2,status:'live',
    players:{home:roster(H),away:roster(A)},
    playByPlay:[
      e('10:00','home','H1','jumpball','0-0'),
      e('09:40','home','H1','fgm','2-0'),
      e('09:20','away','A1','fga','2-0'),
      e('09:18','home','H2','dreb','2-0'),
      e('09:00','home','H3','fga','2-0'),
      e('08:58','home','H4','oreb','2-0'),
      e('08:40','home','H5','threepm','5-0'),
      e('08:20','away','A2','turnover','5-0'),
      e('08:00','home','H1','ftm','6-0'),
      e('08:00','home','H1','fta','6-0'),
      e('07:58','away','A3','dreb','6-0'),
      e('07:40','away','A4','fgm','6-2')
    ]
  };
}

let r=possession.derive(clearGame());
assert.equal(r.quality.scoringReliable,true);
assert.equal(r.quality.scoreMode,'RECONCILED_SCORING_EVENTS');
assert.equal(r.quality.possessions,6);
assert.equal(r.quality.certifiedPossessions,6);
assert.equal(r.quality.homePossessions,3);
assert.equal(r.quality.awayPossessions,3);
assert.equal(r.quality.homePoints,6);
assert.equal(r.quality.awayPoints,2);
assert.equal(r.rapmStints.length,1);
assert.equal(r.rapmStints[0].homePossessions,3);
assert.equal(r.rapmStints[0].awayPossessions,3);
assert.equal(r.rapmStints[0].homePoints,6);
assert.equal(r.rapmStints[0].awayPoints,2);
assert.deepEqual(r.rapmStints[0].homePlayers,[...H].sort());

// Offensive rebound keeps the same possession; the home 3PM is not a second possession.
const homeThree=r.possessions.find(p=>p.points===3);
assert.equal(homeThree.offensiveRebounds,1);
assert.equal(homeThree.attempts,2);

// A made + missed FT sequence followed by a defensive rebound is one possession worth one point.
const ft=r.possessions.find(p=>p.freeThrows===2);
assert.equal(ft.points,1);
assert.equal(ft.endReason,'defensive_rebound');

// If the source score cannot reconcile, possession estimates may exist but RAPM receives no certified stints.
let g=clearGame();g.hs=99;
r=possession.derive(g);
assert.equal(r.quality.scoringReliable,false);
assert.equal(r.rapmStints.length,0);
assert.equal(r.quality.status,'UNRECONCILED_SCORING');

// Without an established five-player lineup, possessions are excluded rather than assigned to guessed players.
g=clearGame();g.players.home=g.players.home.map(p=>({...p,starter:false}));
r=possession.derive(g);
assert.ok(r.quality.uncertifiedPossessions>0);
assert.equal(r.rapmStints.length,0);

assert.equal(possession.derive({}).quality.status,'NO_PBP');
console.log('Possession Engine: terminal events, OREB continuation, FT sequences, lineup certification and score guardrails passed.');
