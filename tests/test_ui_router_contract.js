const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const nav=fs.readFileSync('nav-cleanup.js','utf8');
const router=fs.readFileSync('ui-router-v194.js','utf8');
const bridge=fs.readFileSync('app-actions-v194.js','utf8');

assert(index.includes('app-actions-v194.js?v=194'),'v194 action bridge must be loaded');
assert(index.includes('ui-router-v194.js?v=194'),'v194 UI router must be loaded');
assert(!index.includes('ui-reliability-v192.js'),'capture-phase v192 router must stay removed');
assert(index.indexOf('app.js?v=189') < index.indexOf('app-actions-v194.js?v=194'),'bridge must load after the legacy app');
assert(index.indexOf('app-actions-v194.js?v=194') < index.indexOf('ui-router-v194.js?v=194'),'bridge must load before router');
assert(index.indexOf('ui-router-v194.js?v=194') < index.indexOf('saas-shell.js?v=189'),'router must register before saas-shell click handlers');

assert(nav.includes('<button type="button"'),'workspace navigation must use real buttons');
assert(nav.includes('data-cq-action'),'workspace navigation must use the unified action contract');
assert(!nav.includes('data-cq-direct'),'old direct-binding contract must stay removed');
assert(!nav.includes('addEventListener(\'click\''),'nav builder must not own click routing');

assert(router.includes("doc.addEventListener('click',onClick);"),'router must use delegated bubble-phase click handling');
assert(!router.includes("doc.addEventListener('click',onClick,true"),'router must not use capture-phase click interception');
assert(router.includes('stopImmediatePropagation'),'router must stop later competing document handlers only after handling an action');

for(const action of ['dashboard','games','team-analytics','players','season','live','scouting','coach','reports','play','lineups','import','connected','player-memory','account']){
  assert(bridge.includes(`name==='${action}'`),`missing bridge action: ${action}`);
}

console.log('CourtIQ v194 UI router contract: OK');
