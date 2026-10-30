(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const DEFAULT_CLIENT_TIMEOUT_MS=20000;
const IBBA_CLIENT_TIMEOUT_MS=45000;
const WINNER_CLIENT_TIMEOUT_MS=40000;
const FIBA_CLIENT_TIMEOUT_MS=45000;
const GSA_CLIENT_TIMEOUT_MS=60000;
const CACHE_LOOKUP_TIMEOUT_MS=1800;
const CLUB_FALLBACK_TIMEOUT_MS=1800;

function readSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
  catch(_){return null;}
}

function identityFromUrl(raw){
  try{
    const u=new URL(String(raw||'').trim());
    const host=u.hostname.replace(/^www\./i,'').toLowerCase();
    if(host==='ibasketball.co.il'){
      const m=u.pathname.match(/^\/match\/([^/?#]+)\/?$/i);
      return m?{provider:'IBBA',externalId:m[1]}:null;
    }
    if(host==='basket.co.il'){
      const id=u.searchParams.get('GameId');
      return id?{provider:'WINNER_LEAGUE',externalId:id}:null;
    }
    if(host==='fiba.basketball'){
      const m=u.pathname.match(/\/games\/(\d+)-/i);
      return m?{provider:'FIBA',externalId:m[1]}:null;
    }
    if(host==='euroleaguebasketball.net'){
      const m=u.pathname.match(/\/([EU]\d{4})\/(\d+)\/?$/i);
      if(!m)return null;
      return {provider:u.pathname.toLowerCase().includes('/eurocup/')?'EUROCUP':'EUROLEAGUE',externalId:m[1].toUpperCase()+'-'+m[2]};
    }
    if(host==='plk.pl'){
      const m=u.pathname.match(/^\/mecz\/(\d+)/i);
      return m?{provider:'PLK',externalId:m[1]}:null;
    }
    if(host.endsWith('geniussports.com')){
      const m=u.pathname.match(/^\/u\/[^/]+\/(\d+)\//i);
      return m?{provider:'GENIUS_LIVESTATS',externalId:m[1]}:null;
    }
    if(host==='eurobasket.com'){
      const id=u.searchParams.get('Game')||u.searchParams.get('game');
      return id?{provider:'EUROBASKET_POLAND',externalId:String(id).slice(0,120)}:null;
    }
    if(host==='globalsportsarchive.com'){
      const m=u.pathname.match(/^\/match\/basketball\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\/(\d+)\/?$/i);
      return m?{provider:'GSA',externalId:m[1]}:null;
    }
  }catch(_){}
  return null;
}

function clientTimeoutForUrl(raw){
  const provider=identityFromUrl(raw)?.provider;
  if(provider==='IBBA')return IBBA_CLIENT_TIMEOUT_MS;
  if(provider==='FIBA')return FIBA_CLIENT_TIMEOUT_MS;
  if(provider==='WINNER_LEAGUE')return WINNER_CLIENT_TIMEOUT_MS;
  if(provider==='GSA')return GSA_CLIENT_TIMEOUT_MS;
  return DEFAULT_CLIENT_TIMEOUT_MS;
}

function importerFunctionForUrl(raw){
  try{
    const host=new URL(String(raw||'').trim()).hostname.replace(/^www\./i,'').toLowerCase();
    return host==='ibasketball.co.il'?'import-ibba-game-v2':'import-ibba-game';
  }catch(_){
    return 'import-ibba-game';
  }
}

function uiHasPbp(ui){
  const candidates=[ui?.play_by_play,ui?.playByPlay,ui?.pbp];
  return candidates.some(v=>Array.isArray(v)&&v.length>0);
}

function timebox(promise,timeoutMs,fallback=null){
  let timer=null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),timeoutMs);})
  ]).finally(()=>{if(timer)clearTimeout(timer);});
}

async function savedGame(url){
  const identity=identityFromUrl(url);
  const d=window.CourtIQData;
  if(!identity||!d?.workspace)return null;

  if(identity.provider==='WINNER_LEAGUE')return null;

  const w=await timebox(d.workspace(),CACHE_LOOKUP_TIMEOUT_MS,null);
  if(!w)return null;
  const matches=id=>id&&id.provider===identity.provider&&String(id.externalId)===String(identity.externalId);
  const row=(w?.games||[]).find(g=>{
    const p=g?.payload;
    if(!p?.ui||!(p.verified===true||p.quality?.status==='VERIFIED'))return false;
    if(matches({provider:String(g.provider||'').toUpperCase(),externalId:g.external_id}))return true;
    const aliases=Array.isArray(p.source_aliases)?p.source_aliases:[];
    return aliases.some(alias=>typeof alias==='string'&&matches(identityFromUrl(alias)));
  });
  if(!row?.payload?.ui)return null;
  const verified=row.payload.verified===true||row.payload.quality?.status==='VERIFIED';
  if(!verified)return null;

  if(identity.provider==='FIBA'&&!uiHasPbp(row.payload.ui))return null;

  return {
    game_id:row.id,
    ui:row.payload.ui,
    validation:row.payload.validation||null,
    report:row.payload.report||null,
    saved:true,
    reused_existing:true,
    cache_hit:true,
    club_id:w?.club?.id||row.club_id||null,
    source:'courtiq_verified_database'
  };
}

