const assert=require('node:assert/strict');
global.CourtIQLineupEngine=require('../lineup-engine');
const api=require('../game-intelligence');
const roster=(prefix,ot=false)=>Array.from({length:5},(_,i)=>({name:prefix+i,starter:true,minutes:ot?45:40,points:2}));
const game=()=>({home:'H',away:'A',hs:10,as:10,quarters:[[2,2],[2,2],[2,2],[4,4]],players:{home:roster('H'),away:roster('A')},factors:[['eFG%',50,40],['TOV%',10,20],['ORB%',30,30],['FTr',20,25]]});
let g=game();assert.equal(api.qa(g).failed,0);assert.equal(api.qa(g).unknown,0);assert.equal(api.insights(g).length,3);assert.equal(api.insights(g).find(x=>x.title==='Ball security').finding.startsWith('H'),true);
g=game();g.players.home.forEach(p=>p.starter=false);assert.equal(api.role(g,'home',g.players.home[0]),'Unknown');assert.ok(api.qa(g).unknown>0);
g=game();delete g.players.home[0].points;assert.equal(api.qa(g).checks[0].ok,null);
g=game();g.players.home[0].points=5;assert.equal(api.qa(g).checks[0].ok,false);
g=game();g.quarters.push([0,0]);g.players={home:roster('H',true),away:roster('A',true)};assert.equal(api.qa(g).failed,0);
assert.equal(api.factorRows({factors:[['eFG%','',40]]})[0].a,null);
assert.equal(api.insights({factors:[['eFG%',null,40]]}).length,0);
g=game();g.home='<img src=x>';g.sourceUrl='javascript:alert(1)';assert.ok(!api.render(g).includes('<img'));assert.ok(!api.render(g).includes('javascript:'));
assert.match(api.render(game()),/LOCAL|DEMO/);assert.match(api.render({...game(),_dbId:123}),/SAVED GAME/);
// A first-quarter lineup anchored by official PBP can resolve stale all-bench markers.
g=game();g.players.home.forEach(p=>p.starter=false);g.playByPlay=[];
for(const side of ['home','away'])for(const p of g.players[side])g.playByPlay.push({period:1,clock:'10:00',side,player:p.name,type:'ast',score:'0-0'});
g.playByPlay.push({period:1,clock:'09:00',side:'home',player:'H0',type:'ast',score:'0-0'});g.scoreOrder='home-away';assert.equal(api.starters(g,'home').source,'PLAY-BY-PLAY');assert.equal(api.role(g,'home',g.players.home[0]),'Starter');
console.log('Game intelligence: score QA, missing data, overtime, unknown roles, PBP starters, provenance and escaping passed.');

// A team perspective orders disadvantages before advantages and reverses wording correctly.
g=game();let home=api.insights(g,'home'),away=api.insights(g,'away');
assert.equal(home[0].key,'FTr');assert.match(home[0].finding,/H trailed/);assert.equal(home[0].signal,'REVIEW PRIORITY');
assert.match(away.find(x=>x.key==='TOV%').finding,/A trailed/);
g.players.home[0].points=20;assert.match(api.insights(g)[0].confidence,/DATA REVIEW REQUIRED/);
const output=api.printable({...game(),home:'<script>bad()</script>'},'away');
assert.ok(!output.includes('<script>'));assert.ok(!output.includes('briefExport'));assert.match(output,/Focus: A/);assert.match(output,/save it as PDF/);
assert.match(api.render(game(),'away'),/value="away" selected/);
assert.match(api.render(game()),/data-factor="TOV%"/);
