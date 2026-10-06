const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const controller=fs.readFileSync('workspace-controller-v201.js','utf8');

assert(index.includes('workspace-controller-v201.js?v=201'),'v201 controller must be loaded');
assert(!index.includes('workspace-controller-v200.js'),'v200 global click controller must not be loaded');
assert(!index.includes('nav-runtime-v196.js'),'legacy v196 nav runtime must not be loaded');
assert(!index.includes('workspace-drawer-v199.js'),'legacy v199 drawer click runtime must not be loaded');
assert(!controller.includes("doc.addEventListener('click'"),'v201 must not own a global document click router');
assert(controller.includes('button.onclick=function(event)'),'v201 must bind controls directly');
assert(controller.includes("doc.querySelectorAll('[data-cq-action]').forEach(bindAction)"),'all actions must receive direct handlers');
assert(controller.includes("doc.querySelectorAll('.cq-mobile-menu').forEach(bindMobile)"),'mobile menu must receive a direct handler');
assert(controller.includes("doc.querySelectorAll('[data-cq-route]').forEach(bindRoute)"),'route controls must receive direct handlers');
assert(controller.includes('event?.stopPropagation?.()'),'direct handlers must prevent legacy bubbling routers');
assert(controller.includes("case 'games': handled=invoke(root.openGameLibrary)"),'Games must route directly');
assert(controller.includes("case 'live': handled=invoke(root.CourtIQLiveBench?.open"),'Live Bench must route directly');
assert(controller.includes("case 'team-analytics': handled=gameTab('team')"),'Team Analytics must route to team tab');
assert(controller.includes("case 'lineups': handled=gameTab('lineups')"),'Lineups must route to lineups tab');
console.log('workspace controller v201 contract: ok');
