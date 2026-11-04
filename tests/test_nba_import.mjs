import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {nbaIdentity,minutesValue,parseNbaGame,fetchNba} from '../supabase/functions/import-nba-game/parser.mjs';
const sample=JSON.parse(fs.readFileSync(new URL('./fixtures/nba-0042400407.json',import.meta.url))).game;
const url='https://www.nba.com/game/ind-vs-okc-0042400407/box-score';
for(const suffix of ['', '/box-score','/summary','/play-by-play','/game-charts?x=1'])assert.equal(nbaIdentity('https://www.nba.com/game/ind-vs-okc-0042400407'+suffix).externalId,sample.gameId);
for(const bad of ['https://www.nba.com/','https://evil.test/game/0042400407','https://nba.com.evil.test/game/0042400407','https://nba.com/game/0042400407/anything','https://nba.com:444/game/0042400407','https://nba.com/game/1042400407'])assert.throws(()=>nbaIdentity(bad));
assert.equal(minutesValue('38:12'),38.2);assert.equal(minutesValue('PT38M12.00S'),38.2);assert.throws(()=>minutesValue('bad'));
const p=parseNbaGame(sample,sample.gameId,url);
assert.equal(p.ui.hs,103);assert.equal(p.ui.as,91);assert.equal(p.ui.players.home.find(x=>x.id==='1628983').points,29);
assert.equal(p.ui.players.away.find(x=>x.name==='James Johnson').has_played,false);
assert.equal(p.ui.gameMinutes,48);assert.equal(p.ui.calculated.home.pace,p.ui.calculated.away.pace);
assert.equal(p.ui.calculated.home.possessions,90.68);assert.equal(p.ui.calculated.away.possessions,89.1);
for(const change of [g=>g.gameId='wrong',g=>g.gameStatus=2,g=>g.homeTeam.score++,g=>delete g.homeTeam.statistics.assists,g=>g.homeTeam.players[0].statistics.points++,g=>g.homeTeam.periods[0].score++]){const g=structuredClone(sample);change(g);assert.throws(()=>parseNbaGame(g,sample.gameId,url));}
// Synthetic overtime fixture: extend duration while leaving the scoring data fixed.
const ot=structuredClone(sample);ot.period=5;
for(const team of [ot.homeTeam,ot.awayTeam]){team.periods.push({period:5,score:0});team.statistics.minutes='265:00';team.players[0].statistics.minutes=String(Number(team.players[0].statistics.minutes.split(':')[0])+25)+':'+team.players[0].statistics.minutes.split(':')[1];}
const overtime=parseNbaGame(ot,ot.gameId,url).ui;
assert.equal(overtime.gameMinutes,53);assert.equal(overtime.gamePace,81.4);
const ctx={window:{addEventListener(){}},setTimeout(){},URL,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('team-possessions-v248.js','utf8'),ctx);
ctx.window.CourtIQTeamPossessions.applyToGame(overtime);assert.equal(overtime.gamePace,81.4);
const fiba={...structuredClone(overtime),provider:'FIBA',regulationMinutes:40};ctx.window.CourtIQTeamPossessions.applyToGame(fiba);assert.equal(fiba.gamePace,79.9);
vm.runInContext(fs.readFileSync('possession-semantics-v256.js','utf8'),ctx);ctx.window.CourtIQPossessionSemantics.apply(overtime);assert.equal(overtime.gamePace,81.4);assert.match(overtime.formulaCatalog.possession_semantics.pace,/48/);
vm.runInContext(fs.readFileSync('import-database-first-v244.js','utf8'),ctx);
const bridge=ctx.window.CourtIQImportDatabaseFirstV244;assert.equal(bridge.identityFromUrl(url).provider,'NBA');assert.equal(bridge.importerFunctionForUrl(url),'import-nba-game');assert.equal(bridge.importerFunctionForUrl('https://ibasketball.co.il/match/123/'),'import-ibba-game-v2');
let requests=0;
const fallback=await fetchNba(nbaIdentity(url),async()=>{requests++;return requests===1?new Response('',{status:403}):Response.json({game:sample});});assert.equal(requests,2);assert.equal(fallback.route,'nba_live_json');
const fromPage=await fetchNba(nbaIdentity(url),async()=>new Response('<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{game:sample}}})+'</script>'));assert.equal(fromPage.route,'nba_game_page');
console.log('PASS: NBA official fixture, identities, invalid data, DNP, minutes, overtime, shared Pace, FIBA regression, routing, fallback');
