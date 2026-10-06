/* CourtIQ v200 · single workspace interaction controller.
   One delegated capture listener owns the drawer and workspace navigation.
   This intentionally replaces the competing v196 navigation runtime + v199 drawer click handlers. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='200';

  const labels={
    dashboard:'Dashboard',
    games:'Games',
    season:'Season Memory',
    scouting:'Opponent Scouting',
    reports:'Reports',
    connected:'Connected Intelligence',
    'player-memory':'Player Memory'
  };

  function targetOf(event){
    const target=event?.target;
    return target instanceof Element?target:(target?.parentElement||null);
  }

  function panel(){return doc.querySelector('#app .side');}
  function isOpen(){return doc.body.classList.contains('cq-nav-open');}

  function ensureBackdrop(){
    let node=doc.querySelector('.cq-side-backdrop');
    if(!node){
      node=doc.createElement('div');
      node.className='cq-side-backdrop';
      node.setAttribute('aria-hidden','true');
      doc.body.appendChild(node);
    }
    return node;
  }

  function ensureCloseButton(){
    const side=panel();
    if(!side)return null;
    let button=side.querySelector('.cq-side-close');
    if(!button){
      button=doc.createElement('button');
      button.type='button';
      button.className='cq-side-close';
      button.setAttribute('aria-label','Close navigation');
      button.title='Close menu';
      button.textContent='×';
      side.insertBefore(button,side.firstChild);
    }
    return button;
  }

  function syncA11y(open){
    doc.querySelectorAll('.cq-mobile-menu').forEach(button=>{
      button.setAttribute('aria-expanded',open?'true':'false');
      button.setAttribute('aria-controls','courtiq-workspace-navigation');
    });
    const side=panel();
    if(side){
      side.id='courtiq-workspace-navigation';
      side.setAttribute('aria-hidden',open?'false':'true');
    }
  }

  function openDrawer(){
    const side=panel();
    if(!side)return false;
    ensureBackdrop();ensureCloseButton();
    side.classList.add('cq-side-open');
    doc.body.classList.add('cq-nav-open');
    syncA11y(true);
    return true;
  }

  function closeDrawer(){
    panel()?.classList.remove('cq-side-open');
    doc.body.classList.remove('cq-nav-open');
    syncA11y(false);
    return true;
  }

  function toggleDrawer(){return isOpen()?closeDrawer():openDrawer();}

  function toast(message){
    let node=doc.getElementById('cq-ui-toast');
    if(!node){node=doc.createElement('div');node.id='cq-ui-toast';node.className='cq-ui-toast';doc.body.appendChild(node);}
    node.textContent=message;node.classList.add('show');
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2600);
  }

  function invoke(fn,ctx){
    if(typeof fn!=='function')return false;
    try{
      const result=fn.call(ctx||root);
      if(result&&typeof result.catch==='function')result.catch(error=>{console.error('[CourtIQ v200]',error);toast('CourtIQ could not open this view. Try once more.');});
      return true;
    }catch(error){console.error('[CourtIQ v200]',error);toast('CourtIQ could not open this view. Try once more.');return true;}
  }

  function gameTab(view){
    const tab=doc.querySelector(`#app [data-game-tab="${view}"]`);
    if(!tab)return false;
    try{root.CourtIQUIRecovery?.activateGameTab?.(tab);}catch(error){console.error('[CourtIQ v200] tab recovery',error);}
    try{tab.click();}catch(error){console.error('[CourtIQ v200] tab click',error);}
    tab.scrollIntoView?.({block:'nearest',inline:'nearest'});
    return true;
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

  function run(action){
    let handled=false;
    switch(action){
      case 'dashboard': handled=invoke(root.openPilotDashboard)||gameTab('overview')||legacyProxy(labels[action]); break;
      case 'games': handled=invoke(root.openGameLibrary)||legacyProxy(labels[action]); break;
      case 'season': handled=invoke(root.openSeasonMemory)||legacyProxy(labels[action]); break;
      case 'players': handled=invoke(root.CourtIQPlayers?.openPlayers,root.CourtIQPlayers)||gameTab('player'); break;
      case 'scouting': handled=invoke(root.openOpponentScout)||invoke(root.openTacticalWorkspace)||legacyProxy(labels[action]); break;
      case 'coach': handled=invoke(root.CourtIQV2?.openCoachDashboard,root.CourtIQV2)||invoke(root.CourtIQCoach?.open,root.CourtIQCoach)||gameTab('coach'); break;
      case 'reports': handled=invoke(root.openFullReport)||legacyProxy(labels[action]); break;
      case 'play': handled=gameTab('play'); break;
      case 'lineups': handled=gameTab('lineups'); break;
      case 'team-analytics': handled=gameTab('team'); break;
      case 'live': handled=invoke(root.CourtIQLiveBench?.open,root.CourtIQLiveBench); break;
      case 'import': handled=invoke(root.openAutoImport)||invoke(root.openUrlImport)||invoke(root.openImport); break;
      case 'connected': handled=invoke(root.openConnectedIntelligence)||legacyProxy(labels[action]); break;
      case 'player-memory': handled=invoke(root.openPlayerMemory)||legacyProxy(labels[action]); break;
      case 'account':
      case 'login': handled=invoke(root.openAccount); break;
      default: break;
    }
    if(!handled){console.warn('[CourtIQ v200] action unavailable:',action);toast('This CourtIQ view is not available yet.');}
    return handled;
  }

  function onClick(event){
    const target=targetOf(event);if(!target)return;

    if(target.closest('.cq-mobile-menu')){
      event.preventDefault();event.stopImmediatePropagation();toggleDrawer();return;
    }
    if(target.closest('.cq-side-close')||target.closest('.cq-side-backdrop')){
      event.preventDefault();event.stopImmediatePropagation();closeDrawer();return;
    }

    const actionButton=target.closest('#app .menu [data-cq-action], #app .cq-top [data-cq-action]');
    if(actionButton){
      const action=actionButton.dataset.cqAction;
      if(!action)return;
      event.preventDefault();event.stopImmediatePropagation();
      closeDrawer();run(action);return;
    }
  }

  doc.addEventListener('click',onClick,true);
  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&isOpen()){event.preventDefault();closeDrawer();}
  });

  function sync(){
    ensureBackdrop();ensureCloseButton();
    syncA11y(isOpen());
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(doc.getElementById('app')||doc.documentElement,{childList:true,subtree:true});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',sync,{once:true});else sync();

  root.CourtIQWorkspaceController={version:VERSION,run,open:openDrawer,close:closeDrawer,toggle:toggleDrawer,sync};
})(typeof window!=='undefined'?window:globalThis);
