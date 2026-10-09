(()=>{
'use strict';

const PROVIDER_PLK='PLK';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>Array.isArray(v)?v:[];

function providerOf(record){
  return String(record?.provider||record?.payload?.provider||record?.source?.provider||record?.ui?.provider||record?.payload?.ui?.provider||record?.sourceLabel||record?.payload?.ui?.sourceLabel||'').toUpperCase().includes('PLK')?PROVIDER_PLK:String(record?.provider||record?.payload?.provider||record?.source?.provider||'').toUpperCase();
}
function uiOf(record){return record?.payload?.ui||record?.ui||record||null;}
function playerSides(record){
  const ui=uiOf(record);
  return ui?.players||record?.players||record?.payload?.players||null;
}
function starterEvidence(players){
  const ps=arr(players).filter(p=>p&&((Number(p.minutes)||0)>0||(Number(p.points)||0)>0));
  const starters=ps.filter(p=>p.starter===true);
  return {verified:starters.length===5,starters:starters.length,players:ps.length};
}
function normalizePlkPlayers(players){
  const evidence=starterEvidence(players);
  if(evidence.verified){
    for(const p of arr(players)){
      if(p&&typeof p.starter==='boolean'){
        if(p.starter_verified==null)p.starter_verified=true;
        if(!p.starter_source)p.starter_source='verified_source_or_lineup_reconstruction';
      }
    }
    return evidence;
  }
  for(const p of arr(players)){
    if(!p)continue;
    p.starter=null;
    p.starter_verified=false;
    p.starter_source=p.starter_source||'unknown';
  }
  return evidence;
}
function normalizeRecord(record){
  if(!record||providerOf(record)!==PROVIDER_PLK)return record;
  const sides=playerSides(record);
  if(!sides)return record;
  const home=normalizePlkPlayers(sides.home),away=normalizePlkPlayers(sides.away);
  const verified=home.verified&&away.verified;
  const ui=uiOf(record);
  if(ui){
    ui.starterEvidence={verified,status:verified?'VERIFIED':'UNKNOWN',home,away};
    if(!verified&&ui.splits){ui.splits=null;}
  }
  if(record.payload){
    record.payload.starter_evidence={verified,status:verified?'VERIFIED':'UNKNOWN',home,away};
    if(record.payload.ui&&!verified)record.payload.ui.splits=null;
  }
  return record;
}
function qualityOf(record){
  const q=record?.payload?.quality||record?.quality||null;
  const checks=arr(q?.checks);
  const pass=checks.filter(x=>String(x?.status||'').toUpperCase()==='PASS').length;
  const score=Number.isFinite(Number(q?.score))?Number(q.score):(checks.length?Math.round(pass/checks.length*100):null);
  const status=String(q?.status||record?.payload?.verified===true?'VERIFIED':record?.payload?.verified===false?'REVIEW':'').toUpperCase();
  const sides=playerSides(record);
  const starterVerified=providerOf(record)!==PROVIDER_PLK?null:(starterEvidence(sides?.home).verified&&starterEvidence(sides?.away).verified);
  return {status:status||'UNKNOWN',score,checks,pass,total:checks.length,starterVerified};
}
function recordKey(record){
  const ui=uiOf(record)||{};
  return String(record?.id??record?._dbId??ui?._dbId??ui?.id??record?.external_id??'');
}
function sourceKey(record){
  const ui=uiOf(record)||{};
  return String(record?.source_url||record?.sourceUrl||record?.payload?.source_url||ui?.sourceUrl||'').replace(/[?#].*$/,'').replace(/\/$/,'');
}
function sameGame(a,b){
  const ak=recordKey(a),bk=recordKey(b);if(ak&&bk&&ak===bk)return true;
  const as=sourceKey(a),bs=sourceKey(b);return !!(as&&bs&&as===bs);
}

const API={providerOf,starterEvidence,normalizeRecord,qualityOf,sameGame};
if(typeof window!=='undefined')window.CourtIQIntegrity=API;
if(typeof document==='undefined'||typeof window==='undefined')return;

function normalizeActive(){try{if(window.CourtIQActiveGame)normalizeRecord(window.CourtIQActiveGame);}catch(_){} }
function wrapWorkspace(){
  const d=window.CourtIQData;
  if(!d||typeof d.workspace!=='function'||d.workspace.__cqIntegrityWrapped)return;
  const original=d.workspace.bind(d);
  const wrapped=async(...args)=>{
    const value=await original(...args);
    for(const g of arr(value?.games))normalizeRecord(g);
    return value;
  };
  wrapped.__cqIntegrityWrapped=true;
  d.workspace=wrapped;
}
function ensureStyle(){
  if(document.getElementById('cqCommercialIntegrityStyle'))return;
  const style=document.createElement('style');style.id='cqCommercialIntegrityStyle';
  style.textContent=`
  .cq-import-health{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;font:600 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.04em}
  .cq-health-pill{border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 10px;background:rgba(255,255,255,.05);color:#dce8f7}
  .cq-health-pill b{color:#fff}.cq-health-pill[data-state="VERIFIED"]{border-color:rgba(71,222,154,.35);background:rgba(71,222,154,.09)}
  .cq-health-pill[data-state="REVIEW"],.cq-health-pill[data-state="UNKNOWN"]{border-color:rgba(255,190,92,.35);background:rgba(255,190,92,.08)}
  .cq-health-detail{color:#91a6bc;font-weight:500}.cq-health-detail strong{color:#dce8f7}
  `;
  document.head.appendChild(style);
}
let latestToken=0;
async function activeRecord(){
  const active=window.CourtIQActiveGame;if(!active)return null;
  normalizeRecord(active);
  try{
    const w=await window.CourtIQData?.workspace?.();
    const row=arr(w?.games).find(g=>sameGame(g,active));
    return row||active;
  }catch(_){return active;}
}
async function renderHealth(){
  const token=++latestToken,host=document.querySelector('.gamehead,.cq-gamehead');
  if(!host)return;
  const old=document.getElementById('cqImportHealth');if(old)old.remove();
  const record=await activeRecord();if(token!==latestToken||!record)return;
  normalizeRecord(record);normalizeActive();
  const q=qualityOf(record),provider=providerOf(record)||'OFFICIAL';
  const row=document.createElement('div');row.id='cqImportHealth';row.className='cq-import-health';
  const score=q.score==null?'—':`${Math.round(q.score)}/100`;
  const starter=q.starterVerified===null?'':q.starterVerified?' · Starters verified':' · Starters unknown';
  row.innerHTML=`<span class="cq-health-pill" data-state="${E(q.status)}">IMPORT HEALTH · <b>${E(score)}</b> · ${E(q.status)}</span><span class="cq-health-detail"><strong>${E(provider)}</strong>${E(q.total?` · ${q.pass}/${q.total} checks passed`:'')}${E(starter)}</span>`;
  host.appendChild(row);
}
let scheduled=false;
function refresh(){
  normalizeActive();wrapWorkspace();ensureStyle();
  if(scheduled)return;scheduled=true;
  setTimeout(()=>{scheduled=false;renderHealth();},30);
}

const observer=new MutationObserver(refresh);
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('hashchange',refresh);
window.addEventListener('load',refresh);
for(const ms of [0,250,800,1800,3500])setTimeout(refresh,ms);
})();
