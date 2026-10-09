const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('season-memory-v215.js','utf8');
const context={window:{},console};
vm.runInNewContext(source,context,{filename:'season-memory-v215.js'});
const M=context.window.CourtIQSeasonMemoryCore;
assert(M,'CourtIQSeasonMemoryCore should be exposed');

const games=Array.from({length:5},(_,i)=>({
  points_for:80+i,points_against:75+i,won:true,
  two_pm:20,two_pa:40,three_pm:10,three_pa:25,ftm:10,fta:12,
  ast:20,tov:10,oreb:10,dreb:25,opp_dreb:25,possessions_est:72
}));
const team=M.teamAggregate(games);
assert.strictEqual(team.games,5);
assert.strictEqual(team.wins,5);
assert.strictEqual(team.ppg,82);
assert(Math.abs(team.efg-53.8461538461)<0.001,'Team eFG must be pooled from makes/attempts');
assert(Math.abs(team.threeRate-38.4615384615)<0.001,'3PA rate must be pooled from attempts');
assert.strictEqual(team.confidence.level,'MEDIUM');

const playerRows=[
  {player_name:'A',game_date:'2026-10-09',minutes:30,points:20,rebounds:5,ast:4,tov:2,two_pm:5,two_pa:8,three_pm:3,three_pa:7,ftm:1,fta:2},
  {player_name:'A',game_date:'2026-10-06',minutes:29,points:18,rebounds:5,ast:3,tov:2,two_pm:4,two_pa:8,three_pm:3,three_pa:6,ftm:1,fta:2},
  {player_name:'A',game_date:'2026-10-03',minutes:31,points:22,rebounds:6,ast:4,tov:1,two_pm:5,two_pa:9,three_pm:3,three_pa:6,ftm:3,fta:4},
  {player_name:'A',game_date:'2026-09-28',minutes:20,points:8,rebounds:4,ast:2,tov:2,two_pm:2,two_pa:6,three_pm:1,three_pa:5,ftm:1,fta:2},
  {player_name:'A',game_date:'2026-09-25',minutes:19,points:7,rebounds:3,ast:2,tov:2,two_pm:2,two_pa:5,three_pm:1,three_pa:5,ftm:0,fta:0},
  {player_name:'A',game_date:'2026-09-20',minutes:18,points:6,rebounds:3,ast:1,tov:2,two_pm:2,two_pa:5,three_pm:0,three_pa:4,ftm:2,fta:2}
];
const memory=M.playerMemories(playerRows)[0];
assert.strictEqual(memory.last3.games,3);
assert.strictEqual(memory.previous3.games,3);
assert(memory.delta.minutes>9,'Recent minutes shift should compare last 3 to previous 3');
assert(memory.delta.points>12,'Recent scoring shift should be detected');
assert(memory.signals.some(s=>s.startsWith('דקות')),'Minutes shift should surface as a signal');
assert(memory.signals.some(s=>s.startsWith('נק׳')),'Scoring shift should surface as a signal');

const signals=M.teamSignals(
  {games:8,ppg:75,efg:48,threeRate:30,tov:15,orb:25,ortg:100},
  {games:3,ppg:82,efg:55,threeRate:40,tov:11,orb:33,ortg:112}
);
assert(signals.length>=3,'Large recent deltas should produce descriptive team signals');
assert(signals.every(x=>!/[Cc]ause|because|PNR|switch|drop/.test(x.label)),'Memory signals should stay descriptive, not causal');

console.log('season memory v215 tests passed');
