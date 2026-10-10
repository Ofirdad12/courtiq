(function(){
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
let autoTimer=null,lastAutoUrl='';
function extractYouTubeId(value){
 let raw=String(value||'').trim();
 if(VIDEO_ID.test(raw))return raw;
 if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)){
  if(/^(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i.test(raw))raw='https://'+raw;
  else return null;
 }
 try{
  const u=new URL(raw),host=u.hostname.toLowerCase().replace(/^www\./,'');
  let id=null;
  if(host==='youtu.be')id=u.pathname.split('/').filter(Boolean)[0]||null;
  else if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)){
   if(u.pathname==='/watch')id=u.searchParams.get('v');
   else{
    const parts=u.pathname.split('/').filter(Boolean);
    if(['embed','shorts','live','v'].includes(parts[0]))id=parts[1]||null;
   }
  }
  return VIDEO_ID.test(id||'')?id:null;
 }catch(_){return null}
}
function canonicalYouTubeUrl(value){const id=extractYouTubeId(value);return id?'https://youtu.be/'+id:null;}
function roomFor(target){return target&&target.closest?target.closest('.cqVideoRoom'):null;}
function normalizeVideoInput(target){
 const room=roomFor(target),input=(room&&room.querySelector('#videoUrl'))||document.querySelector('#videoUrl');
 if(!input)return null;
 const normalized=canonicalYouTubeUrl(input.value);
 if(normalized)input.value=normalized;
 return normalized;
}
function autoLoad(target,immediate){
 const room=roomFor(target),input=(room&&room.querySelector('#videoUrl'))||target;
 if(!input||input.id!=='videoUrl')return;
 const normalized=canonicalYouTubeUrl(input.value);
 clearTimeout(autoTimer);
 if(!normalized)return;
 const run=()=>{
  if(!input.isConnected)return;
  const activeRoom=roomFor(input),btn=activeRoom&&activeRoom.querySelector('#loadVideo');
  if(!btn)return;
  input.value=normalized;
  const current=window.CourtIQVideo&&window.CourtIQVideo.state?window.CourtIQVideo.state():null;
  const id=extractYouTubeId(normalized);
  if(current&&current.videoId===id){
   const status=activeRoom.querySelector('#videoStatus');
   if(status)status.textContent='YouTube video already connected.';
   return;
  }
  if(lastAutoUrl===normalized)return;
  lastAutoUrl=normalized;
  const status=activeRoom.querySelector('#videoStatus');
  if(status)status.textContent='YouTube link detected · loading automatically…';
  btn.click();
 };
 if(immediate)run();else autoTimer=setTimeout(run,350);
}
document.addEventListener('click',e=>{const btn=e.target&&e.target.closest?e.target.closest('#loadVideo'):null;if(btn)normalizeVideoInput(btn);},true);
document.addEventListener('input',e=>{if(e.target&&e.target.id==='videoUrl')autoLoad(e.target,false);},true);
document.addEventListener('paste',e=>{if(e.target&&e.target.id==='videoUrl')setTimeout(()=>autoLoad(e.target,true),0);},true);
document.addEventListener('change',e=>{if(e.target&&e.target.id==='videoUrl')autoLoad(e.target,true);},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='videoUrl'){e.preventDefault();normalizeVideoInput(e.target);autoLoad(e.target,true);}},true);
window.CourtIQYouTubeLinkFix={extractYouTubeId,canonicalYouTubeUrl,autoLoad};
})();
