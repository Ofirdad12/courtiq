const assert=require('assert');
const Q=require('../data-quality-center-v225.js');

function side(points=80){
  return {points,two_pm:20,two_pa:40,three_pm:10,three_pa:25,ftm:10,fta:12,oreb:9,dreb:24,tov:12,ast:18};
}
function players(prefix='P'){
  const rows=[];
  for(let i=0;i<10;i++)rows.push({name:`${prefix}${i+1}`,minutes:20,points:8,two_pm:2,two_pa:4,three_pm:1,three_pa:i<5?3:2,ftm:1,fta:i<2?2:1,starter:i<5});
  // Totals: 80 pts, 20/40 2P, 10/25 3P, 10/12 FT, 200 min.
  return rows;
}
function game(){
  return {provider:'TEST',payload:{raw:{home:side(),away:side()},ui:{home:'A',away:'B',quarters:[[20,20],[20,20],[20,20],[20,20]],players:{home:players('H'),away:players('A')},calculated:{home:{pace:70},away:{pace:70}},playByPlay:[],splits:{home:{},away:{}}}}};
}

{
  const g=game(),q=Q.evaluate(g);
  assert.equal(q.status,'VERIFIED');
  assert.equal(q.score,100);
  assert.equal(q.trusted,true);
  assert.equal(q.capabilities.box_score,true);
  assert.equal(q.capabilities.starters,true);
}
{
  const g=game();g.payload.ui.players.home[0].points=9;
  const q=Q.evaluate(g);
  assert.equal(q.status,'INCOMPLETE');
  assert(q.blockers.some(x=>x.check_name==='home_score_reconcile'));
  assert.equal(q.trusted,false);
}
{
  const g=game();g.payload.ui.players.home[0].minutes=30;
  const q=Q.evaluate(g);
  assert.equal(q.status,'WARNING');
  assert(q.warnings.some(x=>x.check_name==='home_team_minutes'));
  assert.equal(q.trusted,true);
}
{
  const g=game();g.payload.ui.playByPlay=[{period:1,x:12,y:33}];
  const c=Q.capabilities(g);
  assert.equal(c.play_by_play,true);
  assert.equal(c.shot_coordinates,true);
  assert.equal(c.tier,'EVENT + SHOT DATA');
}
{
  const g=game();g.payload.quality={checks:[{check_name:'server_only_check',status:'FAIL'}]};
  const q=Q.evaluate(g);
  assert.equal(q.status,'INCOMPLETE');
  assert(q.blockers.some(x=>x.check_name==='server_only_check'));
}
console.log('data-quality-v225 tests passed');
