(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const ENDPOINT=SUPABASE_URL+'/functions/v1/send-import-email';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const csvCell=v=>`"${String(v??'').replace(/"/g,'""')}"`;
const safeName=v=>clean(v).replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'game';

function readSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
  catch(_){return null;}
}

function normalize(row){
  if(!row)return null;
  const u=row.payload?.ui||row.ui||row;
  const game={
    ...u,
    _dbId:row.id??u._dbId,
    id:u.id??row.external_id??row.id,
    comp:u.comp??row.competition??'Competition',
    date:u.date??u.date_display??row.game_date??'—',
    home:u.home??row.home_team,
    away:u.away??row.away_team,
    hs:u.hs??row.payload?.raw?.home?.points,
    as:u.as??row.payload?.raw?.away?.points,
    raw:u.raw??row.payload?.raw,
    calculated:u.calculated??row.payload?.calculated,
    players:u.players??row.payload?.ui?.players,
    stats:u.stats??[],
    factors:u.factors??[],
    findings:u.findings??[],
    sourceUrl:u.sourceUrl??row.source_url??row.url??'',
    sourceLabel:u.sourceLabel??row.provider??'COURTIQ DATA'
  };
  return game.home&&game.away?game:null;
}

async function getGame(){
  const active=normalize(window.CourtIQActiveGame);
  if(active)return active;
  try{
    const workspace=await window.CourtIQData?.workspace?.();
    const games=(workspace?.games||[]).map(normalize).filter(Boolean);
    if(games.length)return games[0];
  }catch(error){console.warn('CourtIQ email export workspace lookup failed',error);}
  return null;
}

function exportShape(game){
  return {
    id:game.id??null,
    competition:game.comp??null,
    date:game.date??null,
    home:game.home??null,
    away:game.away??null,
    home_score:game.hs??null,
    away_score:game.as??null,
    source_label:game.sourceLabel??null,
    source_url:game.sourceUrl??null,
    raw:game.raw??null,
    calculated:game.calculated??null,
    stats:Array.isArray(game.stats)?game.stats:[],
    factors:Array.isArray(game.factors)?game.factors:[],
    players:game.players??null,
    findings:Array.isArray(game.findings)?game.findings:[]
  };
}

function csv(game){
  const rows=[];
  const add=(section,key,home,away)=>rows.push([section,key,home,away]);
  add('GAME','Competition',game.comp,'');
  add('GAME','Date',game.date,'');
  add('GAME','Matchup',game.home,game.away);
  add('GAME','Score',game.hs,game.as);
  add('GAME','Source',game.sourceLabel,game.sourceUrl||'');
  for(const row of Array.isArray(game.stats)?game.stats:[])add('TEAM STATS',row?.[0],row?.[1],row?.[2]);
  for(const row of Array.isArray(game.factors)?game.factors:[])add('FOUR FACTORS',row?.[0],row?.[1],row?.[2]);
  const h=game.calculated?.home||{},a=game.calculated?.away||{};
  for(const [label,key] of [['Possessions','possessions'],['Pace','pace'],['ORtg','ortg'],['DRtg','drtg'],['Net Rating','net_rating'],['eFG%','efg'],['TOV%','tov'],['ORB%','orb'],['FTr','ftr']]){
    if(h[key]!=null||a[key]!=null)add('ADVANCED',label,h[key]??'',a[key]??'');
  }
  rows.push([]);
  rows.push(['PLAYERS','Team','Player','MIN','PTS','REB','AST','TS%','eFG%','+/-']);
  for(const [side,team] of [['home',game.home],['away',game.away]]){
    for(const p of game.players?.[side]||[]){
      rows.push(['PLAYER',team,p.name??'',p.minutes??'',p.points??'',p.rebounds??((Number(p.oreb)||0)+(Number(p.dreb)||0)),p.ast??'',p.ts??'',p.efg??'',p.plus_minus??'']);
    }
  }
  return rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
}

