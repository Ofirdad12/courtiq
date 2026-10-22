(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const MAX_HTML_BYTES=5_000_000;
let selectedHtml='';
let selectedFileName='';
let wrapped=false;

function readSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
  catch(_){return null;}
}

function isIbbaUrl(raw){
  try{
    const u=new URL(String(raw||'').trim());
    return /^(?:www\.)?ibasketball\.co\.il$/i.test(u.hostname)&&/^\/match\/[a-z0-9-]+\/?$/i.test(u.pathname);
  }catch(_){return false;}
}

function looksLikeIbbaHtml(html){
  return typeof html==='string'&&html.length>1000&&
    /<(?:html|body|table|tbody|tr)\b/i.test(html)&&
    (/data-key=["'](?:fgs|threeps|fts|pts|ast|to)["']/i.test(html)||/data-player-id=/i.test(html)||/(?:2\s*נק|3\s*נק|סך\s*הכל|נק['׳])/i.test(html));
}

async function resolveClubId(){
  const helper=window.CourtIQImportDatabaseFirstV244;
  if(helper?.resolveClubId)return helper.resolveClubId(null);
  try{return Number((await window.CourtIQData?.workspace?.())?.club?.id||0)||null;}
  catch(_){return null;}
}

async function postOfficialHtml(url,sourceHtml,retry=true){
  let session=readSession();
  if(!session?.access_token)throw new Error('Sign in before importing a game.');
  const clubId=await resolveClubId();
  if(!clubId)throw new Error('Select a club before importing this game.');

  const res=await fetch(SUPABASE_URL+'/functions/v1/import-ibba-game-v2',{
    method:'POST',
    headers:{
      apikey:PUBLISHABLE_KEY,
      Authorization:'Bearer '+session.access_token,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({url,club_id:clubId,source_html:sourceHtml})
  });

  const raw=await res.text();
  let body=null;
  try{body=raw?JSON.parse(raw):null;}catch(_){}

  if(res.status===401&&retry&&window.CourtIQData?.refreshSession){
    const refreshed=await window.CourtIQData.refreshSession();
    if(refreshed)return postOfficialHtml(url,sourceHtml,false);
  }
  if(!res.ok){
    throw new Error(body?.error||body?.message||raw||`IBBA import failed (HTTP ${res.status}).`);
  }
  if(!body||typeof body!=='object')throw new Error('CourtIQ import service returned an invalid response.');
  return {...body,club_id:body.club_id||clubId,source:'ibba_browser_official_html'};
}

function wrapImporter(){
  if(wrapped||!window.CourtIQData?.importOfficialGame)return;
  const base=window.CourtIQData.importOfficialGame.bind(window.CourtIQData);
  window.CourtIQData.importOfficialGame=async function(url,clubId=null){
    if(isIbbaUrl(url)&&selectedHtml){
      if(!looksLikeIbbaHtml(selectedHtml))throw new Error('The selected file does not look like the official IBBA game page. Save the complete webpage as HTML and choose it again.');
      const cached=await window.CourtIQImportDatabaseFirstV244?.savedGame?.(url).catch?.(()=>null);
      if(cached)return cached;
      const result=await postOfficialHtml(url,selectedHtml,true);
      selectedHtml='';selectedFileName='';
      return result;
    }
    return base(url,clubId);
  };
  window.CourtIQData.importOfficialGame.__courtiqIbbaHtmlFallback=true;
  wrapped=true;
}

function enhanceModal(){
  const modal=document.querySelector('#runUrl')?.closest('.modal');
  if(!modal||modal.querySelector('[data-ibba-html-fallback]'))return;
  const fields=modal.querySelector('.importFields');
  const status=modal.querySelector('#urlStatus');
  if(!fields)return;

  const box=document.createElement('div');
  box.dataset.ibbaHtmlFallback='1';
  box.className='schema';
  box.innerHTML='<b>IBBA FALLBACK</b> · If IBBA blocks the automatic server request, save the official game page as an HTML file and choose it here. CourtIQ will run the same parser and validation pipeline.<br><input id="ibbaHtmlSource" type="file" accept=".html,.htm,text/html" style="margin-top:10px;max-width:100%">';
  fields.appendChild(box);

  const input=box.querySelector('#ibbaHtmlSource');
  input?.addEventListener('change',async()=>{
    const file=input.files?.[0];
    if(!file)return;
    if(file.size>MAX_HTML_BYTES){
      selectedHtml='';selectedFileName='';
      if(status)status.textContent='IBBA HTML file is too large. Choose the saved game page only.';
      return;
    }
    const text=await file.text();
    if(!looksLikeIbbaHtml(text)){
      selectedHtml='';selectedFileName='';
      if(status)status.textContent='This file does not contain the official IBBA box-score structure. Save the complete game webpage as HTML and choose it again.';
      return;
    }
    selectedHtml=text;
    selectedFileName=file.name;
    if(status)status.textContent=`IBBA fallback ready · ${file.name} · paste the matching official IBBA game link and press IMPORT · VERIFY · SAVE.`;
  });
}

const observer=new MutationObserver(()=>{wrapImporter();enhanceModal();});
function start(){wrapImporter();enhanceModal();observer.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('load',()=>{wrapImporter();enhanceModal();},{once:true});
window.CourtIQIbbaHtmlFallback={isIbbaUrl,looksLikeIbbaHtml,postOfficialHtml,get selectedFile(){return selectedFileName;}};
})();
