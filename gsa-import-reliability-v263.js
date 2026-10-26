(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const POLL_INTERVAL_MS=1200;
const POLL_WINDOW_MS=40000;

function readSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
  catch(_){return null;}
}

function gsaIdentity(raw){
  try{
    const u=new URL(String(raw||'').trim());
    const host=u.hostname.replace(/^www\./i,'').toLowerCase();
    if(host!=='globalsportsarchive.com')return null;
    // Accept every GSA basketball match URL regardless of competition/team slug.
    const m=u.pathname.match(/^\/match\/basketball\/(?:\d{4}-\d{2}-\d{2})\/[^/]+\/(\d+)\/?$/i);
    return m?{provider:'GSA',externalId:m[1]}:null;
  }catch(_){return null;}
}

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function resolveClubId(explicit=null){
  const n=Number(explicit||0);
  if(Number.isFinite(n)&&n>0)return n;
  const d=window.CourtIQData;
  const active=Number(d?.activeClubId?.()||0);
  if(Number.isFinite(active)&&active>0)return active;
  try{
    const w=await Promise.race([
      Promise.resolve(d?.workspace?.()),
      new Promise(resolve=>setTimeout(()=>resolve(null),1800))
    ]);
    const id=Number(w?.club?.id||0);
    return Number.isFinite(id)&&id>0?id:null;
  }catch(_){return null;}
}

function asImportResult(row,clubId){
  const p=row?.payload;
  if(!p?.ui)return null;
  const verified=p.verified===true||p.quality?.status==='VERIFIED';
  if(!verified)return null;
  return {
    game_id:row.id,
    ui:p.ui,
    validation:p.validation||null,
    report:p.report||null,
    saved:true,
    reused_existing:true,
    cache_hit:true,
    club_id:clubId||row.club_id||null,
    source:'courtiq_gsa_verified_database'
  };
}

async function directLookup(url,clubId=null){
  const identity=gsaIdentity(url);
  if(!identity)return null;
  const session=readSession();
  if(!session?.access_token)return null;
  const chosen=await resolveClubId(clubId);
  if(!chosen)return null;
  const qs=new URLSearchParams({
    select:'id,external_id,provider,payload,club_id',
    club_id:'eq.'+String(chosen),
    provider:'eq.GSA',
    external_id:'eq.'+String(identity.externalId),
    limit:'1'
  });
  try{
    const res=await fetch(SUPABASE_URL+'/rest/v1/games?'+qs.toString(),{
      headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,Accept:'application/json'}
    });
    if(!res.ok)return null;
    const rows=await res.json();
    return asImportResult(Array.isArray(rows)?rows[0]:null,chosen);
  }catch(_){return null;}
}

async function pollForSaved(url,clubId=null,windowMs=POLL_WINDOW_MS){
  const started=Date.now();
  while(Date.now()-started<windowMs){
    const hit=await directLookup(url,clubId);
    if(hit)return hit;
    await sleep(POLL_INTERVAL_MS);
  }
  return null;
}

let wrapper=null;
function install(){
  const d=window.CourtIQData;
  if(!d?.importOfficialGame)return false;
  if(wrapper&&d.importOfficialGame===wrapper)return true;
  const previous=d.importOfficialGame;
  if(previous?.__courtiqGsaReliabilityV263)return true;

  wrapper=async function(url,clubId=null){
    if(!gsaIdentity(url))return previous(url,clubId);

    const cached=await directLookup(url,clubId);
    if(cached){
      window.CourtIQTeamPossessions?.applyToGame?.(cached.ui);
      return cached;
    }

    const importPromise=Promise.resolve().then(()=>previous(url,clubId));
    const savedPromise=pollForSaved(url,clubId);
    const first=await Promise.race([
      importPromise.then(value=>({kind:'import',value}),error=>({kind:'error',error})),
      savedPromise.then(value=>({kind:'saved',value}))
    ]);

    if(first.kind==='import')return first.value;
    if(first.kind==='saved'&&first.value){
      window.CourtIQTeamPossessions?.applyToGame?.(first.value.ui);
      // Keep the original request running so player-memory/report persistence can finish.
      importPromise.catch(()=>{});
      return first.value;
    }
    if(first.kind==='error'){
      const recovered=await directLookup(url,clubId);
      if(recovered)return recovered;
      throw first.error;
    }

    try{return await importPromise;}
    catch(error){
      const recovered=await directLookup(url,clubId);
      if(recovered)return recovered;
      throw error;
    }
  };
  wrapper.__courtiqGsaReliabilityV263=true;
  wrapper.__courtiqAllGsaBasketballMatchUrls=true;
  d.importOfficialGame=wrapper;
  d.__gsaReliabilityV263=true;
  d.__allGsaBasketballMatchUrls=true;
  return true;
}

install();
setTimeout(install,0);
setTimeout(install,300);
setTimeout(install,1200);
window.addEventListener('load',install,{once:true});
window.CourtIQGsaImportReliability={install,gsaIdentity,directLookup,pollForSaved,resolveClubId};
})();
