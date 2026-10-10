/* CourtIQ v233 · coach-first workspace navigation. Routing is owned by ui-router-v194.js. */
(() => {
  'use strict';
  const VERSION='233';
  const ADVANCED_KEY='courtiq_nav_advanced_open';
  const navItem=(icon,label,action,primary=false,advanced=false)=>
    `<button type="button" class="cq-nav-item${primary?' cq-nav-primary':''}${advanced?' cq-nav-advanced':''}" data-cq-action="${action}"><span>${icon}</span><b>${label}</b></button>`;
  const advancedOpen=()=>{try{return localStorage.getItem(ADVANCED_KEY)==='1'}catch(_){return false}};
  const canonicalMenu=()=>`
    <small class="cq-nav-label">GAME PREP</small>
    ${navItem('⌂','Prep Hub','dashboard',true)}
    ${navItem('▣','Games & Quality','games')}
    ${navItem('◎','Opponent Workspace','scouting',true)}
    ${navItem('◇','Coach Brief','coach-brief',true)}
    ${navItem('▶','Video Intelligence','video-intelligence',true)}
    ${navItem('▤','Reports','reports')}
    ${navItem('◈','Season Memory','season')}
    ${navItem('+','Import Game','import')}
    <small class="cq-nav-label">GAME DAY</small>
    ${navItem('●','Live Bench','live')}
    ${navItem('½','Halftime Adjustment','halftime',true)}
    ${navItem('↺','Postgame Review','postgame')}
    <button type="button" class="cq-nav-advanced-toggle" data-cq-advanced-toggle aria-expanded="false"><span>•••</span><b>Advanced Analytics</b><i>⌄</i></button>
    <div class="cq-nav-advanced-group" hidden>
      ${navItem('◫','Team Analytics','team-analytics',false,true)}
      ${navItem('♟','Players','players',false,true)}
      ${navItem('♙','Player Intelligence','player-memory',false,true)}
      ${navItem('▶','Play-by-Play','play',false,true)}
      ${navItem('▦','Lineups','lineups',false,true)}
      ${navItem('◆','Connected Intelligence','connected',false,true)}
      ${navItem('⚙','System Health','system-health',false,true)}
    </div>`;

  function applyAdvancedState(menu,open){
    const toggle=menu.querySelector('[data-cq-advanced-toggle]'),group=menu.querySelector('.cq-nav-advanced-group');
    if(!toggle||!group)return;
    toggle.setAttribute('aria-expanded',open?'true':'false');
    group.hidden=!open;
    menu.classList.toggle('cq-advanced-open',open);
    try{localStorage.setItem(ADVANCED_KEY,open?'1':'0')}catch(_){ }
  }
  function installStyle(){
    if(document.getElementById('cqCoachFirstNavStyle'))return;
    const s=document.createElement('style');s.id='cqCoachFirstNavStyle';
    s.textContent='.cq-nav-advanced-toggle{width:100%;display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:8px;margin-top:8px;padding:10px 11px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.025);color:#8fa6bb;text-align:left;cursor:pointer}.cq-nav-advanced-toggle b{font-size:11px}.cq-nav-advanced-toggle i{font-style:normal;transition:transform .18s ease}.cq-advanced-open .cq-nav-advanced-toggle i{transform:rotate(180deg)}.cq-nav-advanced-group{display:grid;gap:2px;margin-top:4px}.cq-nav-advanced-group[hidden]{display:none!important}.cq-nav-advanced{opacity:.88}';
    document.head.appendChild(s);
  }
  let scheduled=false;
  function syncNavigation(){
    scheduled=false;installStyle();
    const menu=document.querySelector('#app .app .menu');
    if(!menu)return;
    if(menu.dataset.cqNavVersion!==VERSION){
      menu.classList.add('cq-menu');
      menu.innerHTML=canonicalMenu();
      menu.dataset.cqNavVersion=VERSION;
      applyAdvancedState(menu,advancedOpen());
    }
    menu.dataset.cqHistoryLocation='games-only';
  }
  function scheduleSync(){if(scheduled)return;scheduled=true;requestAnimationFrame(syncNavigation)}
  document.addEventListener('click',e=>{
    const toggle=e.target?.closest?.('[data-cq-advanced-toggle]');
    if(!toggle)return;
    e.preventDefault();e.stopPropagation();
    const menu=toggle.closest('.cq-menu');if(!menu)return;
    applyAdvancedState(menu,toggle.getAttribute('aria-expanded')!=='true');
  });
  const observer=new MutationObserver(scheduleSync);observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleSync,{once:true});else scheduleSync();
  window.CourtIQNavigation={sync:syncNavigation,historyLocation:'games-only',version:VERSION};
})();