function fileFor(game,format){
  const stem=`CourtIQ-${safeName(game.home)}-vs-${safeName(game.away)}`;
  if(format==='csv')return {name:stem+'.csv',type:'text/csv;charset=utf-8',content:'\uFEFF'+csv(game)};
  if(format==='json')return {name:stem+'.json',type:'application/json;charset=utf-8',content:JSON.stringify(exportShape(game),null,2)};
  return null;
}

function downloadFile(file){
  if(!file)return null;
  const blob=new Blob([file.content],{type:file.type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=file.name;a.style.display='none';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return file.name;
}

function summary(game){
  const h=game.calculated?.home||{},a=game.calculated?.away||{};
  const line=(label,key)=>h[key]!=null||a[key]!=null?`${label}: ${h[key]??'—'} / ${a[key]??'—'}`:null;
  return [
    'CourtIQ — Imported Game',
    `${game.home} ${game.hs??'—'} - ${game.as??'—'} ${game.away}`,
    `${game.comp||'Competition'} · ${game.date||'—'}`,
    '',
    line('Possessions','possessions'),line('ORtg','ortg'),line('DRtg','drtg'),line('Net Rating','net_rating'),line('eFG%','efg'),line('TOV%','tov'),line('ORB%','orb'),line('FTr','ftr'),
    '',
    game.sourceLabel?`Source: ${game.sourceLabel}`:null,
    game.sourceUrl?game.sourceUrl:null,
    '',
    'Generated by CourtIQ. Tactical conclusions require video verification.'
  ].filter(v=>v!=null).join('\n');
}

function openMailApp(to,game,format){
  const file=fileFor(game,format);
  const filename=downloadFile(file);
  const subject=`CourtIQ · ${game.home} vs ${game.away}`;
  let body=summary(game);
  if(filename)body+=`\n\nAttachment prepared: ${filename}\nAttach the downloaded file before sending.`;
  const href=`mailto:${encodeURIComponent(to||'')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href=href;
  return filename;
}

async function sendAutomatic(to,game,format){
  const session=readSession();
  if(!session?.access_token){const e=new Error('Sign in before sending directly from CourtIQ.');e.code='NO_SESSION';throw e;}
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),18000);
  let response;
  try{
    response=await fetch(ENDPOINT,{
      method:'POST',
      headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({to,format,game:exportShape(game),request_id:crypto.randomUUID?.()||String(Date.now())}),
      signal:controller.signal
    });
  }finally{clearTimeout(timer);}
  const raw=await response.text();
  let body={};
  try{body=raw?JSON.parse(raw):{};}catch(_){body={};}
  if(!response.ok){const e=new Error(body.error||body.message||`Email service returned HTTP ${response.status}.`);e.code=body.code||`HTTP_${response.status}`;throw e;}
  return body;
}

function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254;}

function addStyles(){
  if(document.getElementById('courtiq-email-export-style'))return;
  const s=document.createElement('style');s.id='courtiq-email-export-style';s.textContent=`
    .emailExportBtn{border:1px solid rgba(34,197,94,.48);background:rgba(34,197,94,.12);color:#dfffea;border-radius:9px;padding:8px 11px;font:700 11px inherit;cursor:pointer}
    .emailExportBtn:hover{background:rgba(34,197,94,.2)}
    .emailExportCard{width:min(92vw,560px)!important;max-width:560px!important}
    .emailExportForm{display:grid;gap:12px;margin-top:16px}
    .emailExportForm label{display:grid;gap:6px;font-size:12px;color:#aebbd0}
    .emailExportForm input,.emailExportForm select{width:100%;padding:11px 12px;border-radius:9px;border:1px solid #334155;background:#0b1322;color:#fff;font:inherit}
    .emailExportActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
    .emailExportSecondary{border:1px solid #334155;background:#111b2c;color:#dbe7f7;border-radius:9px;padding:10px 12px;font:700 11px inherit;cursor:pointer}
    .emailExportStatus{min-height:20px;font-size:12px;color:#9fb0c7}
    .emailExportStatus[data-kind="ok"]{color:#86efac}.emailExportStatus[data-kind="error"]{color:#fca5a5}.emailExportStatus[data-kind="warn"]{color:#fde68a}
  `;document.head.appendChild(s);
}

async function open(){
  addStyles();
  const game=await getGame();
  if(!game){alert('Import or open a game before emailing it.');return;}
  const session=readSession();
  const modal=document.createElement('div');modal.className='modal';
  modal.innerHTML=`<div class="modalCard compareModal emailExportCard"><button class="modalX">×</button><small class="eyebrow">COURTIQ · EMAIL EXPORT</small><h2>Send imported game by email</h2><p>${esc(game.home)} ${esc(game.hs??'—')} - ${esc(game.as??'—')} ${esc(game.away)}</p><div class="emailExportForm"><label>Recipient email<input id="courtiqEmailTo" type="email" inputmode="email" autocomplete="email" placeholder="coach@club.com" value="${esc(session?.user?.email||'')}"></label><label>Export format<select id="courtiqEmailFormat"><option value="summary">Email summary</option><option value="csv">Summary + CSV attachment</option><option value="json">Summary + JSON attachment</option></select></label><div class="emailExportActions"><button class="runImport" id="courtiqSendEmail">SEND EMAIL</button><button class="emailExportSecondary" id="courtiqOpenMail">OPEN MAIL APP</button><button class="emailExportSecondary" id="courtiqDownload">DOWNLOAD FILE</button></div><div class="emailExportStatus" id="courtiqEmailStatus"></div></div></div>`;
  document.body.appendChild(modal);
  const card=modal.querySelector('.emailExportCard'),status=card.querySelector('#courtiqEmailStatus'),to=card.querySelector('#courtiqEmailTo'),format=card.querySelector('#courtiqEmailFormat'),send=card.querySelector('#courtiqSendEmail');
  const setStatus=(text,kind='')=>{status.textContent=text;status.dataset.kind=kind;};
  const close=()=>modal.remove();
  card.querySelector('.modalX').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};
  card.querySelector('#courtiqDownload').onclick=()=>{const file=fileFor(game,format.value);if(!file)return setStatus('Choose CSV or JSON to download a file.','warn');downloadFile(file);setStatus(`${file.name} downloaded.`,'ok');};
  card.querySelector('#courtiqOpenMail').onclick=()=>{const address=clean(to.value);if(address&&!validEmail(address))return setStatus('Enter a valid email address.','error');const filename=openMailApp(address,game,format.value);setStatus(filename?'Mail app opened; attach the downloaded file before sending.':'Mail app opened with the CourtIQ summary.','ok');};
  send.onclick=async()=>{
    const address=clean(to.value);
    if(!validEmail(address))return setStatus('Enter a valid recipient email address.','error');
    send.disabled=true;setStatus('Sending…');
    try{
      const result=await sendAutomatic(address,game,format.value);
      setStatus(result?.id?`Sent successfully · ${result.id}`:'Sent successfully.','ok');
    }catch(error){
      console.warn('CourtIQ direct email unavailable',error);
      const filename=openMailApp(address,game,format.value);
      const reason=error?.code==='EMAIL_NOT_CONFIGURED'?'Direct email is not configured yet. ':'';
      setStatus(reason+(filename?'Mail app opened and the attachment was downloaded.':'Mail app opened with the report ready to send.'),'warn');
    }finally{send.disabled=false;}
  };
}

function inject(){
  addStyles();
  const pills=document.querySelector('.pills');
  if(pills&&!document.getElementById('emailImportExport')){
    const b=document.createElement('button');b.id='emailImportExport';b.className='emailExportBtn';b.textContent='EMAIL IMPORT';b.title='Send the active imported game by email';b.onclick=open;
    const pdf=document.getElementById('pdfReportCenter');pdf?.insertAdjacentElement('afterend',b)||pills.appendChild(b);
  }
}

window.CourtIQEmailExport={open,getGame,sendAutomatic};
let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(inject,50)}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
})();
