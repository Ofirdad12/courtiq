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
