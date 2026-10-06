/* CourtIQ v189 · UI reliability layer: navigation, mobile menus, action fallbacks and public-section routing. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='189';
  const PUBLIC_HASHES=new Set(['home','product','workflow','standards']);

  const targetOf=e=>{
    const t=e?.target;
    return t instanceof Element?t:(t?.parentElement||null);
  };

  function notify(message){
    console.warn('[CourtIQ UI]',message);
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
    }catch(err){console.error(err);notify('This CourtIQ module could not open. Please try again.');return true;}
  }

  function clickGameTab(view){
    const button=doc.querySelector(`[data-game-tab="${view}"]`);
    if(!button)return false;
    button.click();
    return true;
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
    if(mode==='workspace'){
      requestAnimationFrame(()=>{root.CourtIQNavigation?.sync?.();root.scrollTo?.({top:0,behavior:'auto'});});
    }
  }

  function dispatchAction(name){
    let handled=false;
    switch(name){
      case 'login':
        setMode('workspace');handled=invoke(root,'openAccount');break;
      case 'dashboard':
        handled=invoke(root,'openPilotDashboard')||clickGameTab('overview');break;
      case 'games':
        handled=invoke(root,'openGameLibrary');break;
      case 'season':
        handled=invoke(root,'openSeasonMemory');break;
      case 'players':
        handled=invoke(root.CourtIQPlayers,'openPlayers')||clickGameTab('player');break;
      case 'scouting':
        handled=invoke(root,'openOpponentScout')||invoke(root,'openTacticalWorkspace');break;
      case 'coach':
        handled=invoke(root.CourtIQV2,'openCoachDashboard')||invoke(root.CourtIQCoach,'open')||clickGameTab('coach');break;
      case 'reports':
        handled=invoke(root,'openFullReport');break;
      case 'import':
        setMode('workspace');handled=invoke(root,'openAutoImport')||invoke(root,'openUrlImport');break;
      case 'account':
        handled=invoke(root,'openAccount');break;
      case 'connected':
        handled=invoke(root,'openConnectedIntelligence');break;
      case 'player-memory':
        handled=invoke(root,'openPlayerMemory')||invoke(root.CourtIQPlayers,'openPlayers');break;
      case 'team-analytics':
        setMode('workspace');handled=clickGameTab('team');break;
      case 'play':
        setMode('workspace');handled=clickGameTab('play');break;
      case 'lineups':
        setMode('workspace');handled=clickGameTab('lineups');break;
      default: break;
    }
    if(!handled)notify('This CourtIQ view is not ready yet. Reload the page once and try again.');
    return handled;
  }

  function ensureBackdrop(){
    let backdrop=doc.querySelector('.cq-side-backdrop');
    if(!backdrop){backdrop=doc.createElement('div');backdrop.className='cq-side-backdrop';backdrop.setAttribute('aria-hidden','true');doc.body.appendChild(backdrop);}
    return backdrop;
  }

  function setWorkspaceMenu(open){
    const side=doc.querySelector('#app .side');
    if(!side)return;
    side.classList.toggle('cq-side-open',!!open);
    doc.body.classList.toggle('cq-nav-open',!!open);
    doc.querySelectorAll('.cq-mobile-menu').forEach(btn=>btn.setAttribute('aria-expanded',open?'true':'false'));
    ensureBackdrop();
  }

  function setSiteMenu(open){
    const nav=doc.querySelector('#courtiq-site-shell .cq-site-nav');
    if(!nav)return;
    nav.classList.toggle('cq-site-nav-open',!!open);
    const button=nav.querySelector('.cq-site-menu');
    if(button)button.setAttribute('aria-expanded',open?'true':'false');
  }

  function ensureSiteMenu(){
    const nav=doc.querySelector('#courtiq-site-shell .cq-site-nav');
    if(!nav||nav.querySelector('.cq-site-menu'))return;
    const button=doc.createElement('button');
    button.type='button';
    button.className='cq-site-menu';
    button.setAttribute('aria-label','Open navigation');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span></span><span></span><span></span>';
    const actions=nav.querySelector('.cq-site-actions');
    nav.insertBefore(button,actions||null);
  }

  function openPublicSection(anchor){
    const id=(anchor.getAttribute('href')||'').replace(/^#/,'');
    if(!id)return;
    setMode('home',false);
    setSiteMenu(false);
    root.history.replaceState({},doc.title,root.location.pathname+root.location.search+'#'+id);
    requestAnimationFrame(()=>doc.getElementById(id)?.scrollIntoView({block:'start',behavior:'smooth'}));
  }

  doc.addEventListener('click',e=>{
    const target=targetOf(e);if(!target)return;

    const mobile=target.closest('.cq-mobile-menu');
    if(mobile){
      e.preventDefault();e.stopImmediatePropagation();
      const side=doc.querySelector('#app .side');
      setWorkspaceMenu(!side?.classList.contains('cq-side-open'));
      return;
    }

    const backdrop=target.closest('.cq-side-backdrop');
    if(backdrop){e.preventDefault();e.stopImmediatePropagation();setWorkspaceMenu(false);return;}

    const siteMenu=target.closest('.cq-site-menu');
    if(siteMenu){
      e.preventDefault();e.stopImmediatePropagation();
      const nav=siteMenu.closest('.cq-site-nav');
      setSiteMenu(!nav?.classList.contains('cq-site-nav-open'));
      return;
    }

    const publicLink=target.closest('#courtiq-site-shell .cq-site-nav a[href^="#"]');
    if(publicLink){e.preventDefault();e.stopImmediatePropagation();openPublicSection(publicLink);return;}

    const route=target.closest('[data-cq-route]');
    if(route&&route.closest('#courtiq-site-shell, #app .cq-top')){
      e.preventDefault();e.stopImmediatePropagation();
      setWorkspaceMenu(false);setSiteMenu(false);setMode(route.dataset.cqRoute==='workspace'?'workspace':'home');
      return;
    }

    const action=target.closest('[data-cq-action]');
    if(action&&action.closest('#courtiq-site-shell, #app .cq-side, #app .cq-top')){
      e.preventDefault();e.stopImmediatePropagation();
      setWorkspaceMenu(false);setSiteMenu(false);dispatchAction(action.dataset.cqAction);
    }
  },true);

  doc.addEventListener('keydown',e=>{if(e.key==='Escape'){setWorkspaceMenu(false);setSiteMenu(false);}});
  root.addEventListener('resize',()=>{if(root.innerWidth>720){setWorkspaceMenu(false);setSiteMenu(false);}});
  root.addEventListener('hashchange',()=>{
    const hash=(root.location.hash||'').replace(/^#/,'').toLowerCase();
    if(PUBLIC_HASHES.has(hash)&&hash!=='home')setMode('home',false);
  });

  const observer=new MutationObserver(()=>requestAnimationFrame(()=>{ensureSiteMenu();ensureBackdrop();}));
  observer.observe(doc.documentElement,{childList:true,subtree:true});
  ensureSiteMenu();ensureBackdrop();
  const initialHash=(root.location.hash||'').replace(/^#/,'').toLowerCase();
  if(PUBLIC_HASHES.has(initialHash)&&initialHash!=='home')setMode('home',false);

  root.CourtIQUIReliability={version:VERSION,setMode,dispatchAction,setWorkspaceMenu,setSiteMenu};
})(typeof window!=='undefined'?window:globalThis);
