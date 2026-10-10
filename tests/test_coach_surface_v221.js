const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('coach-surface-v221.js','utf8');
const sandbox={console,window:{},document:undefined};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const {surfacePlan}=sandbox.window.CourtIQCoachSurface.Core;
function ok(v,m){if(!v)throw new Error(m)}
let p=surfacePlan(['coachBriefFlow','seasonMemoryFlow','unknown']);
ok(p.primary==='coachPrepSurface','GAME PREP must remain primary');
ok(p.secondary.length===2,'only known secondary coach modules should be grouped');
ok(p.secondary.includes('coachBriefFlow')&&p.secondary.includes('seasonMemoryFlow'),'coach modules missing from MORE grouping');
p=surfacePlan(['planUsageFlow','launchReadinessFlow','scoutingReportFlow']);
ok(p.secondary.length===3,'admin/scouting modules should stay reachable under MORE');
console.log('coach-surface-v221 tests passed');
