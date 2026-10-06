const assert=require('assert');
const ops=require('../basketball-ops.js');

const rows=[
  {player_id:188,game_id:1,minutes:30,stats:{points:18,rebounds:4,ast:6,tov:2,oreb:1,steals:2,blocks:0,two_pm:4,two_pa:8,three_pm:2,three_pa:5,ftm:4,fta:5}},
  {player_id:188,game_id:2,minutes:28,stats:{points:15,rebounds:5,ast:5,tov:2,oreb:1,steals:1,blocks:0,two_pm:3,two_pa:7,three_pm:2,three_pa:6,ftm:3,fta:4}},
  {player_id:188,game_id:3,minutes:32,stats:{points:20,rebounds:6,ast:7,tov:3,oreb:2,steals:2,blocks:0,two_pm:5,two_pa:9,three_pm:2,three_pa:5,ftm:4,fta:4}},
  {player_id:188,game_id:4,minutes:25,stats:{points:12,rebounds:3,ast:4,tov:1,oreb:0,steals:1,blocks:0,two_pm:2,two_pa:5,three_pm:2,three_pa:5,ftm:2,fta:2}},
  {player_id:188,game_id:5,minutes:31,stats:{points:17,rebounds:4,ast:6,tov:2,oreb:1,steals:1,blocks:0,two_pm:4,two_pa:8,three_pm:2,three_pa:5,ftm:3,fta:3}},
  {player_id:188,game_id:6,minutes:29,stats:{points:13,rebounds:4,ast:3,tov:2,oreb:1,steals:1,blocks:0,two_pm:3,two_pa:7,three_pm:1,three_pa:4,ftm:4,fta:4}}
];
const agg=ops.aggregateGames(rows);
assert.equal(agg.appearances,6);
assert(agg.minutes>170);
assert(agg.assists40>6);
assert(agg.ast_to>2);
assert(agg.ts>50);

const sample=ops.profileFromSample({games:10,minutes:300,source_label:'official sample',raw_stats:{points:150,rebounds:60,assists:40,turnovers:20,oreb:20,steals:15,blocks:4,two_pm:40,two_pa:80,three_pm:15,three_pa:45,fta:30,ftm:25}});
assert.equal(sample.appearances,10);
assert.equal(ops.sampleConfidence(sample),'HIGH');
assert(sample.points40===20);

const shooter={appearances:18,minutes:500,three_pct:40,three_rate:50,ts:62,points40:20};
const shooterFit=ops.fitScore(shooter,'shooting_guard');
assert(shooterFit.score>85);
assert(shooterFit.coverage===100);
assert.equal(shooterFit.confidence,'HIGH');

const sparse={appearances:2,minutes:40,three_pct:36};
const sparseFit=ops.fitScore(sparse,'shooting_guard');
assert(sparseFit.coverage<50);
assert.equal(sparseFit.confidence,'LOW');

const snapshot={
  club_players:[{player_id:16,roster_status:'roster',player:{id:16,name:'Abby Meyers'},source_ids:[188]},{player_id:2,roster_status:'scouting',player:{id:2,name:'Ashley Owusu'},source_ids:[]}],
  game_stats:rows,
  samples:[{player_id:2,games:24,minutes:537,source_label:'Poland OBLK',raw_stats:{points:361,rebounds:131,assists:77,turnovers:32,oreb:14,steals:22,blocks:6,two_pm:106,two_pa:203,three_pm:26,three_pa:76,fta:82,ftm:71}}]
};
const players=ops.buildPlayers(snapshot);
const abby=players.find(x=>x.player_id===16),ashley=players.find(x=>x.player_id===2);
assert(abby.identityLinked);
assert.equal(abby.profile.appearances,6);
assert.equal(ashley.profile.appearances,24);
assert.equal(ashley.profile.source,'Poland OBLK');

const tr=ops.trend(rows);
assert(tr.recent&&tr.prior);
assert(Array.isArray(ops.roleSignals(agg)));
console.log('Basketball Ops v187: Player 360 aggregation, identity linking, confidence and role-fit model passed.');
