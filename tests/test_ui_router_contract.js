const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const nav=fs.readFileSync('nav-cleanup.js','utf8');
const controller=fs.readFileSync('workspace-controller-v201.js','utf8');
const drawerCss=fs.readFileSync('workspace-drawer-v199.css','utf8');

assert(index.includes('workspace-controller-v201.js?v=201'),'direct v201 workspace controller must be loaded');
assert(index.includes('workspace-drawer-v199.css?v=201'),'drawer styles must be cache-busted with v201');
assert(!index.includes('workspace-controller-v200.js'),'v200 global capture controller must stay removed');
assert(!index.includes('nav-runtime-v196.js'),'competing v196 navigation runtime must stay removed');
assert(!index.includes('workspace-drawer-v199.js'),'competing v199 drawer click runtime must stay removed');
assert(!index.includes('workspace-drawer-v197.js'),'old v197 drawer runtime must stay removed');
assert(!index.includes('ui-reliability-v192.js'),'capture-phase v192 router must stay removed');
assert(index.indexOf('saas-shell.js?v=201') < index.indexOf('workspace-controller-v201.js?v=201'),'v201 controller must load after shell markup creation');
assert(index.indexOf('live-bench-entry-v198.js?v=201') < index.indexOf('workspace-controller-v201.js?v=201'),'v201 controller must load last among workspace interaction layers');

assert(nav.includes('<button type="button"'),'workspace navigation must use real buttons');
assert(nav.includes('data-cq-action'),'workspace navigation must expose action names');

assert(!controller.includes("doc.addEventListener('click'"),'workspace controller must not use a global click router');
assert(controller.includes('button.onclick=function(event)'),'workspace controller must own direct control handlers');
assert(controller.includes('stopImmediatePropagation'),'direct control handlers must block legacy bubbling after ownership');
assert(controller.includes("case 'live':"),'live navigation action must exist');
assert(controller.includes("case 'coach':"),'coach navigation action must exist');
assert(controller.includes("case 'players':"),'players navigation action must exist');
assert(controller.includes('cq-side-close'),'controller must inject an explicit close control');
assert(controller.includes("doc.querySelectorAll('.cq-mobile-menu').forEach(bindMobile)"),'controller must bind the menu opener directly');
assert(controller.includes("doc.body.classList.add('cq-nav-open')"),'drawer open state must control the backdrop');
assert(controller.includes("doc.body.classList.remove('cq-nav-open')"),'drawer close state must clear the backdrop');
assert(controller.includes("event.key==='Escape'"),'Escape must close the drawer');

assert(drawerCss.includes('grid-template-columns:minmax(0,1fr)!important'),'closed drawer must return workspace to full width');
assert(drawerCss.includes('translate3d(-105%,0,0)!important'),'drawer must be off-canvas while closed');
assert(drawerCss.includes('.cq-side-close'),'close control must be visibly styled');
assert(drawerCss.includes('body.cq-nav-open .cq-side-backdrop'),'open drawer must show an outside-click backdrop');
assert(drawerCss.includes('body.cq-nav-open #app .side'),'canonical body state must physically open the drawer');

console.log('CourtIQ v201 direct workspace navigation contract: OK');
