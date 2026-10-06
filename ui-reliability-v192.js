/* CourtIQ v192 · unified UI interaction router with safe fallbacks. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='192';
  const PUBLIC_HASHES=new Set(['home','product','workflow','standards']);
  const ElementCtor=root.Element;

  const targetOf=e=>{
    const t=e?.target;
    return ElementCtor&&t instanceof ElementCtor?t:(t?.parentElement||null);
  };

  function notify(message){
    console.warn('[CourtIQ UI v192]',message);
    let toast=doc.getElementById('cq-ui-toast');
    if(!toast){toast=doc.createElement('div');toast.id='cq-ui-toast';toast.className='cq-ui-toast';doc.body.appendChild(toast);}
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer=setTimeout(()=>toast.classList.remove('show'),2600);
  }

  function invoke(object,key,...args){
    const fn=key?object?.[key]:object;
    if(typeof fn!=='function')return false;
    try{
      const result=fn.apply(key?object:root,args);
      if(result&&typeof result.catch==='function')result.catch(err=>{console.error(err);notify('This CourtIQ module could not open. Please try again.');});
      return true;
    }catch(err){
      console.error(err);
      notify('This CourtIQ module could not open. Please try again.');
      return true;
    }
  }

  function activateGameView(view){
    const button=doc.querySelector(`[data-game-tab="${view}"]`);
    if(!button)return false;
    if(root.CourtIQUIRecovery?.activateGameTab){
      try{if(root.CourtIQUIRecovery.activateGameTab(button))return true;}catch(err){console.error(err);}
    }
    try{button.click();return true;}catch(err){console.error(err);return false;}
  }

  function setMode(mode,updateHash=true){
    const app=doc.getElementById('app');
    const site=doc.getElementById('courtiq-site-shell');
    if(app)app.hidden=mode!=='workspace';
    if(site)site.hidden=mode!=='home';
    doc.body.classList.toggle('cq-public-mode',mode==='home');
    doc.body.classList.toggle('cq-workspace-mode',mode==='workspace');
    if(updateHash){
      const hash=mode==='home'?'#home':'#workspace';
      root.history.replaceState({},doc.title,root.location.pathname+root.location.search+hash);
    }
    if(mode==='workspace')requestAnimationFrame(()=>{root.CourtIQNavigation?.sync?.();root.scrollTo?.({top:0,behavior:'auto'});});
    return true;
  }

  function dispatchAction(name){
    let handled=false;
    switch(name){
      case 'login':
        setMode('workspace');handled=invoke(root,'openAccount');break;
      case 'dashboard':
        handled=invoke(root,'openPilotDashboard')||activateGameView('overview');break;
      case 'games':
        handled=invoke(root,'openGameLibrary');break;
      case 'season':
        handled=invoke(root,'openSeasonMemory');break;
      case 'players':
        handled=invoke(root.CourtIQPlayers,'openPlayers')||activateGameView('player');break;
      case 'scouting':
        handled=invoke(root,'openOpponentScout')||invoke(root,'openTacticalWorkspace');break;
      case 'coach':
        handled=invoke(root.CourtIQV2,'openCoachDashboard')||invoke(root.CourtIQCoach,'open')||activateGameView('coach');break;
      case 'reports':
        handled=invoke(root,'openFullReport');break;
      case 'live':
        setMode('workspace');handled=invoke(root.CourtIQLiveBench,'open');break;
      case 'import':
        setMode('workspace');handled=invoke(root,'openAutoImport')||invoke(root,'openUrlImport');break;
      case 'account':
        handled=invoke(root,'openAccount');break;
      case 'connected':
        handled=invoke(root,'openConnectedIntelligence');break;
      case 'player-memory':
        handled=invoke(root,'openPlayerMemory')||invoke(root.CourtIQPlayers,'openPlayers');break;
      case 'team-analytics':
        setMode('workspace');handled=activateGameView('team');break;
      case 'play':
        setMode('workspace');handled=activateGameView('play');break;
      case 'lineups':
        setMode('workspace');handled=activateGameView('lineups');break;
      default: break;
    }
    if(!handled)console.warn('[CourtIQ UI v192] action not handled:',name);
    return handled;
  }

  function ensureBackdrop(){
    let backdrop=doc.querySelector('.cq-side-backdrop');
    if(!backdrop){backdrop=doc.createElement('div');backdrop.className='cq-side-backdrop';backdrop.setAttribute('aria-hidden','true');doc.body.appendChild(backdrop);}
    return backdrop;
  }

  function setWorkspaceMenu(open){
    const side=doc.querySelector('#app .side');
    if(!side)return false;
    side.classList.toggle('cq-side-open',!!open);
    doc.body.classList.toggle('cq-nav-open',!!open);
    doc.querySelectorAll('.cq-mobile-menu').forEach(btn=>btn.setAttribute('aria-expanded',open?'true':'false'));
    ensureBackdrop();
    return true;
  }

  function setSiteMenu(open){
    const nav=doc.querySelector('#courtiq-site-shell .cq-site-nav');
    if(!nav)return false;
    nav.classList.toggle('cq-site-nav-open',!!open);
    const button=nav.querySelector('.cq-site-menu');
    if(button)button.setAttribute('aria-expanded',open?'true':'false');
    return true;
  }

  function ensureSiteMenu(){
    const nav=doc.querySelector('#courtiq-site-shell .cq-site-nav');
    if(!nav||nav.querySelector('.cq-site-menu'))return;
    const button=doc.createElement('button');
    button.type='button';button.className='cq-site-menu';button.setAttribute('aria-label','Open navigation');button.setAttribute('aria-expanded','false');
    button.innerHTML='<span></span><span></span><span></span>';
    const actions=nav.querySelector('.cq-site-actions');
    nav.insertBefore(button,actions||null);
  }

  function openPublicSection(anchor){
    const id=(anchor.getAttribute('href')||'').replace(/^#/,'');
    if(!id)return false;
    setMode('home',false);setSiteMenu(false);
    root.history.replaceState({},doc.title,root.location.pathname+root.location.search+'#'+id);
    requestAnimationFrame(()=>doc.getElementById(id)?.scrollIntoView({block:'start',behavior:'smooth'}));
    return true;
  }

  function consume(e){e.preventDefault();e.stopPropagation();}

  doc.addEventListener('click',e=>{
    const target=targetOf(e);if(!target)return;

    const mobile=target.closest('.cq-mobile-menu');
    if(mobile){const side=doc.querySelector('#app .side');if(setWorkspaceMenu(!side?.classList.contains('cq-side-open')))consume(e);return;}

    const backdrop=target.closest('.cq-side-backdrop');
    if(backdrop){if(setWorkspaceMenu(false))consume(e);return;}

    const siteMenu=target.closest('.cq-site-menu');
    if(siteMenu){const nav=siteMenu.closest('.cq-site-nav');if(setSiteMenu(!nav?.classList.contains('cq-site-nav-open')))consume(e);return;}

    const publicLink=target.closest('#courtiq-site-shell .cq-site-nav a[href^="#"]');
    if(publicLink&&openPublicSection(publicLink)){consume(e);return;}

    const route=target.closest('[data-cq-route]');
    if(route&&route.closest('#courtiq-site-shell, #app .cq-top')){
      setWorkspaceMenu(false);setSiteMenu(false);
      if(setMode(route.dataset.cqRoute==='workspace'?'workspace':'home'))consume(e);
      return;
    }

    const action=target.closest('[data-cq-action]');
    if(action&&action.closest('#courtiq-site-shell, #app .cq-side, #app .cq-top')){
      setWorkspaceMenu(false);setSiteMenu(false);
      if(dispatchAction(action.dataset.cqAction)){
        consume(e);
      }else{
        requestAnimationFrame(()=>notify('This CourtIQ view could not open. Reload once and try again.'));
      }
    }
  },true);

  doc.addEventListener('keydown',e=>{if(e.key==='Escape'){setWorkspaceMenu(false);setSiteMenu(false);}});
  root.addEventListener('resize',()=>{if(root.innerWidth>720){setWorkspaceMenu(false);setSiteMenu(false);}});
  root.addEventListener('hashchange',()=>{const hash=(root.location.hash||'').replace(/^#/,'').toLowerCase();if(PUBLIC_HASHES.has(hash)&&hash!=='home')setMode('home',false);});

  const observer=new MutationObserver(()=>requestAnimationFrame(()=>{ensureSiteMenu();ensureBackdrop();}));
  observer.observe(doc.documentElement,{childList:true,subtree:true});
  ensureSiteMenu();ensureBackdrop();
  const initialHash=(root.location.hash||'').replace(/^#/,'').toLowerCase();
  if(PUBLIC_HASHES.has(initialHash)&&initialHash!=='home')setMode('home',false);

  root.CourtIQUIReliability={version:VERSION,setMode,dispatchAction,setWorkspaceMenu,setSiteMenu,activateGameView};
})(typeof window!=='undefined'?window:globalThis);