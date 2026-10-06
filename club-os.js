/* CourtIQ Club OS v186 · role-aware basketball department workspace. */
(function(root){
  'use strict';
  const STORE='courtiq_club_os_selection_v1';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleLabels={owner:'Owner / Basketball Ops',admin:'Administrator',gm:'GM / Sporting Director',coach:'Head Coach',assistant_coach:'Assistant Coach',analyst:'Analyst',scout:'Scout',player_development:'Player Development',performance:'Performance Staff',player:'Player',viewer:'Viewer'};
  const modules=[
    {id:'games',group:'Game Operations',title:'Game Library',desc:'Official games, verified imports and reusable game records.',permission:'games',status:'ACTIVE',action:'games'},
    {id:'live',group:'Game Operations',title:'Live Bench',desc:'Live box score, PBP, alerts and decision intelligence.',permission:'live',status:'ACTIVE',action:'live'},
    {id:'analytics',group:'Game Operations',title:'Team Analytics',desc:'Four Factors, efficiency, pace and team evidence.',permission:'analytics',status:'ACTIVE',action:'analytics'},
    {id:'pbp',group:'Game Operations',title:'Play-by-Play',desc:'Runs, turning points, player pulse and event evidence.',permission:'analytics',status:'ACTIVE',action:'pbp'},
    {id:'lineups',group:'Game Operations',title:'Lineups',desc:'Certified five-player intervals and lineup context.',permission:'analytics',status:'ACTIVE',action:'lineups'},
    {id:'players',group:'People',title:'Players',desc:'Roster, player intelligence and comparison workflows.',permission:'players',status:'ACTIVE',action:'players'},
    {id:'memory',group:'People',title:'Player Memory',desc:'Longitudinal player samples, trends and role evidence.',permission:'players',status:'ACTIVE',action:'player-memory'},
    {id:'scouting',group:'Preparation',title:'Opponent Scouting',desc:'Opponent memory, tendencies and evidence-first questions.',permission:'scouting',status:'ACTIVE',action:'scouting'},
    {id:'season',group:'Preparation',title:'Season Memory',desc:'Season-level team memory and accumulated game context.',permission:'analytics',status:'ACTIVE',action:'season'},
    {id:'reports',group:'Preparation',title:'Reports',desc:'Coach-ready reports with review and evidence workflow.',permission:'reports',status:'ACTIVE',action:'reports'},
    {id:'gm',group:'Basketball Operations',title:'GM Center',desc:'Roster construction, needs and role balance from one club context.',permission:'gm',status:'FOUNDATION'},
    {id:'recruitment',group:'Basketball Operations',title:'Recruitment',desc:'Candidate pipeline and future roster-fit intelligence.',permission:'recruitment',status:'FOUNDATION'},
    {id:'video',group:'Basketball Operations',title:'Video Intelligence',desc:'Evidence playlists and possession-linked video workflow.',permission:'video',status:'FOUNDATION'},
    {id:'practice',group:'Development',title:'Practice Intelligence',desc:'Translate game findings into teaching and training objectives.',permission:'practice',status:'FOUNDATION'},
    {id:'league',group:'Intelligence',title:'League Intelligence',desc:'Competition-wide trends, archetypes and benchmark layer.',permission:'league',status:'FOUNDATION'},
    {id:'admin',group:'Administration',title:'Organization Admin',desc:'Roles, scopes, seasons and team access foundation.',permission:'admin',status:'FOUNDATION'}
  ];
  const loadSaved=()=>{try{return JSON.parse(root.localStorage?.getItem(STORE)||'{}')||{};}catch(_){return{};}};
  const save=s=>{try{root.localStorage?.setItem(STORE,JSON.stringify({clubId:s.club?.id,seasonId:s.season?.id,teamId:s.team?.id}));}catch(_){}};
  function resolveSelection(rows,saved={}){
    const memberships=Array.isArray(rows)?rows:[],membership=memberships.find(x=>Number(x.club?.id)===Number(saved.clubId))||memberships[0]||null;
    if(!membership)return {membership:null,club:null,season:null,team:null};
    const seasons=Array.isArray(membership.seasons)?membership.seasons:[],season=seasons.find(x=>Number(x.id)===Number(saved.seasonId))||seasons.find(x=>x.is_active)||seasons[0]||null;
    const teams=(Array.isArray(membership.teams)?membership.teams:[]).filter(x=>!season||Number(x.season_id)===Number(season.id)),team=teams.find(x=>Number(x.id)===Number(saved.teamId))||teams.find(x=>x.is_primary)||teams[0]||null;
    return {membership,club:membership.club,season,team};
  }
  function permissionAllowed(membership,key){return membership?.permissions?.[key]===true;}
  function visibleModules(membership){return modules.map(m=>({...m,allowed:permissionAllowed(membership,m.permission)}));}
  function roleLabel(role){return roleLabels[role]||String(role||'Viewer').replaceAll('_',' ');}
  function invoke(action){
    const f=fn=>typeof fn==='function'&&fn();
    if(action==='games')return f(root.openGameLibrary);
    if(action==='live')return root.CourtIQLiveBench?.open?.();
    if(action==='analytics')return root.document?.querySelector('[data-game-tab="team"]')?.click();
    if(action==='pbp')return root.document?.querySelector('[data-game-tab="play"]')?.click();
    if(action==='lineups')return root.document?.querySelector('[data-game-tab="lineups"]')?.click();
    if(action==='players')return root.CourtIQPlayers?.openPlayers?.();
    if(action==='player-memory')return f(root.openPlayerMemory);
    if(action==='scouting')return f(root.openOpponentScout);
    if(action==='season')return f(root.openSeasonMemory);
    if(action==='reports')return f(root.openFullReport);
  }
  function renderStats(stats){return `<div class="cosStats"><div><b>${Number(stats.games||0)}</b><span>Games</span></div><div><b>${Number(stats.roster||0)}</b><span>Roster</span></div><div><b>${Number(stats.scouting||0)}</b><span>Scouting</span></div><div><b>${Number(stats.opponents||0)}</b><span>Opponent players</span></div><div><b>${Number(stats.reports||0)}</b><span>Reports</span></div></div>`;}
  function renderModules(membership){
    const rows=visibleModules(membership),groups=[...new Set(rows.map(x=>x.group))];
    return groups.map(group=>`<section class="cosGroup"><div class="cosGroupHead"><small>${esc(group.toUpperCase())}</small></div><div class="cosGrid">${rows.filter(x=>x.group===group).map(m=>`<button class="cosModule ${m.allowed?'':'cosLocked'}" data-cos-module="${esc(m.id)}" ${m.allowed?'':'disabled'}><div class="cosModuleTop"><span>${esc(m.status)}</span>${m.allowed?'<i>AVAILABLE</i>':'<i>NO ACCESS</i>'}</div><h3>${esc(m.title)}</h3><p>${esc(m.desc)}</p></button>`).join('')}</div></section>`).join('');
  }
  function foundationPanel(id,state,stats){
    const m=modules.find(x=>x.id===id);if(!m)return'';
    const notes={
      gm:['Roster Builder','Roster Weakness Detector','Role balance + lineup fit'],
      recruitment:['Candidate database','Role / style / lineup fit','Player comparison workflow'],
      video:['Evidence playlists','Auto-clip queue','Possession-linked findings'],
      practice:['Finding → teaching point','Practice objective','Next-game verification loop'],
      league:['League benchmarks','Team archetypes','Trend radar'],
      admin:['Role permissions','Season / team scopes','Organization access audit']
    }[id]||[];
    return `<div class="cosDetail"><button data-cos-back>← ALL MODULES</button><small>${esc(m.status)} · ${esc(state.club?.name||'CLUB')}</small><h2>${esc(m.title)}</h2><p>${esc(m.desc)}</p><div class="cosDetailGrid">${notes.map((x,i)=>`<article><b>0${i+1}</b><h4>${esc(x)}</h4><span>${id==='admin'?'Club OS schema is active; management UI is the next control layer.':'Connected to the Club OS context and ready for its dedicated intelligence engine.'}</span></article>`).join('')}</div>${id==='gm'?`<div class="cosRosterPulse"><b>Current organization pulse</b><span>${Number(stats.roster||0)} roster players · ${Number(stats.scouting||0)} scouting candidates · ${Number(stats.games||0)} stored games</span></div>`:''}<p class="cosNote">Foundation means the organization, role and season/team context is live now. Dedicated analytics for this module will be added without changing the Club OS architecture.</p></div>`;
  }
  async function open(){
    if(!root.document)return;
    document.querySelector('.clubOSModal')?.remove();
    const modal=document.createElement('div');modal.className='modal clubOSModal';
    modal.innerHTML='<div class="modalCard cosCard"><button class="modalX">×</button><div class="cosLoading"><b>COURTIQ CLUB OS</b><span>Loading organization context…</span></div></div>';
    document.body.appendChild(modal);const card=modal.querySelector('.cosCard');
    const close=()=>modal.remove();modal.querySelector('.modalX').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};
    try{
      const rows=await root.CourtIQClubOSData.context();let state=resolveSelection(rows,loadSaved());if(!state.membership)throw new Error('No club membership is available for this account.');
      let stats=await root.CourtIQClubOSData.stats(state.club.id,state.season?.season||state.club.season);save(state);
      const draw=()=>{
        const allTeams=(state.membership.teams||[]).filter(x=>!state.season||Number(x.season_id)===Number(state.season.id));
        card.innerHTML=`<button class="modalX">×</button><header class="cosHero"><div><small>COURTIQ · CLUB OS V186</small><h2>${esc(state.club.name)}</h2><p>Basketball Intelligence Operating System · ${esc(roleLabel(state.membership.role))}</p></div><div class="cosContext"><label>Season<select class="cosSeason">${(state.membership.seasons||[]).map(x=>`<option value="${x.id}" ${state.season&&Number(x.id)===Number(state.season.id)?'selected':''}>${esc(x.season)} · ${esc(x.competition)}</option>`).join('')}</select></label><label>Team<select class="cosTeam">${allTeams.map(x=>`<option value="${x.id}" ${state.team&&Number(x.id)===Number(state.team.id)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label></div></header><div class="cosIdentity"><span><small>ROLE</small><b>${esc(roleLabel(state.membership.role))}</b></span><span><small>COMPETITION</small><b>${esc(state.season?.competition||state.club.competition||'—')}</b></span><span><small>COUNTRY</small><b>${esc(state.season?.country||state.club.country||'—')}</b></span><span><small>SCOPE</small><b>${esc(state.team?.name||'Club-wide')}</b></span></div>${renderStats(stats)}<div class="cosModules">${renderModules(state.membership)}</div>`;
        card.querySelector('.modalX').onclick=close;
        card.querySelector('.cosSeason')?.addEventListener('change',async e=>{const season=(state.membership.seasons||[]).find(x=>Number(x.id)===Number(e.target.value));state.season=season||state.season;state.team=(state.membership.teams||[]).filter(x=>Number(x.season_id)===Number(state.season?.id)).find(x=>x.is_primary)||null;stats=await root.CourtIQClubOSData.stats(state.club.id,state.season?.season);save(state);draw();});
        card.querySelector('.cosTeam')?.addEventListener('change',e=>{state.team=(state.membership.teams||[]).find(x=>Number(x.id)===Number(e.target.value))||state.team;save(state);draw();});
        card.querySelectorAll('[data-cos-module]').forEach(btn=>btn.onclick=()=>{const m=modules.find(x=>x.id===btn.dataset.cosModule);if(!m||!permissionAllowed(state.membership,m.permission))return;if(m.action){close();invoke(m.action);}else{card.querySelector('.cosModules').innerHTML=foundationPanel(m.id,state,stats);card.querySelector('[data-cos-back]')?.addEventListener('click',draw);}});
      };
      draw();
    }catch(e){card.innerHTML=`<button class="modalX">×</button><div class="cosError"><small>COURTIQ · CLUB OS</small><h2>Organization context unavailable</h2><p>${esc(e.message)}</p><button class="importBtn cosLogin">OPEN ACCOUNT</button></div>`;card.querySelector('.modalX').onclick=close;card.querySelector('.cosLogin').onclick=()=>{close();root.openAccount?.();};}
  }
  function ensureButton(){
    if(!root.document||document.getElementById('clubOSBtn'))return;
    const btn=document.createElement('button');btn.id='clubOSBtn';btn.type='button';btn.className='clubOSLaunch';btn.innerHTML='<span>◆</span> CLUB OS';btn.onclick=open;
    const host=document.querySelector('.cq-top-actions')||document.querySelector('.clubbar')||document.querySelector('.pills');if(host)host.prepend(btn);
  }
  function install(){ensureButton();const app=document.getElementById('app');if(app&&root.MutationObserver)new MutationObserver(()=>ensureButton()).observe(app,{childList:true,subtree:true});}
  const api={modules,roleLabel,permissionAllowed,visibleModules,resolveSelection,open,install};root.CourtIQClubOS=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();}
})(typeof window!=='undefined'?window:globalThis);
