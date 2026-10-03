const assert=require("node:assert/strict");
const api=require("../court-analytics.js");
const players=["A","B","C","D","E"];
const stint=(id,extra={})=>({id,side:"home",players,seconds:60,pointsFor:5,pointsAgainst:4,possessions:4,opponentPossessions:5,fgm:2,fga:4,threePm:1,tov:1,...extra});
const shot=(id,extra={})=>({id,side:"home",player:"A",period:1,clock:"08:30",x:7.5,y:2,made:true,value:2,lineup:players,...extra});
const data=(stints=[],shots=[])=>({version:1,coordinateSystem:"FIBA_METERS_HALF",lineupStints:stints,shots});
const validated=api.validate(data([stint("s1"),stint("s2",{players:[...players].reverse()})],[shot("1"),shot("2",{made:false}),shot("3",{value:3})]));
const [r]=api.aggregate(validated.lineupStints);
assert.equal(r.minutes,2);assert.equal(r.stints,2);assert.equal(r.plusMinus,2);assert.equal(r.ortg,125);assert.equal(r.drtg,80);assert.equal(r.net,45);assert.equal(r.efg,62.5);
assert.equal(api.aggregate(api.validate(data([stint("s1"),stint("s2",{possessions:null,fga:null})])).lineupStints)[0].ortg,null);
assert.equal(api.aggregate(api.validate(data([stint("s1",{possessions:0,opponentPossessions:0,fga:0,fgm:0,threePm:0})])).lineupStints)[0].efg,null);
assert.equal(api.aggregate(api.validate(data([stint("a"),stint("b",{side:"away"})])).lineupStints).length,2);
assert.equal(api.filterShots(validated.shots,{result:"made"}).length,2);
assert.equal(api.filterShots(validated.shots,{lineup:r.id}).length,3);
assert.equal(api.filterShots([shot("u",{lineup:null})],{lineup:r.id}).length,0);
assert.equal(api.filterShots(validated.shots,{side:"away"}).length,0);
assert.deepEqual(api.summary(validated.shots),{fga:3,fgm:2,points:5,fg:200/3,efg:250/3});
assert.equal(api.summary([]).fg,null);
for(const bad of [
 data([stint("s",{players:["A","A","C","D","E"]})]),
 data([stint("s",{seconds:-1})]),
 data([stint("s",{possessions:1.5})]),
 data([stint("s",{fgm:5,fga:4})]),
 data([], [shot("x",{x:16})]),
 data([], [shot("x",{made:"false"})]),
 data([], [shot("x",{lineup:["B","C","D","E","F"]})]),
 data([], [shot("x",{clock:"08:90"})]),
 data([], [shot("x"),shot("x")]),
 {...data(),coordinateSystem:"UNKNOWN"}
])assert.throws(()=>api.validate(bad));
assert.deepEqual(api.dataset({id:"test",home:"H",away:"A"}).data.shots,[]);
assert.equal(api.dataset({shots:[shot("1")]}).data.shots.length,0);
assert.match(api.dataset({shots:[shot("1")]}).error,/coordinate system/);
const markup=api.court([shot("1",{player:'<img src=x onerror=alert(1)>'})]);
assert.ok(!markup.includes("<img"));assert.ok(markup.includes("&lt;img"));
assert.match(api.render(),/data-game-view="lineups"/);assert.match(api.render(),/data-game-view="shots"/);
console.log("Court analytics: aggregation, denominators, validation, filters and escaping passed.");

const measured=data([stint('h',{seconds:120,period:1}),stint('a',{side:'away',seconds:300,period:1})]);
const quality={source:'PLAY_BY_PLAY',status:'PARTIAL',expectedSeconds:2400};
assert.equal(api.sampleCoverage(measured,quality)[0].percent,5);
assert.equal(api.sampleCoverage(measured,quality,'1')[0].percent,20);
assert.equal(api.sampleCoverage(measured,null)[0].percent,null);
assert.equal(api.sampleCoverage(measured,{...quality,status:'UNRELIABLE_SCORE'})[0].percent,null);
// Normalize exposure without inventing possession counts or extrapolating full-game totals.
const short=api.aggregate([stint('short',{seconds:120,pointsFor:10,pointsAgainst:4})])[0];
const long=api.aggregate([stint('long',{seconds:600,pointsFor:20,pointsAgainst:10,players:['A','B','C','D','F']})])[0];
assert.equal(short.pointsForPerMinute,5);assert.equal(long.pointsForPerMinute,2);assert.equal(short.plusMinusPerMinute,3);
assert.equal(api.aggregate([stint('instant',{seconds:0})])[0].pointsForPerMinute,null);
const assessment=api.comparison(short,long);assert.equal(assessment.shared.length,4);assert.deepEqual(assessment.onlyA,['E']);assert.deepEqual(assessment.onlyB,['F']);assert.match(assessment.warnings.join(' '),/Unequal exposure/);assert.match(assessment.warnings.join(' '),/statistical confidence/);
const timed=(id,extra={})=>stint(id,{period:1,startClock:'10:00',endClock:'09:00',...extra});
assert.equal(api.interval(timed('one')).period,1);assert.equal(api.interval(stint('untimed')),null);
assert.equal(api.clockSeconds(5,'06:00'),null);assert.equal(api.clockSeconds(5,'05:00'),300);
assert.throws(()=>api.validate(data([timed('bad',{period:0})])),/period/);
assert.throws(()=>api.validate(data([timed('bad',{startClock:'09:00',endClock:'10:00'})])),/descending/);
assert.throws(()=>api.validate(data([timed('bad',{seconds:120})])),/seconds must match/);
assert.throws(()=>api.validate(data([timed('one'),timed('two',{startClock:'09:30',endClock:'08:30'})])),/overlaps/);
assert.doesNotThrow(()=>api.validate(data([timed('one'),timed('two',{startClock:'09:00',endClock:'08:00'})])));
assert.doesNotThrow(()=>api.validate(data([timed('one'),timed('away',{side:'away'})])));
console.log('Lineup evidence: per-minute rates, zero-time samples, shared-player context, interval validation and overlap rejection passed.');
