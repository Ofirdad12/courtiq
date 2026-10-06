/* CourtIQ v194 · single delegated UI router. Loaded before saas-shell so one router owns product clicks. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='194';

  function targetOf(event){
    const t=event?.target;
    return t&&typeof t.closest==='function'?t:(t?.parentElement||null);
  }

  function bridgeRun(action){
    try{return root.CourtIQAppActions?.run?.(action)===true;}
    catch(err){console.error('[CourtIQ v194] action failed',action,err);return false;}
  }

  function closeWorkspaceMenu(){
    doc.querySelector('#app .side')?.classList.remove('cq-side-open');
    doc.body.classList.remove('cq-nav-open');
    doc.querySelectorAll('.cq-mobile-menu').forEach(btn=>btn.setAttribute('aria-expanded','false'));
  }

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

  function toggleWorkspaceMenu(){
    const side=doc.querySelector('#app .side');
    if(!side)return false;
    const open=!side.classList.contains('cq-side-open');
    side.classList.toggle('cq-side-open',open);
    doc.body.classList.toggle('cq-nav-open',open);
    doc.querySelectorAll('.cq-mobile-menu').forEach(btn=>btn.setAttribute('aria-expanded',open?'true':'false'));
    ensureBackdrop();
    return true;
  }

  function setMode(mode){
    const app=doc.getElementById('app');
    const site=doc.getElementById('courtiq-site-shell');
    if(app)app.hidden=mode!=='workspace';
    if(site)site.hidden=mode!=='home';
    doc.body.classList.toggle('cq-public-mode',mode==='home');
    doc.body.classList.toggle('cq-workspace-mode',mode==='workspace');
    try{root.history.replaceState({},doc.title,root.location.pathname+root.location.search+(mode==='home'?'#home':'#workspace'));}catch(_){ }
    if(mode==='workspace')requestAnimationFrame(()=>root.CourtIQNavigation?.sync?.());
    return true;
  }

  function ensurePublicMenu(){
    const nav=doc.querySelector('#courtiq-site-shell .cq-site-nav');
    if(!nav||nav.querySelector('.cq-site-menu'))return;
    const button=doc.createElement('button');
    button.type='button';
    button.className='cq-site-menu';
    button.setAttribute('aria-label','Open navigation');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span></span><span></span><span></span>';
    nav.insertBefore(button,nav.querySelector('.cq-site-actions')||null);
  }

  function togglePublicMenu(button){
    const nav=button?.closest?.('.cq-site-nav');
    if(!nav)return false;
    const open=!nav.classList.contains('cq-site-nav-open');
    nav.classList.toggle('cq-site-nav-open',open);
    button.setAttribute('aria-expanded',open?'true':'false');
    return true;
  }

  function consume(event){
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function onClick(event){
    const target=targetOf(event);
    if(!target)return;

    const mobile=target.closest('.cq-mobile-menu');
    if(mobile&&toggleWorkspaceMenu()){consume(event);return;}

    const backdrop=target.closest('.cq-side-backdrop');
    if(backdrop){closeWorkspaceMenu();consume(event);return;}

    const siteMenu=target.closest('.cq-site-menu');
    if(siteMenu&&togglePublicMenu(siteMenu)){consume(event);return;}

    const route=target.closest('[data-cq-route]');
    if(route){
      closeWorkspaceMenu();
      setMode(route.dataset.cqRoute==='home'?'home':'workspace');
      consume(event);
      return;
    }

    const action=target.closest('[data-cq-action]');
    if(action){
      const name=action.dataset.cqAction;
      if(name==='login'||name==='import')setMode('workspace');
      closeWorkspaceMenu();
      if(bridgeRun(name)){consume(event);return;}
      console.warn('[CourtIQ v194] unhandled action:',name);
    }
  }

  doc.addEventListener('click',onClick);
  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeWorkspaceMenu();return;}
    if(event.key!=='Enter'&&event.key!==' ')return;
    const target=targetOf(event);
    const action=target?.closest?.('[data-cq-action]');
    if(!action)return;
    if(action.dataset.cqAction==='login'||action.dataset.cqAction==='import')setMode('workspace');
    closeWorkspaceMenu();
    if(bridgeRun(action.dataset.cqAction))consume(event);
  });

  root.addEventListener?.('resize',()=>{if(root.innerWidth>720)closeWorkspaceMenu();});

  const observer=new MutationObserver(()=>requestAnimationFrame(ensurePublicMenu));
  observer.observe(doc.documentElement,{childList:true,subtree:true});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',()=>{ensureBackdrop();ensurePublicMenu();},{once:true});
  else{ensureBackdrop();ensurePublicMenu();}

  root.CourtIQUIRouter={version:VERSION,setMode,bridgeRun,toggleWorkspaceMenu};
})(typeof window!=='undefined'?window:globalThis);
