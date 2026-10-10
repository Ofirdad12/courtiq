(function(){
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
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
function normalizeVideoInput(target){
 const room=target&&target.closest?target.closest('.cqVideoRoom'):null;
 const input=(room&&room.querySelector('#videoUrl'))||document.querySelector('#videoUrl');
 if(!input)return;
 const normalized=canonicalYouTubeUrl(input.value);
 if(normalized)input.value=normalized;
}
document.addEventListener('click',e=>{const btn=e.target&&e.target.closest?e.target.closest('#loadVideo'):null;if(btn)normalizeVideoInput(btn);},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='videoUrl')normalizeVideoInput(e.target);},true);
window.CourtIQYouTubeLinkFix={extractYouTubeId,canonicalYouTubeUrl};
})();
