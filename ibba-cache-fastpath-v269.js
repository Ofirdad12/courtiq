(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const LOOKUP_TIMEOUT_MS=2500;

function readSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
  catch(_){return null;}
}

function ibbaIdentity(raw){
  try{
    const u=new URL(String(raw||'').trim());
    const host=u.hostname.replace(/^www\./i,'').toLowerCase();
    const m=u.pathname.match(/^\/match\/([^/?#]+)\/?$/i);
    return host==='ibasketball.co.il'&&m?{provider:'IBBA',externalId:m[1]}:null;
  }catch(_){return null;}
}

async function directSavedGame(url){
  const identity=ibbaIdentity(url);
  const session=readSession();
  if(!identity||!session?.access_token)return null;

  const params=new URLSearchParams();
  params.set('select','id,club_id,provider,external_id,payload');
  params.set('provider','eq.IBBA');
  params.set('external_id','eq.'+identity.externalId);
  params.set('order','id.desc');
  params.set('limit','1');

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),LOOKUP_TIMEOUT_MS);
  try{
    const res=await fetch(SUPABASE_URL+'/rest/v1/games?'+params.toString(),{
      headers:{
        apikey:PUBLISHABLE_KEY,
        Authorization:'Bearer '+session.access_token,
        Accept:'application/json'
      },
      signal:controller.signal
    });
    if(!res.ok)return null;
    const rows=await res.json();
    const row=Array.isArray(rows)?rows[0]:null;
    const p=row?.payload;
    if(!row||!p?.ui||!(p.verified===true||p.quality?.status==='VERIFIED'))return null;
    return {
      game_id:row.id,
      ui:p.ui,
      validation:p.validation||null,
      report:p.report||null,
      saved:true,
      reused_existing:true,
      cache_hit:true,
      club_id:row.club_id||null,
      source:'courtiq_verified_database_direct'
    };
  }catch(_){
    return null;
  }finally{
    clearTimeout(timer);
  }
}

function patchHelper(){
  const helper=window.CourtIQImportDatabaseFirstV244;
  if(!helper?.savedGame||helper.savedGame.__courtiqIbbaDirectCacheV269)return false;
  const base=helper.savedGame.bind(helper);
  const wrapped=async function(url){
    let cached=null;
    try{cached=await base(url);}catch(_){}
    if(cached)return cached;
    return directSavedGame(url);
  };
  wrapped.__courtiqIbbaDirectCacheV269=true;
  helper.savedGame=wrapped;
  return true;
}

function install(){patchHelper();}
install();
[250,1000,2500,5000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('load',install,{once:true});
window.CourtIQIbbaCacheFastpath={directSavedGame,install};
})();
