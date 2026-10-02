const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {stripTypeScriptTypes} = require('node:module');
const source = fs.readFileSync('supabase/functions/import-ibba-game/index.ts','utf8');
const parser = source.slice(source.indexOf('function elNum('),source.indexOf('function calc('));
const context = vm.createContext({clean:s=>s.replace(/\s+/g,' ').trim(),r1:n=>Math.round(n*10)/10});
vm.runInContext(stripTypeScriptTypes(parser),context);
const stats={timePlayed:1058,points:8,fieldGoalsMade2:1,fieldGoalsAttempted2:3,fieldGoalsMade3:1,fieldGoalsAttempted3:2,freeThrowsMade:3,freeThrowsAttempted:4,startFive:true};
const fixture={total:stats,players:[{player:{person:{code:'006154',name:'BERUCKA, ARNAS'},dorsal:'21'},stats}]};
const parsed=context.euroleagueSide(fixture);
assert.equal(parsed.players[0].starter,true);
assert.equal(parsed.players[0].minutes,17.6);
assert.equal(parsed.total.points,8);
assert.equal(parsed.players[0].id,'006154');
assert.equal(context.euroleagueSide({...fixture,players:[{...fixture.players[0],stats:{...stats,startFive:false,isStarter:true}}]}).players[0].starter,false);
assert.match(source,/headers:isEl\?elHeaders/);
assert.match(source,/const elHeaders=\{"Accept":"application\/json"\}/);
assert.match(source,/games\/\$\{elGameCode\}`,\{headers:elHeaders\}/);
if(process.argv[2]){
  const game=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  for(const side of ['local','road']){
    const result=context.euroleagueSide(game[side]);
    assert.equal(result.players.reduce((n,p)=>n+p.points,0),result.total.points);
    assert.equal(result.total.two_pm*2+result.total.three_pm*3+result.total.ftm,result.total.points);
    assert.equal(result.players.filter(p=>p.starter).length,5);
    console.log(side,result.total.points,'points;',result.players.length,'players; 5 starters');
  }
}
console.log('EuroLeague import: JSON negotiation, stats and startFive passed.');
