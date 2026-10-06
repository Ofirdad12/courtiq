const assert=require('node:assert/strict'),api=require('../pbp-explorer');
const g={home:'Home',away:'Away',playByPlay:[
 {period:1,clock:'09:50',side:'home',player:'Alpha',type:'2pm',description:'Made layup'},
 {period:1,clock:'09:20',team:'Away',player:'Beta',type:'tov',description:'Bad pass'},
 {period:2,clock:'08:10',side:'home',player:'Alpha',type:'off',description:'Offensive rebound'},
 {period:5,clock:'04:00',team:'Away',player:'Beta',type:'fta',description:'Missed free throw'},
 {period:2,clock:'07:00',player:'Unknown',description:'Unrecognized action'},
 null
]};
assert.equal(api.events(g).length,5);assert.equal(api.filter(g).length,5);
assert.deepEqual(api.filter(g,{side:'away'}).map(e=>e.type),['tov','fta']);
assert.equal(api.filter(g,{side:'home',player:'Alpha',period:'2',type:'rebound'}).length,1);
assert.equal(api.filter(g,{search:' BAD PASS '})[0],g.playByPlay[1]);
assert.equal(api.filter(g,{type:'turnover'})[0],g.playByPlay[1]);
assert.equal(api.filter(g,{type:'shot'}).length,1,'free throws are separate from field goals');
assert.equal(api.filter(g,{side:'unknown'})[0],g.playByPlay[4]);
assert.equal(api.filter(g,{period:3}).length,0);
assert.equal(api.category({description:'איבוד כדור'}),'turnover');assert.equal(api.category({description:'ריבאונד הגנה'}),'rebound');assert.equal(api.category({description:'זריקת עונשין'}),'free_throw');
assert.equal(api.category({type:'pf',description:'Foul after a shot'}),'foul');assert.equal(api.category({description:'Timeout'}),'other');
assert.match(api.render(g),/OT1/);assert.match(api.render(g),/All players/);
assert.ok(!api.render({}).includes('ibasketball.co.il'),'no unrelated fallback source');
assert.ok(!api.render({sourceUrl:'javascript:bad()'}).includes('javascript:'));
assert.ok(!api.render({...g,home:'<script>bad</script>'}).includes('<script>'));
assert.equal(api.events({play_by_play:g.playByPlay}).length,5);assert.equal(api.events({playByPlay:{}}).length,0);
assert.deepEqual(api.filter(g,{player:'Beta'}),[g.playByPlay[1],g.playByPlay[3]],'source order preserved');
console.log('PBP explorer: combined filters, source order, unknown teams, Hebrew/type grouping, overtime, escaping and source-link safety passed.');
const window={period:1,startClock:'10:00',endClock:'09:20'};
assert.deepEqual(api.filter(g,{window}),[g.playByPlay[0],g.playByPlay[1]]);
assert.deepEqual(api.filter(g,{window,side:'away',type:'turnover'}),[g.playByPlay[1]]);
assert.equal(api.filter(g,{window:{...window,startClock:'09:00'}}).length,0);
assert.equal(api.filter(g,{window:{...window,endClock:'09:99'}}).length,0);
assert.equal(api.filter(g,{window:{period:5,startClock:'05:00',endClock:'04:00'}}).length,1);
console.log('PBP clock windows: period isolation, inclusive boundary review, combined filters, invalid ranges and overtime passed.');

const flow={home:'Blue',away:'Red',playByPlay:[
 {period:1,clock:'09:50',side:'home',player:'Alpha',type:'2pm',description:'Made layup',score:'2-0'},
 {period:1,clock:'09:30',side:'home',player:'Alpha',type:'3pm',description:'Made three',score:'5-0'},
 {period:1,clock:'09:10',side:'home',player:'Gamma',type:'2pm',description:'Made layup',score:'7-0'},
 {period:1,clock:'08:50',side:'away',player:'Beta',type:'tov',description:'Bad pass',score:'7-0'},
 {period:1,clock:'08:30',side:'away',player:'Beta',type:'tov',description:'Travel',score:'7-0'},
 {period:1,clock:'08:20',side:'home',player:'Gamma',type:'oreb',description:'Offensive rebound',score:'7-0'},
 {period:1,clock:'08:10',side:'away',player:'Delta',type:'2pm',description:'Made jumper',score:'7-2'},
 {period:1,clock:'07:50',side:'home',player:'Alpha',type:'tov',description:'Lost ball',score:'7-2'},
 {period:1,clock:'07:30',side:'away',player:'Delta',type:'3pm',description:'Made three',score:'7-5'},
 {period:1,clock:'07:00',side:'away',player:'Delta',type:'3pm',description:'Made three',score:'7-8'},
 {period:1,clock:'06:40',side:'home',player:'Alpha',type:'2pm',description:'Made layup',score:'9-8'},
 {period:1,clock:'06:20',side:'away',player:'Delta',type:'2pm',description:'Made jumper',score:'9-10'},
 {period:4,clock:'01:30',side:'home',player:'Alpha',type:'2pm',description:'Made layup',score:'75-76'},
 {period:4,clock:'01:00',side:'away',player:'Delta',type:'tov',description:'Bad pass',score:'75-76'}
]};
assert.equal(api.scoreOf(flow.playByPlay[0]).home,2);
assert.ok(api.scoreSnapshots(flow).length>=10);
assert.equal(api.detectRuns(flow,6)[0].side,'away');
assert.equal(api.detectRuns(flow,6)[0].points,8);
assert.equal(api.turnoverBursts(flow)[0].side,'away');
assert.ok(api.turnoverBursts(flow)[0].count>=2);
assert.equal(api.statCounts(flow).home.oreb,1);
assert.equal(api.leadChanges(flow).count,3);
assert.ok(api.pressureWindow(flow).counts.events>=2);
assert.equal(api.playerPulse(flow)[0].player,'Delta');
assert.ok(api.turningPoints(flow).some(x=>x.kind==='run'));
assert.ok(api.coachInsights(flow).some(x=>x.intent==='run'));
assert.match(api.brief(flow),/Largest verified run/);
assert.match(api.render(flow),/Play-by-Play Command Center/);
assert.match(api.render(flow),/COACH SIGNALS/);
assert.equal(api.filter(flow,{quick:'turnover'}).filter(e=>api.category(e)==='turnover').length,4);
assert.equal(api.filter(flow,{quick:'oreb'}).length,1);
assert.ok(api.filter(flow,{quick:'runs'}).length>=3);
assert.ok(api.filter(flow,{quick:'clutch'}).length>=2);
console.log('PBP Command Center v180: score flow, runs, lead changes, turnover bursts, player pulse, clutch windows, coach signals and evidence filters passed.');
