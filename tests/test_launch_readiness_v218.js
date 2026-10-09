const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('launch-readiness-v218.js','utf8');
const sandbox={console,setTimeout,clearTimeout,window:{},document:undefined};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const {readiness,nextAction,demoSteps}=sandbox.window.CourtIQLaunchReadiness.Core;
function ok(v,m){if(!v)throw new Error(m)}
let m=readiness({checks:{secureWorkspace:true},counts:{games:0,reports:0,roster:0}});
ok(m.score===10&&m.stage==='SETUP','empty workspace readiness incorrect');
ok(nextAction(m).target==='scoutingReportFlow','empty workspace must route to scouting import flow');
m=readiness({checks:{secureWorkspace:true,realGameImported:true,importValidated:true,rosterLoaded:true,reportPersisted:false},counts:{games:3,reports:0,roster:10}});
ok(m.score===90&&m.stage==='PILOT READY','3-game validated workspace should be pilot ready by weighted score');
ok(nextAction(m).target==='coachBriefFlow','missing report should route to Coach Brief');
const steps=demoSteps(m);ok(steps.length===3&&steps[0].ready&&steps[1].ready&&steps[2].ready,'demo flow readiness incorrect');
m=readiness({checks:{secureWorkspace:true,realGameImported:true,importValidated:false},counts:{games:1,reports:0,roster:0}});
ok(nextAction(m).title==='Fix import quality','validation failure must take priority');
console.log('launch-readiness-v218 tests passed');
