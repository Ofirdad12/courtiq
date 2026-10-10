const assert=require('assert');
const P=require('../postgame-learning-v228.js');
{
 const x=P.metricVerdict({label:'eFG',key:'efg',baseline:55,actual:49,goodDirection:'lower',threshold:3});assert.equal(x.verdict,'CONTROLLED');assert.equal(x.delta,-6);
 const y=P.metricVerdict({label:'TOV',key:'tov',baseline:14,actual:9,goodDirection:'higher',threshold:3});assert.equal(y.verdict,'MISSED');
 const z=P.metricVerdict({label:'ORB',key:'orb',baseline:30,actual:31,goodDirection:'lower',threshold:4});assert.equal(z.verdict,'NEUTRAL');
}
{
 const k=P.buildKpis({efg:55,tov:14,orb:30},{efg:50,tov:18,orb:38});assert.equal(k.length,3);assert.equal(k[0].verdict,'CONTROLLED');assert.equal(k[1].verdict,'CONTROLLED');assert.equal(k[2].verdict,'MISSED');
}
{
 const game={id:5,date:'2026-10-10',home:'Us',away:'Them',hs:80,as:70};const m=P.learningModel({game,own:'Us',opponent:'Them',baseline:{efg:55,tov:14,orb:30},actual:{efg:50,tov:18,orb:38},priorGames:5,pregameReportId:12});assert.equal(m.sample.confidence,'HIGH');assert.equal(m.scorecard.controlled,2);assert.equal(m.scorecard.missed,1);assert.equal(m.lessons.length,3);assert.equal(m.pregame_report_id,12);
}
{
 const x=P.metricVerdict({label:'x',key:'x',baseline:null,actual:4});assert.equal(x.verdict,'INSUFFICIENT');assert(/insufficient/i.test(P.lessonFor(x)));
}
console.log('postgame-learning-v228 tests passed');