async function resolveClubId(clubId=null){
  const explicit=Number(clubId||0);
  if(Number.isFinite(explicit)&&explicit>0)return explicit;
  const d=window.CourtIQData;
  const active=Number(d?.activeClubId?.()||0);
  if(Number.isFinite(active)&&active>0)return active;
  try{
    const workspacePromise=d?.workspace?.();
    const w=workspacePromise?await timebox(workspacePromise,CLUB_FALLBACK_TIMEOUT_MS,null):null;
    const fromWorkspace=Number(w?.club?.id||0);
    if(Number.isFinite(fromWorkspace)&&fromWorkspace>0)return fromWorkspace;
  }catch(_){}
  return null;
}

async function invokeImport(url,clubId=null,retry=true){
  const d=window.CourtIQData;
  const session=readSession();
  if(!session?.access_token)throw new Error('Sign in before importing a game.');

  const chosen=await resolveClubId(clubId);
  if(!chosen)throw new Error('Select a club before importing a game.');

  const importer=importerFunctionForUrl(url);
  const timeoutMs=clientTimeoutForUrl(url);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let res;
  try{
    res=await fetch(SUPABASE_URL+'/functions/v1/'+importer,{
      method:'POST',
      headers:{
        apikey:PUBLISHABLE_KEY,
        Authorization:'Bearer '+session.access_token,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({url,club_id:chosen}),
      signal:controller.signal
    });
  }catch(error){
    if(error?.name==='AbortError'){
      const provider=identityFromUrl(url)?.provider;
      if(provider==='GSA'||provider==='IBBA'){
        try{
          let completed=await savedGame(url);
          if(completed)return completed;
          if(provider==='IBBA'){
            await new Promise(resolve=>setTimeout(resolve,1200));
            completed=await savedGame(url);
            if(completed)return completed;
          }
        }catch(_){}
      }
      throw new Error(`The official source did not respond in time. CourtIQ stopped the import after ${Math.round(timeoutMs/1000)} seconds instead of leaving it stuck.`);
    }
    throw new Error(error?.message||'Network error while contacting the CourtIQ importer.');
  }finally{
    clearTimeout(timer);
  }

  const raw=await res.text();
  let body=null;
  try{body=raw?JSON.parse(raw):null;}catch(_){}

  if(res.status===401&&retry&&d?.refreshSession){
    const refreshed=await d.refreshSession();
    if(refreshed)return invokeImport(url,chosen,false);
  }

  if(!res.ok){
    const upstreamMessage=String(body?.error||body?.message||raw||'');
    const provider=identityFromUrl(url)?.provider;
    const ibbaBlocked=provider==='IBBA'&&(
      res.status===504||
      /HTTP\s*(?:403|504)|blocking the server fetch|Just a moment|Cloudflare/i.test(upstreamMessage)
    );
    if(ibbaBlocked){
      throw new Error('IBBA is blocking automatic server access via Cloudflare. CourtIQ is online; this IBBA game cannot be imported automatically right now. Verified games already saved in CourtIQ still load normally.');
    }
    if(provider==='WINNER_LEAGUE'&&res.status===504){
      throw new Error('Winner League did not return the official box score in time. CourtIQ stopped safely instead of hanging; retry the same link.');
    }
    if(provider==='GSA'&&res.status===504){
      throw new Error('Global Sports Archive did not return the box score in time. CourtIQ stopped safely; retry the same link.');
    }
    if(res.status===422){
      throw new Error(body?.error||body?.message||'CourtIQ reached the official source, but the game could not be parsed.');
    }
    if(res.status===429){
      throw new Error('The official source is rate-limiting requests right now. CourtIQ stopped safely; retry the same link shortly.');
    }
    if(res.status===504){
      throw new Error('The official source is blocking the server fetch right now. CourtIQ stopped safely instead of hanging.');
    }
    if(res.status>=500){
      throw new Error(body?.error||body?.message||`CourtIQ import service returned HTTP ${res.status}.`);
    }
    throw new Error(body?.error||body?.message||`Official game import failed (HTTP ${res.status}).`);
  }

  if(!body||typeof body!=='object'){
    throw new Error('CourtIQ import service returned an invalid response.');
  }
  return {...body,club_id:body.club_id||chosen};
}

let wrapper=null;
function install(){
  const d=window.CourtIQData;
  if(!d?.importOfficialGame)return false;
  if(wrapper&&d.importOfficialGame===wrapper)return true;
  wrapper=async function(url,clubId=null){
    let cached=null;
    try{cached=await savedGame(url);}catch(_){}
    if(cached){
      window.CourtIQTeamPossessions?.applyToGame?.(cached.ui);
      return cached;
    }
    return invokeImport(url,clubId,true);
  };
  wrapper.__courtiqDatabaseFirstV244=true;
  wrapper.__courtiqHttpResilience=true;
  wrapper.__courtiqIbbaV2=true;
  wrapper.__courtiqIbbaTimeout45=true;
  wrapper.__courtiqWinnerResilience=true;
  wrapper.__courtiqGsa=true;
  d.importOfficialGame=wrapper;
  d.__importDatabaseFirstV244=true;
  d.__importHttpResilience=true;
  d.__importIbbaV2=true;
  d.__importIbbaTimeout45=true;
  d.__importWinnerResilience=true;
  d.__importGsa=true;
  return true;
}

install();
setTimeout(install,0);
setTimeout(install,250);
setTimeout(install,1000);
window.addEventListener('load',install,{once:true});
window.CourtIQImportDatabaseFirstV244={install,savedGame,identityFromUrl,clientTimeoutForUrl,invokeImport,resolveClubId,importerFunctionForUrl,timebox};
})();