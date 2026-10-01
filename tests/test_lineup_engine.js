const assert=require("node:assert/strict");
const {derive,kind}=require("../lineup-engine");
const court=require("../court-analytics");
const H=["A","B","C","D","E"],V=["V","W","X","Y","Z"];
const roster=(names)=>names.map((name,i)=>({name,starter:i<5}));
const event=(period,clock,side,player,type,score)=>({period,clock,side,player,type,score});
function fullGame(){
  const es=[];
  for(let p=1;p<=4;p++){
    const b=(p-1)*2;
    es.push(event(p,"10:00","home","A","jumpball",b+"-"+b));
    if(p===1){
      es.push(event(p,"09:00","home","A","fgm","2-0"));
      es.push(event(p,"08:00","home","E","sub-out","2-0"),event(p,"08:00","home","F","sub-in","2-0"));
      es.push(event(p,"07:00","away","V","fgm","2-2"));
      es.push(event(p,"06:00","home","F","sub-out","2-2"),event(p,"06:00","home","E","sub-in","2-2"));
    }else{
      es.push(event(p,"09:00","home","A","fgm",(b+2)+"-"+b));
      es.push(event(p,"08:00","away","V","fgm",(b+2)+"-"+(b+2)));
    }
    for(const side of ["home","away"])for(const name of side==="home"?H:V)es.push(event(p,"01:00",side,name,"ast",(b+2)+"-"+(b+2)));
    es.push(event(p,"00:00","","","end",(b+2)+"-"+(b+2)));
  }
  return {home:"Home",away:"Away",hs:8,as:8,players:{home:roster([...H,"F"]),away:roster(V)},playByPlay:es};
}
let g=fullGame(),r=derive(g);
assert.equal(r.quality.status,"COMPLETE");
assert.equal(r.quality.coverageSeconds.home,2400);assert.equal(r.quality.coverageSeconds.away,2400);
assert.equal(r.quality.totals.home.pf,8);assert.equal(r.quality.totals.home.pa,8);
const first=r.lineupStints.find(s=>s.period===1&&s.side==="home");assert.equal(first.seconds,120);assert.equal(first.pointsFor,2);
const bench=r.lineupStints.find(s=>s.players.includes("F"));assert.equal(bench.seconds,120);assert.equal(bench.pointsAgainst,2);
assert.equal(r.lineupStints.filter(s=>s.period===2&&s.side==="home")[0].players.includes("F"),false);
assert.equal(r.lineupStints[0].possessions,null);
assert.ok(court.validate(r).lineupStints.length>0);
g=fullGame();g.playByPlay.forEach(e=>{e.score=e.score.split("-").reverse().join("-");});
assert.equal(derive(g).quality.scoreOrder,"away-home");
// Stale same-clock scoreboard on a miss must not assign a future FT to the outgoing five.
g=fullGame();g.hs=9;
const i=g.playByPlay.findIndex(e=>e.period===1&&e.clock==="08:00");
g.playByPlay.splice(i,0,event(1,"08:00","home","A","fga","3-0"));
g.playByPlay.splice(i+3,0,event(1,"08:00","home","A","ftm","3-0"));
r=derive(g);assert.equal(r.quality.scoringMode,"RECONCILED_SCORING_EVENTS");assert.equal(r.lineupStints.find(s=>s.players.includes("F")).pointsFor,1);
// Simultaneous double substitutions, independent of in/out ordering.
g=fullGame();const x=g.playByPlay.findIndex(e=>e.type==="sub-out");
g.playByPlay.splice(x,2,event(1,"08:00","home","F","sub-in","2-0"),event(1,"08:00","home","G","sub-in","2-0"),event(1,"08:00","home","E","sub-out","2-0"),event(1,"08:00","home","D","sub-out","2-0"));
g.players.home.push({name:"G",starter:false});r=derive(g);assert.ok(r.lineupStints.some(s=>s.players.includes("F")&&s.players.includes("G")));
// An unpaired substitution excludes later intervals, rather than guessing a fifth player.
g=fullGame();g.playByPlay=g.playByPlay.filter(e=>!(e.period===1&&e.type==="sub-in"));
r=derive(g);assert.equal(r.quality.status,"PARTIAL");assert.ok(r.quality.coverageSeconds.home<2400);
// Invalid clock on a substitution makes reconstruction unsafe.
g=fullGame();g.playByPlay.find(e=>e.type==="sub-in").clock="n/a";
assert.equal(derive(g).quality.status,"INVALID_TIMELINE");
// Overtime uses five minutes, even with no source score orientation at a tied final.
g=fullGame();g.playByPlay.push(event(5,"05:00","home","A","jumpball","8-8"));
for(const side of ["home","away"])for(const p of side==="home"?H:V)g.playByPlay.push(event(5,"01:00",side,p,"ast","8-8"));
g.playByPlay.push(event(5,"00:00","","","end","8-8"));
assert.equal(derive(g).quality.coverageSeconds.home,2700);
// A partial live feed never projects the remaining quarter minutes.
g=fullGame();g.status="live";g.playByPlay=g.playByPlay.filter(e=>e.period===1&&e.clock!=="00:00");g.hs=2;g.as=2;
assert.equal(derive(g).quality.coverageSeconds.home,540);
assert.equal(kind({type:"sub-in",description:"שחקן נכנס למשחק"}),"in");
assert.equal(kind({description:"שחקן יוצא מהמגרש"}),"out");
assert.equal(derive({}).quality.status,"NO_PBP");
// Existing stored games get automatic data at read/render time.
g=fullGame();assert.ok(court.dataset(g).data.lineupStints.length>0);
console.log("PBP lineups: time, substitutions, quarter resets, scores, stale snapshots, gaps, OT and live feeds passed.");
