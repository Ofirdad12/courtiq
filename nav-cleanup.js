/* CourtIQ v193 · legacy-safe canonical workspace navigation + direct resilient actions. */
(() => {
  'use strict';

  const legacyItem = (icon, label, primary = false) =>
    `<div role="button" tabindex="0" class="cq-nav-item${primary ? ' cq-nav-primary' : ''}" data-cq-legacy="1"><span>${icon}</span><b>${label}</b></div>`;
  const directItem = (icon, label, action, primary = false) =>
    `<div role="button" tabindex="0" class="cq-nav-item${primary ? ' cq-nav-primary' : ''}" data-cq-direct="${action}"><span>${icon}</span><b>${label}</b></div>`;

  const canonicalMenu = () => `
    <small class="cq-nav-label">WORKSPACE</small>
    ${legacyItem('⌂','Dashboard',true)}
    ${legacyItem('▣','Games')}
    ${directItem('◫','Team Analytics','team-analytics')}
    ${directItem('♟','Players','players')}
    ${legacyItem('◈','Season Memory')}
    <small class="cq-nav-label">LIVE</small>
    ${directItem('●','Live Bench','live',true)}
    <small class="cq-nav-label">PREPARATION</small>
    ${legacyItem('◎','Opponent Scouting')}
    ${directItem('◇','Coach View','coach')}
    ${legacyItem('▤','Reports')}
    ${directItem('▶','Play-by-Play','play')}
    ${directItem('▦','Lineups','lineups')}
    <small class="cq-nav-label">DATA</small>
    ${directItem('+','Import Game','import')}
    ${legacyItem('◆','Connected Intelligence')}
    ${legacyItem('♙','Player Memory')}`;

  function closeMobileMenu(){
    document.querySelector('#app .side')?.classList.remove('cq-side-open');
    document.body.classList.remove('cq-nav-open');
  }

  function activateGameView(view){
    const button=document.querySelector(`[data-game-tab="${view}"]`);
    if(!button)return false;
    try{
      if(window.CourtIQUIRecovery?.activateGameTab?.(button))return true;
    }catch(err){console.error('[CourtIQ v193] recovery tab failed',err);}
    try{button.click();return true;}catch(err){console.error('[CourtIQ v193] tab click failed',err);return false;}
  }

  function runDirect(action){
    try{
      if(action==='live'){
        if(typeof window.CourtIQLiveBench?.open==='function'){window.CourtIQLiveBench.open();return true;}
        return false;
      }
      if(action==='players'){
        if(typeof window.CourtIQPlayers?.openPlayers==='function'){window.CourtIQPlayers.openPlayers();return true;}
        return activateGameView('player');
      }
      if(action==='coach'){
        if(typeof window.CourtIQV2?.openCoachDashboard==='function'){window.CourtIQV2.openCoachDashboard();return true;}
        if(typeof window.CourtIQCoach?.open==='function'){window.CourtIQCoach.open();return true;}
        if(typeof window.openCoachDashboard==='function'){window.openCoachDashboard();return true;}
        return activateGameView('coach');
      }
      if(action==='team-analytics')return activateGameView('team');
      if(action==='play')return activateGameView('play');
      if(action==='lineups')return activateGameView('lineups');
      if(action==='import'){
        if(typeof window.openAutoImport==='function'){window.openAutoImport();return true;}
        if(typeof window.openUrlImport==='function'){window.openUrlImport();return true;}
        const fallback=document.getElementById('importUrl')||document.getElementById('importGame');
        if(fallback){fallback.click();return true;}
        return false;
      }
    }catch(err){console.error('[CourtIQ v193] direct action failed:',action,err);}
    return false;
  }

  function bindDirect(menu){
    menu.querySelectorAll('[data-cq-direct]').forEach(item=>{
      if(item.dataset.cqBound==='1')return;
      item.dataset.cqBound='1';
      const activate=e=>{
        e?.preventDefault?.();
        e?.stopPropagation?.();
        closeMobileMenu();
        const ok=runDirect(item.dataset.cqDirect);
        if(!ok)console.warn('[CourtIQ v193] action unavailable:',item.dataset.cqDirect);
      };
      item.addEventListener('click',activate);
      item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){activate(e);}});
    });
  }

  let scheduled=false;
  function syncNavigation(){
    scheduled=false;
    const menu=document.querySelector('#app .app .menu');
    if(!menu)return;
    const expected=canonicalMenu();
    if(menu.dataset.cqNavVersion!=='193'){
      menu.classList.add('cq-menu');
      menu.innerHTML=expected;
      menu.dataset.cqNavVersion='193';
    }
    menu.dataset.cqHistoryLocation='games-only';
    bindDirect(menu);
  }

  function scheduleSync(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(syncNavigation);
  }

  const observer=new MutationObserver(scheduleSync);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleSync,{once:true});else scheduleSync();

  window.CourtIQNavigation={sync:syncNavigation,historyLocation:'games-only',version:'193',runDirect,activateGameView};
})();