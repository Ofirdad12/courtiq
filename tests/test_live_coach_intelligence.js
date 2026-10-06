const assert=require('assert');
const intel=require('../live-coach-intelligence.js');

const G={
  home:'Us',away:'Them',hs:32,as:40,
  raw:{home:{two_pa:12,three_pa:8,fta:4,oreb:2,dreb:8,tov:6},away:{two_pa:14,three_pa:10,fta:8,oreb:6,dreb:10,tov:2}},
  factors:[['eFG%',46,63],['TOV%',24,9],['ORB%',18,40],['FTr',20,33]],
  players:{home:[
    {name:'Guard A',minutes:14,points:8,two_pa:3,three_pa:4,fta:2,tov:4,ast:2,oreb:0,dreb:1,ts:46,efg:43},
    {name:'Wing B',minutes:12,points:12,two_pa:3,three_pa:3,fta:2,tov:1,ast:1,oreb:1,dreb:2,ts:68,efg:67}
  ],away:[]},
  playByPlay:[
    {period:2,clock:'05:50',score:'32-30',side:'home',type:'2pm'},
    {period:2,clock:'05:10',score:'32-32',side:'away',type:'2pm'},
    {period:2,clock:'04:30',score:'32-35',side:'away',type:'3pm'},
    {period:2,clock:'04:00',score:'32-35',side:'home',type:'turnover',description:'turnover'},
    {period:2,clock:'03:20',score:'32-37',side:'away',type:'2pm'},
    {period:2,clock:'02:55',score:'32-37',side:'home',type:'turnover',description:'turnover'},
    {period:2,clock:'02:30',score:'32-40',side:'away',type:'3pm'}
  ]
};
const prev=JSON.parse(JSON.stringify(G));
prev.hs=27;prev.as=32;prev.players.home[0].tov=2;prev.players.home[1].points=7;

assert.equal(intel.isTurnoverEvent({type:'turnover'}),true);
assert(intel.rollingEvents(G,'home',3,intel.isTurnoverEvent).length>=2);
const alerts=intel.alerts(G,'home',prev);
assert(alerts.some(a=>a.key==='turnover-burst'));
assert(alerts.some(a=>a.key==='defensive-glass'));
assert(alerts.some(a=>a.key.startsWith('player-tov-')));
const team=intel.teamConclusions(G,'home');
assert(team.some(x=>x.key==='tov'));
assert(team.some(x=>x.key==='orb'));
const player=intel.playerConclusions(G,'home',prev);
assert(player.some(x=>x.player==='Guard A'));
assert(player.some(x=>x.player==='Wing B'));
const brief=intel.coachBrief(G,'home',prev);
assert(brief.alerts.length>0&&brief.team.length>0&&brief.players.length>0);

const quiet={home:'A',away:'B',hs:12,as:11,raw:{home:{two_pa:5,three_pa:3,fta:1,oreb:1,tov:1},away:{two_pa:5,three_pa:3,fta:1,oreb:1,tov:1}},factors:[['eFG%',50,49],['TOV%',12,13],['ORB%',24,25],['FTr',12,12]],players:{home:[{name:'P',minutes:4,points:3,two_pa:1,three_pa:1,tov:0,ast:1,oreb:0,dreb:1,ts:55,efg:50}],away:[]},playByPlay:[{period:1,clock:'05:00',score:'12-11',side:'home',type:'2pm'}]};
assert.equal(intel.alerts(quiet,'home').length,0);
assert.equal(intel.teamConclusions(quiet,'home')[0].key,'steady');
console.log('live coach intelligence tests passed');
