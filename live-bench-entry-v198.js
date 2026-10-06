/* CourtIQ v198 · reliable Live Bench entry point and guest-safe preview state. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='198';
  const SESSION_KEY='courtiq_supabase_session';

  function hasSession(){
    try{return Boolean(JSON.parse(root.localStorage?.getItem(SESSION_KEY)||'null')?.access_token);}
    catch(_){return false;}
  }

  function closeDrawer(){
    try{root.CourtIQWorkspaceDrawer?.close?.();}catch(_){ }
    doc.querySelector('#app .side')?.classList.remove('cq-side-open');
    doc.body.classList.remove('cq-nav-open');
  }

  function activeGame(){return root.CourtIQActiveGame||null;}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function renderGuestPreview(modal){
    const status=modal?.querySelector('.lbStatus');
    const body=modal?.querySelector('.lbBody');
    const refresh=modal?.querySelector('.lbRefresh');
    const auto=modal?.querySelector('.lbAuto');
    const game=activeGame();
    if(status)status.innerHTML='<b>LIVE BENCH READY</b> · Local preview is available. Sign in to CourtIQ to sync an official live feed.';
    if(auto){auto.disabled=true;auto.title='Sign in to enable automatic live synchronization.';}
    if(refresh){
      refresh.textContent='SIGN IN TO SYNC';
      refresh.onclick=()=>{
        if(status)status.textContent='Official live synchronization requires a signed-in CourtIQ club session.';
      };
    }
    if(!body)return;
    if(game&&(game.home||game.away)){
      const events=Array.isArray(game.playByPlay)?game.playByPlay:Array.isArray(game.play_by_play)?game.play_by_play:[];
      body.innerHTML=`<section class="lbScore lbGuestPreview"><div><small>LOCAL GAME PREVIEW</small><h3>${esc(game.home||'Home')} <b>${esc(game.hs??'—')}–${esc(game.as??'—')}</b> ${esc(game.away||'Away')}</h3><span>${events.length} PBP events currently available in CourtIQ</span></div><div class="lbQuality"><small>SYNC</small><b>LOGIN REQUIRED</b><span>official live refresh is protected</span></div></section><section class="lbGuestNote"><b>Live Bench is open.</b><p>The current CourtIQ game can be reviewed here. Sign in to enable REFRESH NOW and automatic official-source synchronization.</p>${game.sourceUrl?`<p><strong>Source:</strong> ${esc(game.sourceUrl)}</p>`:''}</section>`;
    }else{
      body.innerHTML='<div class="lbEmpty lbGuestNote"><b>Live Bench is open</b><span>No active game is loaded yet. Import/select a game, or sign in and paste an official live game URL.</span></div>';
    }
  }

  function open(){
    closeDrawer();
    const api=root.CourtIQLiveBench;
    if(!api||typeof api.open!=='function'){
      console.error('[CourtIQ v198] Live Bench module is unavailable.');
      return false;
    }
    api.open();
    const modal=doc.querySelector('.liveBenchModal');
    if(!modal)return false;
    modal.dataset.cqLiveEntry=VERSION;
    if(!hasSession())renderGuestPreview(modal);
    return true;
  }

  function ensureTopButton(){
    const top=doc.querySelector('#app .cq-top .cq-top-actions');
    if(!top||top.querySelector('.cq-top-live'))return;
    const button=doc.createElement('button');
    button.type='button';
    button.className='cq-top-live';
    button.dataset.cqAction='live';
    button.innerHTML='<span>●</span> Live Bench';
    top.insertBefore(button,top.firstChild);
  }

  function ensureMenuItem(){
    const menu=doc.querySelector('#app .cq-menu');
    if(!menu||menu.querySelector('[data-cq-action="live"]'))return;
    const season=menu.querySelector('[data-cq-action="season"]');
    const label=doc.createElement('small');
    label.className='cq-nav-label';
    label.textContent='LIVE';
    const button=doc.createElement('button');
    button.type='button';
    button.className='cq-nav-item cq-nav-primary';
    button.dataset.cqAction='live';
    button.innerHTML='<span>●</span><b>Live Bench</b>';
    if(season?.nextSibling){menu.insertBefore(label,season.nextSibling);menu.insertBefore(button,label.nextSibling);}
    else{menu.appendChild(label);menu.appendChild(button);}
  }

  function sync(){ensureMenuItem();ensureTopButton();}

  doc.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:event.target?.parentElement;
    const live=target?.closest?.('[data-cq-action="live"]');
    if(!live)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  },true);

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(doc.getElementById('app')||doc.documentElement,{childList:true,subtree:true});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();

  root.CourtIQLiveBenchEntry={version:VERSION,open,sync,hasSession};
})(typeof window!=='undefined'?window:globalThis);
