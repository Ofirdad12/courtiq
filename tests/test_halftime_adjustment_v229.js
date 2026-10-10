const assert=require('assert');
const H=require('../halftime-adjustment-v229.js');
{
 const g={playByPlay:[{period:2,clock:'00:03'}]};const s=H.halftimeState(g);assert.equal(s.ready,true);assert.equal(s.period,2);
}
{
 const g={playByPlay:[{period:2,clock:'04:20'}]};assert.equal(H.halftimeState(g).ready,false);
 const q3={playByPlay:[{period:3,clock:'09:55'}]};assert.equal(H.halftimeState(q3).ready,true);
}
{
 const v=H.verdict({key:'efg',label:'Opponent eFG%',baseline:55,actual:49,goodDirection:'lower',threshold:3,coachCheck:'x'});assert.equal(v.status,'WORKING');assert.equal(v.delta,-6);
 const a=H.verdict({key:'orb',label:'ORB',baseline:30,actual:38,goodDirection:'lower',threshold:4,coachCheck:'x'});assert.equal(a.status,'ADJUST');
 const w=H.verdict({key:'tov',label:'TOV',baseline:14,actual:15,goodDirection:'higher',threshold:3,coachCheck:'x'});assert.equal(w.status,'WATCH');
}
{
 const rows=H.compareFactors({efg:55,tov:14,orb:30,ftr:25},{efg:60,tov:9,orb:31,ftr:20});const plan=H.secondHalfPlan(rows);assert.equal(plan[0].status,'ADJUST');assert.equal(plan.length,3);
}
{
 const G={factors:[['eFG%','50','61'],['TOV%','18','10'],['ORB%','25','36'],['FTr','20','33']]};const f=H.liveOpponentFactors(G,'home');assert.equal(f.efg,61);assert.equal(f.orb,36);
}
{
 const x=H.buildAdjustment({game:{playByPlay:[{period:3,clock:'10:00'}]},side:'home',baseline:{efg:55,tov:14,orb:30,ftr:25}});assert.equal(x.state.ready,true);assert.equal(x.factors.length,4);
}
console.log('halftime-adjustment-v229 tests passed');
