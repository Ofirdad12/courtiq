/* CourtIQ v191 · resilient delegated game-tab routing after dynamic re-renders. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='191';

  function appScope(node){
    return node?.closest?.('#app .app')||doc.querySelector('#app .app')||doc.getElementById('app')||doc;
  }

  function activateGameTab(button){
    const view=button?.dataset?.gameTab;
    if(!view)return false;
    const scope=appScope(button);
    const panels=[...scope.querySelectorAll('[data-game-view]')];
    if(!panels.length)return false;

    let matching=0;
    panels.forEach(panel=>{
      const show=panel.dataset.gameView===view;
      panel.hidden=!show;
      if(show)matching++;
    });
    scope.querySelectorAll('[data-game-tab]').forEach(tab=>{
      const active=tab.dataset.gameTab===view;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',active?'true':'false');
    });

    if(!matching){
      console.warn('[CourtIQ v191] No panel found for game tab:',view);
      return false;
    }
    return true;
  }

  function audit(){
    const tabs=[...doc.querySelectorAll('#app [data-game-tab]')];
    const views=new Set([...doc.querySelectorAll('#app [data-game-view]')].map(x=>x.dataset.gameView));
    const missing=tabs.map(x=>x.dataset.gameTab).filter(Boolean).filter(view=>!views.has(view));
    const result={version:VERSION,tabs:tabs.length,views:views.size,missing:[...new Set(missing)]};
    if(result.missing.length)console.warn('[CourtIQ v191] navigation audit:',result);
    return result;
  }

  doc.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:event.target?.parentElement;
    const tab=target?.closest?.('[data-game-tab]');
    if(!tab||!tab.closest('#app'))return;
    activateGameTab(tab);
  },true);

  doc.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const target=event.target instanceof Element?event.target:null;
    const tab=target?.closest?.('[data-game-tab]');
    if(!tab||!tab.closest('#app'))return;
    if(activateGameTab(tab))event.preventDefault();
  });

  const observer=new MutationObserver(()=>{
    clearTimeout(observer.timer);
    observer.timer=setTimeout(audit,0);
  });
  observer.observe(doc.getElementById('app')||doc.documentElement,{childList:true,subtree:true});

  root.CourtIQUIRecovery={version:VERSION,activateGameTab,audit};
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',audit,{once:true});else audit();
})(typeof window!=='undefined'?window:globalThis);
