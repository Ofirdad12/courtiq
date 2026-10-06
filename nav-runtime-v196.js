/* CourtIQ v196 · direct workspace navigation runtime.
   Each menu button owns its click before document-level legacy/shell routers can compete. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='196';

  const legacyLabels={
    dashboard:'Dashboard',
    games:'Games',
    season:'Season Memory',
    scouting:'Opponent Scouting',
    reports:'Reports',
    connected:'Connected Intelligence',
    'player-memory':'Player Memory'
  };

  function closeMobile(){
    doc.querySelector('#app .side')?.classList.remove('cq-side-open');
    doc.body.classList.remove('cq-nav-open');
    doc.querySelectorAll('.cq-mobile-menu').forEach(btn=>btn.setAttribute('aria-expanded','false'));
  }

  function legacyProxy(label){
    const menu=doc.querySelector('#app .app .menu');
    if(!menu||!label)return false;
    const proxy=doc.createElement('div');
    proxy.textContent=label;
    proxy.setAttribute('aria-hidden','true');
    proxy.style.cssText='position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;';
    menu.appendChild(proxy);
    proxy.click();
    proxy.remove();
    return true;
  }

  function gameTab(view){
    const tab=doc.querySelector(`[data-game-tab="${view}"]`);
    if(!tab)return false;
    try{root.CourtIQUIRecovery?.activateGameTab?.(tab);}catch(err){console.error('[CourtIQ v196] recovery failed',view,err);}
    tab.click();
    tab.scrollIntoView?.({block:'nearest',inline:'nearest'});
    return true;
  }

  function run(action){
    try{
      if(legacyLabels[action])return legacyProxy(legacyLabels[action]);
      if(action==='team-analytics')return gameTab('team');
      if(action==='play')return gameTab('play');
      if(action==='lineups')return gameTab('lineups');
      if(action==='players'){
        if(typeof root.CourtIQPlayers?.openPlayers==='function'){root.CourtIQPlayers.openPlayers();return true;}
        return gameTab('player');
      }
      if(action==='coach'){
        if(typeof root.CourtIQV2?.openCoachDashboard==='function'){root.CourtIQV2.openCoachDashboard();return true;}
        if(typeof root.CourtIQCoach?.open==='function'){root.CourtIQCoach.open();return true;}
        return gameTab('coach');
      }
      if(action==='live'){
        if(typeof root.CourtIQLiveBench?.open==='function'){root.CourtIQLiveBench.open();return true;}
        return false;
      }
      if(action==='import'){
        const trigger=doc.getElementById('importUrl')||doc.getElementById('importGame')||doc.querySelector('.importBtn');
        if(trigger){trigger.click();return true;}
        return false;
      }
      if(action==='account'||action==='login'){
        const quote=doc.querySelector('#app .quote button');
        if(quote&&quote.dataset.cqAction!==action){quote.click();return true;}
        return false;
      }
    }catch(err){console.error('[CourtIQ v196] navigation action failed',action,err);}
    return false;
  }

  function bind(button){
    if(!button||button.dataset.cqRuntime==='196')return;
    button.dataset.cqRuntime='196';
    button.style.pointerEvents='auto';
    button.addEventListener('click',event=>{
      const action=button.dataset.cqAction;
      if(!action)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMobile();
      const handled=run(action);
      if(!handled)console.warn('[CourtIQ v196] action unavailable:',action);
    },true);
    button.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      event.preventDefault();
      button.click();
    });
  }

  function bindAll(){
    doc.querySelectorAll('#app .menu [data-cq-action]').forEach(bind);
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(bindAll));
  observer.observe(doc.getElementById('app')||doc.documentElement,{childList:true,subtree:true});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',bindAll,{once:true});
  else bindAll();

  root.CourtIQNavRuntime={version:VERSION,run,bindAll};
})(typeof window!=='undefined'?window:globalThis);
