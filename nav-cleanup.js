/* CourtIQ v194 · canonical workspace navigation. Routing is owned only by ui-router-v194.js. */
(() => {
  'use strict';

  const navItem=(icon,label,action,primary=false)=>
    `<button type="button" class="cq-nav-item${primary?' cq-nav-primary':''}" data-cq-action="${action}"><span>${icon}</span><b>${label}</b></button>`;

  const canonicalMenu=()=>`
    <small class="cq-nav-label">WORKSPACE</small>
    ${navItem('⌂','Dashboard','dashboard',true)}
    ${navItem('▣','Games','games')}
    ${navItem('◫','Team Analytics','team-analytics')}
    ${navItem('♟','Players','players')}
    ${navItem('◈','Season Memory','season')}
    <small class="cq-nav-label">LIVE</small>
    ${navItem('●','Live Bench','live',true)}
    <small class="cq-nav-label">PREPARATION</small>
    ${navItem('◎','Opponent Scouting','scouting')}
    ${navItem('◇','Coach View','coach')}
    ${navItem('▤','Reports','reports')}
    ${navItem('▶','Play-by-Play','play')}
    ${navItem('▦','Lineups','lineups')}
    <small class="cq-nav-label">DATA</small>
    ${navItem('+','Import Game','import')}
    ${navItem('◆','Connected Intelligence','connected')}
    ${navItem('♙','Player Memory','player-memory')}`;

  let scheduled=false;
  function syncNavigation(){
    scheduled=false;
    const menu=document.querySelector('#app .app .menu');
    if(!menu)return;
    if(menu.dataset.cqNavVersion!=='194'){
      menu.classList.add('cq-menu');
      menu.innerHTML=canonicalMenu();
      menu.dataset.cqNavVersion='194';
    }
    menu.dataset.cqHistoryLocation='games-only';
  }

  function scheduleSync(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(syncNavigation);
  }

  const observer=new MutationObserver(scheduleSync);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleSync,{once:true});
  else scheduleSync();

  window.CourtIQNavigation={sync:syncNavigation,historyLocation:'games-only',version:'194'};
})();
