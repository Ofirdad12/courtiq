(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const MAX_HTML_BYTES=5_000_000;
let selectedHtml='';
let selectedFileName='';

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
  return typeof html==='string'&&html.length>1000&&html.length<=MAX_HTML_BYTES&&
    /<(?:html|body|table|tbody|tr)\b/i.test(html)&&
    (/data-key=["'](?:fgs|threeps|fts|pts|ast|to)["']/i.test(html)||/data-player-id=/i.test(html)||/(?:2\s*נק|3\s*נק|סך\s*הכל|נק['׳])/i.test(html));
}

function clearSelection(){
  selectedHtml='';
  selectedFileName='';
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

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),60000);
  let res;
  try{
    res=await fetch(SUPABASE_URL+'/functions/v1/import-ibba-game-v2',{
      method:'POST',
      headers:{
        apikey:PUBLISHABLE_KEY,
        Authorization:'Bearer '+session.access_token,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({url,club_id:clubId,source_html:sourceHtml}),
      signal:controller.signal
    });
  }catch(error){
    if(error?.name==='AbortError')throw new Error('The uploaded IBBA page took too long to process. CourtIQ stopped safely after 60 seconds.');
    throw error;
  }finally{
    clearTimeout(timer);
  }

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
  const d=window.CourtIQData;
  const current=d?.importOfficialGame;
  if(!current||current.__courtiqIbbaHtmlFallbackV268)return false;

  const base=current.bind(d);
  const wrapper=async function(url,clubId=null){
    if(isIbbaUrl(url)&&selectedHtml){
      if(!looksLikeIbbaHtml(selectedHtml))throw new Error('The selected file does not look like the official IBBA game page. Choose the complete saved HTML page again.');
      const cached=await window.CourtIQImportDatabaseFirstV244?.savedGame?.(url).catch?.(()=>null);
      if(cached){
        clearSelection();
        return cached;
      }
      const result=await postOfficialHtml(url,selectedHtml,true);
      clearSelection();
      return result;
    }
    return base(url,clubId);
  };
  wrapper.__courtiqIbbaHtmlFallbackV268=true;
  wrapper.__courtiqIbbaHtmlFallback=true;
  wrapper.__courtiqBaseImport=current;
  d.importOfficialGame=wrapper;
  return true;
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
  box.innerHTML='<b>IBBA FALLBACK</b> · If automatic IBBA import is blocked, choose the complete saved game page here. On iPhone the picker is intentionally unrestricted; CourtIQ validates the file after selection.<br><input id="ibbaHtmlSource" type="file" style="margin-top:10px;max-width:100%">';
  fields.appendChild(box);

  const input=box.querySelector('#ibbaHtmlSource');
  input?.addEventListener('change',async()=>{
    const file=input.files?.[0];
    if(!file)return;
    clearSelection();

    if(file.size>MAX_HTML_BYTES){
      if(status)status.textContent='IBBA HTML file is too large. Choose the saved game page only (max 5 MB).';
      input.value='';
      return;
    }

    if(/\.webarchive$/i.test(file.name)){
      if(status)status.textContent='Safari Web Archive is not supported. Choose an HTML/HTM file containing the complete IBBA game page.';
      input.value='';
      return;
    }

    let text='';
    try{text=await file.text();}
    catch(_){
      if(status)status.textContent='CourtIQ could not read this file. Choose the saved IBBA HTML page again.';
      input.value='';
      return;
    }

    if(!looksLikeIbbaHtml(text)){
      if(status)status.textContent='This file does not contain the official IBBA box-score structure. Choose the complete game page as HTML/HTM.';
      input.value='';
      return;
    }

    selectedHtml=text;
    selectedFileName=file.name;
    wrapImporter();
    if(status)status.textContent=`IBBA fallback ready · ${file.name} · file loaded. Keep the matching IBBA game link and press IMPORT · VERIFY · SAVE.`;
  });
}

const observer=new MutationObserver(()=>{wrapImporter();enhanceModal();});
function start(){
  wrapImporter();
  enhanceModal();
  observer.observe(document.body,{childList:true,subtree:true});
  // import-database-first-v244 reinstalls itself at 250/1000 ms. Re-apply the
  // file wrapper after those passes so the uploaded HTML route cannot be lost.
  [300,1100,2500,5000].forEach(ms=>setTimeout(()=>{wrapImporter();enhanceModal();},ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('load',()=>{wrapImporter();enhanceModal();},{once:true});
window.CourtIQIbbaHtmlFallback={isIbbaUrl,looksLikeIbbaHtml,postOfficialHtml,wrapImporter,get selectedFile(){return selectedFileName;}};
})();
