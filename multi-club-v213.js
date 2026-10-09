(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const CLUB_KEY='courtiq_active_club_id';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
function activeClubId(){const n=Number(localStorage.getItem(CLUB_KEY)||0);return Number.isFinite(n)&&n>0?n:null}
function rememberClub(id){const n=Number(id);if(n>0)localStorage.setItem(CLUB_KEY,String(n));else localStorage.removeItem(CLUB_KEY)}

async function request(path,options={},retry=true){
  const s=session();
  if(!s?.access_token) throw new Error('Sign in to load the club workspace.');
  const res=await fetch(SUPABASE_URL+path,{...options,headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json',...(options.headers||{})}});
  let body=null;try{body=await res.json()}catch(_){}
  if(res.status===401&&retry&&window.CourtIQData?.refreshSession){
    const refreshed=await window.CourtIQData.refreshSession();
    if(refreshed)return request(path,options,false);
  }
  if(!res.ok)throw new Error(body?.error||body?.message||body?.hint||'CourtIQ data request failed');
  return body;
}
async function clubs(){
  const rows=await request('/rest/v1/clubs?select=id,slug,name,season,country,competition,pilot&order=name.asc');
  return Array.isArray(rows)?rows:[];
}
async function resolveClub(){
  const available=await clubs();
  if(!available.length)throw new Error('This account is not assigned to a CourtIQ club.');
  const wanted=activeClubId();
  const club=available.find(x=>Number(x.id)===Number(wanted))||available[0];
  if(Number(club.id)!==Number(wanted))rememberClub(club.id);
  return {club,clubs:available};
}
async function setActiveClub(id){
  const available=await clubs();
  const club=available.find(x=>Number(x.id)===Number(id));
  if(!club)throw new Error('You do not have access to that club.');
  rememberClub(club.id);
  window.dispatchEvent(new CustomEvent('courtiq:club-changed',{detail:{club}}));
  return club;
}
async function workspace(){
  const {club,clubs:available}=await resolveClub();
  const [games,clubPlayers]=await Promise.all([
    request('/rest/v1/games?select=id,external_id,provider,competition,game_date,home_team,away_team,payload,created_at,club_id&club_id=eq.'+Number(club.id)+'&order=game_date.desc.nullslast'),
    request('/rest/v1/club_players?select=season,roster_status,players(id,name,position,nationality,source_url,analysis)&club_id=eq.'+Number(club.id)+'&season=eq.'+encodeURIComponent(club.season))
  ]);
  return {club,clubs:available,games:games||[],clubPlayers:clubPlayers||[]};
}
async function importOfficialGame(url,clubId=null){
  const chosen=clubId?Number(clubId):Number((await resolveClub()).club.id);
  if(!chosen)throw new Error('Select a club before importing a game.');
  const body=await request('/functions/v1/import-ibba-game',{method:'POST',body:JSON.stringify({url,club_id:chosen})});
  return {...body,club_id:chosen};
}
async function playerIntelligence(){
  const w=await workspace(),rows=w.clubPlayers||[],ids=rows.map(r=>r.players?.id).filter(Boolean);
  if(!ids.length)return [];
  const samples=await request('/rest/v1/player_samples?select=id,player_id,season,competition,club_name,phase,games,minutes,raw_stats,published_summary,source_label,source_url,source_note,verified&player_id=in.('+ids.join(',')+')&order=season.desc');
  const byPlayer=new Map();
  for(const sample of samples||[]){if(!byPlayer.has(sample.player_id))byPlayer.set(sample.player_id,[]);byPlayer.get(sample.player_id).push(sample)}
  return rows.map(row=>({...row,samples:byPlayer.get(row.players?.id)||[]}));
}
async function comparisonPlayers(){
  const w=await workspace();
  const rows=await request('/rest/v1/game_player_stats?select=id,game_id,player_id,provider,season,competition,team_name,opponent_name,side,player_name,jersey_number,starter,minutes,stats,calculated,source_url,verified,created_at&verified=eq.true&order=created_at.desc');
  const byPlayer=new Map();for(const row of rows||[]){if(!byPlayer.has(row.player_id))byPlayer.set(row.player_id,[]);byPlayer.get(row.player_id).push(row)}
  return {club:w.club,rows:rows||[],byPlayer};
}
async function productHealth(){
  const w=await workspace();
  const roster=(w.clubPlayers||[]).filter(r=>r.roster_status==='roster');
  const scouting=(w.clubPlayers||[]).filter(r=>r.roster_status==='scouting');
  const opponent=(w.clubPlayers||[]).filter(r=>r.roster_status==='opponent');
  const gameIds=(w.games||[]).map(g=>g.id);
  const [runs,reports]=await Promise.all([
    request('/rest/v1/import_runs?select=id,provider,source_url,external_id,status,validation,error_message,game_id,created_at&club_id=eq.'+Number(w.club.id)+'&order=created_at.desc&limit=20'),
    gameIds.length?request('/rest/v1/game_reports?select=id,game_id,report_version,updated_at&game_id=in.('+gameIds.join(',')+')'):Promise.resolve([])
  ]);
  return {club:w.club,counts:{games:w.games.length,reports:reports.length,roster:roster.length,scouting:scouting.length,opponent:opponent.length},latestImport:runs[0]||null,importRuns:runs,checks:{secureWorkspace:true,rosterLoaded:roster.length>0,realGameImported:w.games.length>0,reportPersisted:reports.length>0,importValidated:runs.some(r=>r.status==='success'&&r.validation?.home?.status==='passed'&&r.validation?.away?.status==='passed')}};
}

function install(){
  const d=window.CourtIQData;if(!d||d.__multiClubV213)return false;
  const oldSignOut=d.signOut;
  Object.assign(d,{clubs,activeClubId,setActiveClub,workspace,importOfficialGame,playerIntelligence,comparisonPlayers,productHealth});
  d.signOut=()=>{rememberClub(null);return oldSignOut?.()};
  d.__multiClubV213=true;
  return true;
}
async function renderSwitcher(){
  if(!window.CourtIQData?.isSignedIn?.())return;
  const host=document.querySelector('.cq-top-actions');if(!host||document.getElementById('cqClubSwitcher'))return;
  try{
    const {club,clubs:available}=await resolveClub();
    const wrap=document.createElement('label');wrap.id='cqClubSwitcher';wrap.className='cq-club-switcher';
    wrap.innerHTML=available.length>1?`<small>CLUB</small><select aria-label="Active club">${available.map(c=>`<option value="${Number(c.id)}"${Number(c.id)===Number(club.id)?' selected':''}>${E(c.name)}</option>`).join('')}</select>`:`<small>CLUB</small><b>${E(club.name)}</b>`;
    const select=wrap.querySelector('select');if(select)select.addEventListener('change',async()=>{select.disabled=true;try{await setActiveClub(select.value);location.reload()}catch(e){select.disabled=false;alert(e.message)}});
    host.prepend(wrap);
    if(!document.getElementById('cqClubSwitcherStyle')){const s=document.createElement('style');s.id='cqClubSwitcherStyle';s.textContent='.cq-club-switcher{display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:6px 9px;background:rgba(255,255,255,.04);color:#fff}.cq-club-switcher small{font-size:9px;color:#8fa5bb;letter-spacing:.08em}.cq-club-switcher b,.cq-club-switcher select{font:600 11px Inter,Arial,sans-serif;color:#fff}.cq-club-switcher select{background:#0b1523;border:0;outline:0;max-width:180px}';document.head.appendChild(s)}
  }catch(_){}
}

if(typeof window!=='undefined'){
  window.CourtIQMultiClub={clubs,activeClubId,setActiveClub,resolveClub};
  let tries=0;const boot=()=>{if(install()){renderSwitcher();return}if(++tries<40)setTimeout(boot,100)};boot();
  const observer=new MutationObserver(()=>renderSwitcher());observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('courtiq:club-changed',renderSwitcher);
}
})();
