const assert=require('assert');
const DI=require('../decision-intelligence.js');

function factors(home={efg:54,tov:13,orb:29,ftr:24},away={efg:52,tov:14,orb:27,ftr:22}){
  return [['eFG%',home.efg,away.efg],['TOV%',home.tov,away.tov],['ORB%',home.orb,away.orb],['FTr',home.ftr,away.ftr]];
}
function quietGame(){
  const pbp=[];for(let i=0;i<16;i++)pbp.push({period:1,clock:`${9-Math.floor(i/2)}:${i%2?'10':'40'}`,score:`${i}-${i}`,side:i%2?'away':'home',description:'shot'});
  return {home:'Home',away:'Away',hs:15,as:15,factors:factors(),playByPlay:pbp};
}
function pressureGame(){
  return {home:'Home',away:'Away',hs:20,as:28,factors:factors({efg:47,tov:27,orb:19,ftr:19},{efg:64,tov:12,orb:46,ftr:39}),playByPlay:[
    {period:2,clock:'6:00',score:'20-18',side:'home',team:'Home',description:'made shot'},
    {period:2,clock:'5:20',score:'20-20',side:'away',team:'Away',description:'made shot'},
    {period:2,clock:'4:55',score:'20-20',side:'home',team:'Home',description:'turnover bad pass',type:'turnover'},
    {period:2,clock:'4:30',score:'20-22',side:'away',team:'Away',description:'made shot'},
    {period:2,clock:'4:05',score:'20-22',side:'away',team:'Away',description:'offensive rebound',type:'rebound'},
    {period:2,clock:'3:40',score:'20-24',side:'away',team:'Away',description:'made shot'},
    {period:2,clock:'3:10',score:'20-24',side:'home',team:'Home',description:'turnover traveling',type:'turnover'},
    {period:2,clock:'2:45',score:'20-26',side:'away',team:'Away',description:'made shot'},
    {period:2,clock:'2:10',score:'20-26',side:'away',team:'Away',description:'offensive rebound',type:'rebound'},
    {period:2,clock:'1:50',score:'20-28',side:'away',team:'Away',description:'made shot'}
  ]};
}

const quiet=DI.decision(quietGame(),'home');
assert.equal(quiet.label,'STAY','quiet state should stay');
assert.ok(['LOW','MEDIUM','HIGH'].includes(quiet.confidence));
assert.ok(quiet.nextTwo.length>=2);

const pressured=DI.decision(pressureGame(),'home');
assert.equal(pressured.label,'CONSIDER CHANGE','corroborated pressure should escalate');
assert.ok(pressured.signals.some(x=>x.id==='tov'));
assert.ok(pressured.signals.some(x=>x.id==='orb'));
assert.ok(pressured.support.length>0,'decision should expose evidence');
assert.ok(pressured.counter.length>0,'decision should expose counter-evidence state');

const hyps=DI.evaluateHypotheses(pressureGame(),'home',[]);
const glass=hyps.find(x=>x.id==='glass-pressure');
const ball=hyps.find(x=>x.id==='ball-security');
assert.equal(glass.status,'SUPPORTED');
assert.equal(ball.status,'SUPPORTED');
assert.ok(glass.changeMind.length>10);

const possession=DI.evaluateHypotheses({home:'H',away:'A',hs:20,as:18,factors:factors({efg:50,tov:9,orb:42,ftr:20},{efg:49,tov:20,orb:25,ftr:18}),playByPlay:[]},'home',[]).find(x=>x.id==='possession-battle');
assert.equal(possession.status,'SUPPORTED');

const custom=DI.evaluateHypotheses(quietGame(),'home',[{id:'x',title:'Trap their side PNR'}]).find(x=>x.id==='x');
assert.equal(custom.status,'MANUAL CHECK');
assert.equal(custom.automatic,false);

const html=DI.renderWorkspace(pressureGame(),'home','test-source');
assert.ok(html.includes('COACH DECISION ENGINE'));
assert.ok(html.includes('SHOW COUNTER-EVIDENCE'));
assert.ok(html.includes('HYPOTHESIS TRACKER'));
assert.ok(html.includes('What would change my mind?'));

console.log('decision-intelligence tests passed');
