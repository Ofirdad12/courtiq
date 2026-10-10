const assert=require('assert');
const P=require('../player-intelligence-v226.js');
function row({pts=10,min=20,ts=50,share=20,three=4,two=6,fta=2,ast=2,tov=1,oreb=1,dreb=3}={}){return {minutes:min,stats:{points:pts,two_pm:Math.min(three?1:0,three),two_pa:two,three_pm:Math.min(2,three),three_pa:three,ftm:1,fta,ast,tov,oreb,dreb,rebounds:oreb+dreb},calculated:{ts,efg:50,play_end_share:share,points_per_40:pts*2,box_impact_per_40:12}}}
{
  const s=P.summary([row({pts:20,min:30,three:5,two:10,fta:4}),row({pts:10,min:20,three:5,two:10,fta:2})]);
  assert.equal(s.games,2);assert.equal(s.minutes,25);assert.equal(s.points,15);assert.equal(s.rebounds,4);assert(s.three_rate>0);
}
{
  const rows=[row({pts:20,min:32,share:27,ts:60}),row({pts:18,min:31,share:26,ts:58}),row({pts:19,min:30,share:25,ts:59}),row({pts:10,min:22,share:18,ts:51}),row({pts:11,min:23,share:19,ts:52}),row({pts:9,min:21,share:17,ts:50})];
  const t=P.trend(rows);assert.equal(t.ready,true);assert(t.signals.find(x=>x.key==='play_end_share').delta>=7);
  const alert=P.roleAlert(t);assert.equal(alert.type,'ROLE EXPANSION');assert.equal(alert.level,'HIGH');
}
{
  const rows=[row({pts:10,min:20}),row({pts:10,min:20}),row({pts:10,min:20})];
  const c=P.consistency(rows);assert.equal(c.label,'STABLE');
}
{
  const t=P.trend([row(),row(),row(),row()]);assert.equal(t.ready,false);const a=P.roleAlert(t);assert.equal(a.type,'SMALL SAMPLE');
}
{
  const teams=P.candidateTeams([{team_name:'B'},{team_name:'A'},{team_name:'B'}]);assert.equal(teams[0].name,'B');assert.equal(teams[0].games,2);
}
console.log('player-intelligence-v226 tests passed');
