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
