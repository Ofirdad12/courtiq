/* CourtIQ v201 · direct resilient workspace controls.
   No document-level click router. Every actionable control owns its click handler.
   This prevents competing capture/bubble routers from swallowing mobile and workspace clicks. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='201';

  const labels={
    dashboard:'Dashboard',games:'Games',season:'Season Memory',scouting:'Opponent Scouting',
    reports:'Reports',connected:'Connected Intelligence','player-memory':'Player Memory'
  };

  function toast(message){
    let node=doc.getElementById('cq-ui-toast');
    if(!node){node=doc.createElement('div');node.id='cq-ui-toast';node.className='cq-ui-toast';doc.body.appendChild(node);}
    node.textContent=message;node.classList.add('show');
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2600);
  }

  function panel(){return doc.querySelector('#app .side');}
  function isOpen(){return doc.body.classList.contains('cq-nav-open');}

  function ensureBackdrop(){
    let node=doc.querySelector('.cq-side-backdrop');
    if(!node){node=doc.createElement('div');node.className='cq-side-backdrop';node.setAttribute('aria-hidden','true');doc.body.appendChild(node);}
    bindBackdrop(node);return node;
  }

  function ensureCloseButton(){
    const side=panel();if(!side)return null;
    let button=side.querySelector('.cq-side-close');
    if(!button){
      button=doc.createElement('button');button.type='button';button.className='cq-side-close';
      button.setAttribute('aria-label','Close navigation');button.title='Close menu';button.textContent='×';
      side.insertBefore(button,side.firstChild);
    }
    bindClose(button);return button;
  }

  function syncA11y(open){
    doc.querySelectorAll('.cq-mobile-menu').forEach(button=>{
      button.setAttribute('aria-expanded',open?'true':'false');
      button.setAttribute('aria-controls','courtiq-workspace-navigation');
    });
    const side=panel();
    if(side){side.id='courtiq-workspace-navigation';side.setAttribute('aria-hidden',open?'false':'true');}
  }

  function openDrawer(){
    const side=panel();if(!side)return false;
    ensureBackdrop();ensureCloseButton();
    side.classList.add('cq-side-open');doc.body.classList.add('cq-nav-open');syncA11y(true);return true;
  }
  function closeDrawer(){
    panel()?.classList.remove('cq-side-open');doc.body.classList.remove('cq-nav-open');syncA11y(false);return true;
  }
  function toggleDrawer(){return isOpen()?closeDrawer():openDrawer();}

  function setMode(mode){
    const app=doc.getElementById('app'),site=doc.getElementById('courtiq-site-shell');
    if(app)app.hidden=mode!=='workspace';
    if(site)site.hidden=mode!=='home';
    doc.body.classList.toggle('cq-public-mode',mode==='home');
    doc.body.classList.toggle('cq-workspace-mode',mode==='workspace');
    try{root.history.replaceState({},doc.title,root.location.pathname+root.location.search+(mode==='home'?'#home':'#workspace'));}catch(_){}
    if(mode==='workspace'){
      requestAnimationFrame(()=>{root.CourtIQNavigation?.sync?.();bindAll();root.scrollTo?.({top:0,behavior:'auto'});});
    }else closeDrawer();
    return true;
  }

  function invoke(fn,ctx){
    if(typeof fn!=='function')return false;
    try{
      const result=fn.call(ctx||root);
      if(result&&typeof result.catch==='function')result.catch(error=>{console.error('[CourtIQ v201]',error);toast('CourtIQ could not open this view.');});
      return true;
    }catch(error){console.error('[CourtIQ v201]',error);toast('CourtIQ could not open this view.');return true;}
  }

  function gameTab(view){
    const tab=doc.querySelector(`#app [data-game-tab="${view}"]`);if(!tab)return false;
    try{root.CourtIQUIRecovery?.activateGameTab?.(tab);}catch(error){console.error('[CourtIQ v201] tab recovery',error);}
    if(typeof tab.onclick==='function'){try{tab.onclick.call(tab,new MouseEvent('click',{bubbles:false,cancelable:true}));}catch(error){console.error('[CourtIQ v201] tab handler',error);}}
    else try{tab.click();}catch(error){console.error('[CourtIQ v201] tab click',error);}
    tab.scrollIntoView?.({block:'nearest',inline:'nearest'});return true;
  }

  function legacyProxy(label){
    const menu=doc.querySelector('#app .app .menu');if(!menu||!label)return false;
    const proxy=doc.createElement('div');proxy.textContent=label;proxy.setAttribute('aria-hidden','true');
    proxy.style.cssText='position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;';
    menu.appendChild(proxy);proxy.click();proxy.remove();return true;
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
      case 'import': setMode('workspace');handled=invoke(root.openAutoImport)||invoke(root.openUrlImport)||invoke(root.openImport); break;
      case 'connected': handled=invoke(root.openConnectedIntelligence)||legacyProxy(labels[action]); break;
      case 'player-memory': handled=invoke(root.openPlayerMemory)||legacyProxy(labels[action]); break;
      case 'account': handled=invoke(root.openAccount); break;
      case 'login': setMode('workspace');handled=invoke(root.openAccount); break;
      default: break;
    }
    if(!handled){console.warn('[CourtIQ v201] action unavailable:',action);toast('This CourtIQ view is not available.');}
    return handled;
  }

  function own(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
  }

  function bindAction(button){
    if(!button||button.dataset.cqDirect==='201')return;
    button.dataset.cqDirect='201';button.style.pointerEvents='auto';
    button.onclick=function(event){
      own(event);const action=button.dataset.cqAction;if(!action)return false;
      closeDrawer();run(action);return false;
    };
  }

  function bindRoute(button){
    if(!button||button.dataset.cqRouteDirect==='201')return;
    button.dataset.cqRouteDirect='201';button.style.pointerEvents='auto';
    button.onclick=function(event){own(event);setMode(button.dataset.cqRoute==='workspace'?'workspace':'home');return false;};
  }

  function bindMobile(button){
    if(!button||button.dataset.cqMenuDirect==='201')return;
    button.dataset.cqMenuDirect='201';button.style.pointerEvents='auto';
    button.onclick=function(event){own(event);toggleDrawer();return false;};
  }

  function bindClose(button){
    if(!button||button.dataset.cqCloseDirect==='201')return;
    button.dataset.cqCloseDirect='201';button.style.pointerEvents='auto';
    button.onclick=function(event){own(event);closeDrawer();return false;};
  }

  function bindBackdrop(node){
    if(!node||node.dataset.cqBackdropDirect==='201')return;
    node.dataset.cqBackdropDirect='201';
    node.onclick=function(event){own(event);closeDrawer();return false;};
  }

  function bindAll(){
    doc.querySelectorAll('[data-cq-route]').forEach(bindRoute);
    doc.querySelectorAll('[data-cq-action]').forEach(bindAction);
    doc.querySelectorAll('.cq-mobile-menu').forEach(bindMobile);
    doc.querySelectorAll('.cq-side-close').forEach(bindClose);
    ensureBackdrop();ensureCloseButton();syncA11y(isOpen());
  }

  doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();closeDrawer();}});
  const observer=new MutationObserver(()=>{clearTimeout(observer.timer);observer.timer=setTimeout(bindAll,0);});
  observer.observe(doc.documentElement,{childList:true,subtree:true});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',bindAll,{once:true});else bindAll();

  root.CourtIQWorkspaceController={version:VERSION,run,setMode,open:openDrawer,close:closeDrawer,toggle:toggleDrawer,bindAll};
})(typeof window!=='undefined'?window:globalThis);
