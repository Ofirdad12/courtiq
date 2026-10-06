const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('workspace-drawer-v199.js','utf8');
const css=fs.readFileSync('workspace-drawer-v199.css','utf8');

assert(index.includes('workspace-drawer-v199.js?v=199'),'v199 drawer runtime must be loaded');
assert(index.includes('workspace-drawer-v199.css?v=199'),'v199 drawer styles must be loaded');
assert(!index.includes('workspace-drawer-v197.js'),'old v197 drawer runtime must not be loaded');
assert(!index.includes('workspace-drawer-v197.css'),'old v197 drawer styles must not be loaded');
assert(js.includes("doc.addEventListener('click',onClick,true)"),'drawer must use delegated capture click handling');
assert(js.includes("target.closest('.cq-mobile-menu')"),'drawer must recognize the hamburger button');
assert(js.includes("doc.body.classList.add('cq-nav-open')"),'open must set the canonical body state');
assert(js.includes("doc.body.classList.remove('cq-nav-open')"),'close must clear the canonical body state');
assert(css.includes('body.cq-nav-open #app .side'),'CSS must open the drawer from canonical body state');
assert(css.includes('z-index:1002'),'hamburger must remain above normal workspace content');

console.log('CourtIQ v199 workspace drawer contract: OK');
