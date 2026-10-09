const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('coach-brief-v214.js','utf8');
const context={window:{},console,URL};
vm.runInNewContext(source,context,{filename:'coach-brief-v214.js'});
const C=context.window.CourtIQCoachBriefCore;
assert(C,'CourtIQCoachBriefCore should be exposed');

assert.strictEqual(C.metricConfidence({n:5},5).level,'HIGH');
assert.strictEqual(C.metricConfidence({n:2},3).level,'MEDIUM');
assert.strictEqual(C.metricConfidence({n:1},5).level,'LOW');
assert.strictEqual(C.overallConfidence([{n:5},{n:4}],5).level,'HIGH');
assert.strictEqual(C.overallConfidence([{n:3},{n:2}],3).level,'MEDIUM');

const rows=[
  {opp:{valid:true,two_pm:20,two_pa:40,three_pm:10,three_pa:25,ftm:10,fta:12}},
  {opp:{valid:true,two_pm:25,two_pa:45,three_pm:9,three_pa:25,ftm:8,fta:10}},
  {opp:{valid:false,two_pm:99,two_pa:99,three_pm:99,three_pa:99,ftm:99,fta:99}}
];
const opp=C.opponentOutcome(rows);
assert.strictEqual(opp.n,2,'Only valid opponent rows should be pooled');
assert.strictEqual(opp.total.two_pm,45);
assert.strictEqual(opp.total.three_pa,50);
assert(Math.abs(opp.three-38)<0.001,'Opponent 3P% must use pooled makes/attempts');

const team={
  m:{
    threeShare:{value:42,n:5},
    tovRate:{value:17,n:5},
    orb:{value:33,n:5},
    tov:{value:14,n:5},
    oreb:{value:12,n:5}
  },
  total:{three_pa:120},
  fga:285
};
const decisions=C.decisionCandidates(team,{n:5,two:52,three:39,efg:56,threeShare:36},Array.from({length:5},()=>({})));
assert(decisions.length>=3,'A complete evidence set should generate coach decision candidates');
assert(decisions.every(x=>x.confidence&&x.why),'Every coach decision must carry confidence and evidence');
assert(decisions.some(x=>/שלשות/.test(x.title+x.action)),'Shot-profile decision should be present');
assert(decisions.some(x=>/ריבאונד/.test(x.title+x.action)),'Rebounding decision should be present');

const rendered=decisions.map(x=>x.title+' '+x.action+' '+x.why).join(' ');
assert(!/pick.?and.?roll|pnr|יד שמאל|יד ימין|switch|drop/i.test(rendered),'Box-score decisions must not invent unsupported tactical observations');

const checks=C.liveChecks(team,Array.from({length:5},()=>({})));
assert.strictEqual(checks.length,3);
assert.deepStrictEqual(Array.from(checks,x=>x.label),['3PA share','TOV%','ORB%']);

console.log('coach brief v214 tests passed');
