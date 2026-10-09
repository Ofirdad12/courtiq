const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('report-library-v219.js','utf8');
const sandbox={console,setTimeout,clearTimeout,window:{},document:undefined,localStorage:{getItem(){return null}}};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const {snapshot,normalize}=sandbox.window.CourtIQReportLibrary.Core;
function ok(v,m){if(!v)throw new Error(m)}
const game=normalize({id:42,external_id:'x1',competition:'League',game_date:'2026-10-01',home_team:'A',away_team:'B',payload:{ui:{home:'A',away:'B',comp:'League'},raw:{home:{points:80},away:{points:70}}}});
ok(game&&game._dbId===42&&game.home==='A','normalize must preserve db id and team identity');
const model={team:'A',games:[game,{...game,_dbId:43,id:'x2'}],rows:[{},{}],confidence:{level:'HIGH'},tendencies:[{title:'x'}],decisions:[{title:'y'}],live:[],players:[],trend:{ready:true},sources:[]};
const row=snapshot(model,'<html>snapshot</html>');
ok(row.report_type==='coach_brief','wrong report type');
ok(row.sample_game_ids.length===2&&row.sample_game_ids[0]===42&&row.sample_game_ids[1]===43,'sample ids incorrect');
ok(row.sample_games===2&&row.confidence==='HIGH','sample/confidence incorrect');
ok(row.payload.html.includes('snapshot')&&row.payload.summary.team==='A','snapshot payload must preserve rendered evidence');
console.log('report-library-v219 tests passed');
