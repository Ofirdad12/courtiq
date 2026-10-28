(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const BCL_TIMEOUT_MS=45000;
const CACHE_TIMEOUT_MS=1800;

function bclIdentity(raw){
  try{
    const u=new URL(String(raw||'').trim());
    if(u.hostname.replace(/^www\./i,'').toLowerCase()!=='championsleague.basketball')return null;
    const m=u.pathname.match(/^\/en\/games\/(\d+)-[a-z0-9-]+\/?$/i);
    return m?{provider:'FIBA',externalId:m[1]}:null;
  }catch(_){return null;}
}

function readSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
  catch(_){return null;}
}

function timebox(promise,ms,fallback=null){
  let timer=null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),ms);})
  ]).finally(()=>{if(timer)clearTimeout(timer);});
}

function patchResult(result,url){
  if(!result||typeof result!=='object')return result;
  if(result.ui&&typeof result.ui==='object'){
    result.ui.sourceUrl=url;
    result.ui.sourceLabel='BCL OFFICIAL BOX SCORE · DATA CONFIRMED';
    if(!result.ui.comp||/basketball champions league/i.test(String(result.ui.comp)))result.ui.comp='Basketball Champions League';
  }
  result.source=result.source||'bcl_official_fiba_platform';
  return result;
}

async function resolveClubId(clubId=null){
  const explicit=Number(clubId||0);
  if(Number.isFinite(explicit)&&explicit>0)return explicit;
  const bridge=window.CourtIQImportDatabaseFirstV244;
  if(bridge?.resolveClubId)return bridge.resolveClubId(null);
  const d=window.CourtIQData;
  const active=Number(d?.activeClubId?.()||0);
  if(Number.isFinite(active)&&active>0)return active;
  const w=d?.workspace?await timebox(d.workspace(),CACHE_TIMEOUT_MS,null):null;
  const fromWorkspace=Number(w?.club?.id||0);
  return Number.isFinite(fromWorkspace)&&fromWorkspace>0?fromWorkspace:null;
}

async function savedBcl(url){
  const id=bclIdentity(url);
  const d=window.CourtIQData;
  if(!id||!d?.workspace)return null;
  const w=await timebox(d.workspace(),CACHE_TIMEOUT_MS,null);
  if(!w)return null;
  const row=(w.games||[]).find(g=>String(g?.provider||'').toUpperCase()==='FIBA'&&String(g?.external_id||'')===String(id.externalId));
  const p=row?.payload;
  if(!row||!p?.ui||!(p.verified===true||p.quality?.status==='VERIFIED'))return null;
  return patchResult({
    game_id:row.id,
    ui:{...p.ui},
    validation:p.validation||null,
    report:p.report||null,
    saved:true,
    reused_existing:true,
    cache_hit:true,
    club_id:w?.club?.id||row.club_id||null,
    source:'courtiq_verified_database'
  },url);
}

async function invokeBcl(url,clubId=null,retry=true){
  const d=window.CourtIQData;
  const session=readSession();
  if(!session?.access_token)throw new Error('Sign in before importing a game.');
  const chosen=await resolveClubId(clubId);
  if(!chosen)throw new Error('Select a club before importing a game.');

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),BCL_TIMEOUT_MS);
  let res;
  try{
    res=await fetch(SUPABASE_URL+'/functions/v1/import-ibba-game',{
      method:'POST',
      headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({url,club_id:chosen}),
      signal:controller.signal
    });
  }catch(error){
    if(error?.name==='AbortError')throw new Error('BCL did not return the official game data in time. CourtIQ stopped safely; retry the same link.');
    throw error;
  }finally{clearTimeout(timer);}

  const raw=await res.text();
  let body=null;
  try{body=raw?JSON.parse(raw):null;}catch(_){}

  if(res.status===401&&retry&&d?.refreshSession){
    const refreshed=await d.refreshSession();
    if(refreshed)return invokeBcl(url,chosen,false);
  }
  if(!res.ok){
    if(res.status===409&&body?.code==='BCL_BOX_SCORE_PENDING')throw new Error(body.error);
    if(res.status===422)throw new Error(body?.error||body?.message||'CourtIQ reached BCL, but the official box score could not be parsed.');
    if(res.status===429)throw new Error('BCL is rate-limiting requests right now. Retry the same link shortly.');
    if(res.status>=500)throw new Error(body?.error||body?.message||`CourtIQ BCL import returned HTTP ${res.status}.`);
    throw new Error(body?.error||body?.message||`BCL import failed (HTTP ${res.status}).`);
  }
  if(!body||typeof body!=='object')throw new Error('CourtIQ BCL import returned an invalid response.');
  return patchResult({...body,club_id:body.club_id||chosen},url);
}

let wrapper=null;
let wrappedBase=null;
function install(){
  const d=window.CourtIQData;
  if(!d?.importOfficialGame)return false;
  if(wrapper&&d.importOfficialGame===wrapper)return true;
  if(d.importOfficialGame?.__courtiqBclV265)return true;
  wrappedBase=d.importOfficialGame;
  wrapper=async function(url,clubId=null){
    if(!bclIdentity(url))return wrappedBase(url,clubId);
    let cached=null;
    try{cached=await savedBcl(url);}catch(_){}
    if(cached)return cached;
    return invokeBcl(url,clubId,true);
  };
  wrapper.__courtiqBclV265=true;
  d.importOfficialGame=wrapper;
  d.__importBclV265=true;
  return true;
}

install();
setTimeout(install,0);
setTimeout(install,250);
setTimeout(install,1000);
window.addEventListener('load',install,{once:true});
window.CourtIQBclImportV265={install,bclIdentity,savedBcl,invokeBcl,patchResult};
})();
