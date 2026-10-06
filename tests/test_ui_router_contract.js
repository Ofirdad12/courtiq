const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const nav=fs.readFileSync('nav-cleanup.js','utf8');
const runtime=fs.readFileSync('nav-runtime-v196.js','utf8');
const drawer=fs.readFileSync('workspace-drawer-v197.js','utf8');
const drawerCss=fs.readFileSync('workspace-drawer-v197.css','utf8');

assert(index.includes('nav-runtime-v196.js?v=196'),'direct navigation runtime must be loaded');
assert(index.includes('workspace-drawer-v197.css?v=197'),'v197 drawer styles must be loaded');
assert(index.includes('workspace-drawer-v197.js?v=197'),'v197 drawer controller must be loaded');
assert(!index.includes('ui-reliability-v192.js'),'capture-phase v192 router must stay removed');
assert(index.indexOf('saas-shell.js?v=189') < index.indexOf('nav-runtime-v196.js?v=196'),'direct runtime must load after shell markup creation');
assert(index.indexOf('nav-runtime-v196.js?v=196') < index.indexOf('workspace-drawer-v197.js?v=197'),'drawer controller must load after navigation runtime');

assert(nav.includes('<button type="button"'),'workspace navigation must use real buttons');
assert(nav.includes('data-cq-action'),'workspace navigation must expose action names');

assert(runtime.includes("button.addEventListener('click'"),'navigation buttons must own a direct click handler');
assert(runtime.includes('stopImmediatePropagation'),'navigation runtime must block competing document handlers after taking ownership');
assert(runtime.includes("if(action==='live')"),'live navigation action must exist');
assert(runtime.includes("if(action==='coach')"),'coach navigation action must exist');
assert(runtime.includes("if(action==='players')"),'players navigation action must exist');

assert(drawer.includes('cq-side-close'),'drawer must inject an explicit close control');
assert(drawer.includes("doc.querySelectorAll('.cq-mobile-menu')"),'drawer must bind the persistent menu opener');
assert(drawer.includes("doc.body.classList.add('cq-nav-open')"),'drawer open state must control the backdrop');
assert(drawer.includes("doc.body.classList.remove('cq-nav-open')"),'drawer close state must clear the backdrop');
assert(drawer.includes("event.key==='Escape'"),'Escape must close the drawer');

assert(drawerCss.includes('grid-template-columns:minmax(0,1fr)!important'),'closed drawer must return workspace to full width');
assert(drawerCss.includes('transform:translateX(-104%)!important'),'drawer must be off-canvas while closed');
assert(drawerCss.includes('.cq-side-close'),'close control must be visibly styled');
assert(drawerCss.includes('body.cq-nav-open .cq-side-backdrop'),'open drawer must show an outside-click backdrop');

console.log('CourtIQ v197 navigation drawer contract: OK');
