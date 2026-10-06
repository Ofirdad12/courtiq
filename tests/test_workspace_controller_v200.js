const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const controller=fs.readFileSync('workspace-controller-v200.js','utf8');

assert(index.includes('workspace-controller-v200.js?v=200'),'v200 controller must be loaded');
assert(!index.includes('nav-runtime-v196.js'),'legacy v196 nav runtime must not be loaded');
assert(!index.includes('workspace-drawer-v199.js'),'legacy v199 drawer click runtime must not be loaded');
assert(controller.includes("doc.addEventListener('click',onClick,true)"),'controller must own one delegated capture click listener');
assert(controller.includes("case 'games': handled=invoke(root.openGameLibrary)"),'Games must route directly');
assert(controller.includes("case 'live': handled=invoke(root.CourtIQLiveBench?.open"),'Live Bench must route directly');
assert(controller.includes("case 'team-analytics': handled=gameTab('team')"),'Team Analytics must route to team tab');
assert(controller.includes("case 'lineups': handled=gameTab('lineups')"),'Lineups must route to lineups tab');
console.log('workspace controller v200 contract: ok');
