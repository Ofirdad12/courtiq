(()=>{
'use strict';
const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,'');
function sameClubTeam(team,club){
  const t=norm(team),name=norm(club?.name),slug=norm(String(club?.slug||'').replace(/-/g,' '));
  if(!t)return false;
  for(const c of [name,slug].filter(Boolean))if(t===c||(Math.min(t.length,c.length)>=7&&(t.includes(c)||c.includes(t))))return true;
  return false;
}
function candidates(games,club){
  const m=new Map();for(const g of games||[]){const u=g?.payload?.ui||g?.ui||g;for(const t of [u?.home??g?.home_team,u?.away??g?.away_team])if(t&&!sameClubTeam(t,club))m.set(t,(m.get(t)||0)+1)}
  return [...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,games])=>({name,games}));
}
async function preferredOpponent(){
  const w=await window.CourtIQData?.workspace?.();if(!w)return '';
  let saved='';try{saved=localStorage.getItem('courtiq_last_opponent')||''}catch(_){}
  if(saved&&!sameClubTeam(saved,w.club))return saved;
  return candidates(w.games,w.club)[0]?.name||'';
}
function patch(){
  const api=window.CourtIQOpponentWorkspace;if(!api?.open||api.__defaultPatchedV223)return false;
  const base=api.open.bind(api);api.open=async()=>{try{const opponent=await preferredOpponent();if(opponent)localStorage.setItem('courtiq_last_opponent',opponent)}catch(_){}return base()};api.__defaultPatchedV223=true;return true;
}
const Core={norm,sameClubTeam,candidates};
if(typeof window!=='undefined'){window.CourtIQOpponentDefault={Core,patch};if(typeof document!=='undefined'){let t;const boot=()=>{if(!patch()){clearTimeout(t);t=setTimeout(boot,80)}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}}
})();
