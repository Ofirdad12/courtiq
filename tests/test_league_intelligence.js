const assert=require('assert');
const L=require('../league-intelligence.js');
const games=[
 {id:1,provider:'IBBA',game_date:'2026-10-01',home_team:'Alpha',away_team:'Beta',payload:{calculated:{home:{points:90,possessions:80,off_rating:112.5,def_rating:100,net_rating:12.5,efg:60,ts:62,tov_pct:10,oreb_pct:35,ftr:28,pace:80,three_rate:42,fg_a:70},away:{points:80,possessions:80,off_rating:100,def_rating:112.5,net_rating:-12.5,efg:50,ts:52,tov_pct:18,oreb_pct:22,ftr:18,pace:80,three_rate:30,fg_a:68}}}},
 {id:2,provider:'IBBA',game_date:'2026-10-03',home_team:'Gamma',away_team:'Alpha',payload:{calculated:{home:{points:75,possessions:75,off_rating:100,def_rating:108,net_rating:-8,efg:48,ts:50,tov_pct:20,oreb_pct:25,ftr:20,pace:75,three_rate:28,fg_a:65},away:{points:81,possessions:75,off_rating:108,def_rating:100,net_rating:8,efg:56,ts:58,tov_pct:12,oreb_pct:32,ftr:26,pace:75,three_rate:38,fg_a:66}}}}
];
const rows=L.teamGameRows(games,'IBBA');
assert.strictEqual(rows.length,4);
assert.strictEqual(rows.filter(x=>x.team==='Alpha').length,2);
const alpha=L.aggregateTeam(rows.filter(x=>x.team==='Alpha'));
assert.strictEqual(alpha.games,2);
assert.strictEqual(alpha.points,171);
assert.strictEqual(alpha.points_against,155);
assert.ok(alpha.net_rating>9&&alpha.net_rating<11);
assert.ok(alpha.efg>57&&alpha.efg<59);
const teams=L.applyPercentiles(L.buildTeams(games,'IBBA'));
const a=teams.find(x=>x.team==='Alpha');
const g=teams.find(x=>x.team==='Gamma');
assert.ok(a.percentiles.net_rating>g.percentiles.net_rating);
assert.ok(a.percentiles.tov_pct>g.percentiles.tov_pct,'lower TOV% should receive the stronger percentile');
assert.strictEqual(L.percentileValue([{x:1},{x:1},{x:1}],'x',1,true),50,'ties should sit at the middle percentile');
assert.strictEqual(L.sampleConfidence(2),'LOW');
assert.strictEqual(L.sampleConfidence(4),'MEDIUM');
assert.strictEqual(L.sampleConfidence(8),'HIGH');
const tagged={...a,percentiles:{...a.percentiles,pace:90,three_rate:90,oreb_pct:90,tov_pct:90,efg:90,ftr:90}};
assert.ok(L.teamArchetypes(tagged).includes('FAST PACE'));
assert.ok(L.teamArchetypes(tagged).length<=3);
const trend=L.teamTrend(a);
assert.strictEqual(trend.count,2);
const playerRows=[
 {game_id:1,player_id:11,provider:'IBBA',team_name:'Alpha',player_name:'Player A',minutes:30,stats:{points:15,rebounds:6,ast:5,tov:2,two_pm:4,two_pa:8,three_pm:2,three_pa:5,fta:2}},
 {game_id:2,player_id:11,provider:'IBBA',team_name:'Alpha',player_name:'Player A',minutes:20,stats:{points:10,rebounds:4,ast:3,tov:1,two_pm:3,two_pa:6,three_pm:1,three_pa:3,fta:1}},
 {game_id:1,player_id:12,provider:'IBBA',team_name:'Beta',player_name:'Player B',minutes:10,stats:{points:2,rebounds:1,ast:0,tov:1,two_pm:1,two_pa:3,three_pm:0,three_pa:1,fta:0}}
];
const pa=L.playerAggregate(playerRows.slice(0,2));
assert.strictEqual(pa.games,2);
assert.strictEqual(pa.minutes,50);
assert.strictEqual(Math.round(pa.points40),20);
const pool=L.buildPlayers(playerRows,'IBBA',40);
assert.strictEqual(pool.length,1);
assert.strictEqual(pool[0].player_name,'Player A');
const ds=L.datasetSummary(games,playerRows,'IBBA');
assert.strictEqual(ds.games,2);
assert.strictEqual(ds.teams,3);
assert.strictEqual(ds.players,2);
assert.ok(L.providerLabel('PLK').includes('Poland'));
console.log('League Intelligence v188: team/player aggregation, percentiles, confidence, archetypes and filters passed.');
