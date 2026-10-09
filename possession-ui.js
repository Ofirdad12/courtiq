(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function qualityCards(q){
  return `<div class="pos-kpis">
    <div><small>STATUS</small><b class="${q.status==='COMPLETE'?'ok':q.status==='PARTIAL'?'warn':'bad'}">${esc(q.status)}</b><span>${esc(q.scoreMode||'')}</span></div>
    <div><small>RECONSTRUCTED</small><b>${q.possessions||0}</b><span>event-level possessions</span></div>
    <div><small>CERTIFIED</small><b>${q.certifiedPossessions||0}</b><span>eligible possession rows</span></div>
    <div><small>RAPM GROUPS</small><b>${q.pairedStints||0}</b><span>paired 5v5 lineup groups</span></div>
  </div>`;
}
function warnings(q){
  const items=[...(q.warnings||[])];
  if(q.gaps?.length)items.push(`${q.gaps.length} possession gaps were excluded from RAPM.`);
  if(!items.length)return '<div class="pos-good">All reconstructed possessions in this sample passed the current certification checks.</div>';
  return `<div class="pos-warnings">${items.map(x=>`<div>⚠ ${esc(x)}</div>`).join('')}</div>`;
}
function possessionTable(result,G){
  const rows=result.possessions||[];
  if(!rows.length)return '<div class="pos-empty">No possession sequence is available from this play-by-play feed.</div>';
  return `<div class="pos-scroll"><table><thead><tr><th>#</th><th>Period</th><th>Clock</th><th>Offense</th><th>Pts</th><th>End</th><th>OREB</th><th>FT</th><th>5v5</th><th>RAPM</th></tr></thead><tbody>${rows.slice(0,120).map((p,i)=>`<tr><td>${i+1}</td><td>${p.period}</td><td>${esc(p.startClock)} → ${esc(p.endClock)}</td><td><b>${esc(p.offense==='home'?(G.home||'Home'):(G.away||'Away'))}</b></td><td>${p.points}</td><td>${esc(p.endReason||'—')}</td><td>${p.offensiveRebounds||0}</td><td>${p.freeThrows||0}</td><td>${p.homePlayers&&p.awayPlayers?'YES':'NO'}</td><td><span class="pos-cert ${p.certified?'ok':'bad'}">${p.certified?'CERTIFIED':'EXCLUDED'}</span></td></tr>`).join('')}</tbody></table></div>${rows.length>120?'<p class="pos-note">Showing the first 120 possessions in the audit view.</p>':''}`;
}
function gapList(q){
  if(!q.gaps?.length)return '';
  return `<section class="pos-panel"><div class="pos-title"><div><small>EXCLUSION AUDIT</small><h3>Why possessions were rejected</h3></div><span>${q.gaps.length} gaps</span></div><div class="pos-gap-list">${q.gaps.slice(0,20).map(g=>`<div><b>${esc(g.possession)} · Q${g.period} ${esc(g.clock)}</b><span>${esc((g.reasons||[]).join(' · '))}</span></div>`).join('')}</div></section>`;
}
function render(result,G){const q=result.quality||{};return `<div class="pos-head"><div><small>COURTIQ · POSSESSION ENGINE</small><h2>${esc(G.home||'Home')} vs ${esc(G.away||'Away')} · Possession Audit</h2><p>Official play-by-play is converted into possession endings, then matched to one certified 5v5 lineup interval before RAPM can use it.</p></div><span>v${esc(window.CourtIQPossessionEngine?.version||'')}</span></div>${qualityCards(q)}${warnings(q)}<section class="pos-panel"><div class="pos-title"><div><small>POSSESSION LOG</small><h3>Event-level reconstruction</h3></div><span>${q.homePossessions||0} home · ${q.awayPossessions||0} away</span></div>${possessionTable(result,G)}<p class="pos-note">A possession is not certified merely because a formula estimates one. CourtIQ requires a supported terminal event and a unique 5v5 lineup across that possession.</p></section>${gapList(q)}`;}

function open(){
  const G=window.CourtIQActiveGame;
  let modal=document.querySelector('.possessionModal');if(modal)modal.remove();
  modal=document.createElement('div');modal.className='modal possessionModal';
  modal.innerHTML='<div class="modalCard pos-modal"><button type="button" class="modalX" aria-label="Close Possession Engine">×</button><div class="pos-loading">Auditing play-by-play possessions…</div></div>';
  document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)modal.remove()};modal.querySelector('.modalX').onclick=()=>modal.remove();
  if(!G||!window.CourtIQPossessionEngine){modal.querySelector('.pos-modal').innerHTML='<button type="button" class="modalX">×</button><div class="pos-loading">No active game is available.</div>';modal.querySelector('.modalX').onclick=()=>modal.remove();return;}
  try{const result=window.CourtIQPossessionEngine.derive(G),card=modal.querySelector('.pos-modal');card.innerHTML='<button type="button" class="modalX" aria-label="Close Possession Engine">×</button><div class="pos-body">'+render(result,G)+'</div>';card.querySelector('.modalX').onclick=()=>modal.remove();}
  catch(err){modal.querySelector('.pos-modal').innerHTML='<button type="button" class="modalX">×</button><div class="pos-loading"><b>Possession audit failed.</b><span>'+esc(err?.message||err)+'</span></div>';modal.querySelector('.modalX').onclick=()=>modal.remove();}
}
function install(){
  const pills=document.querySelector('.pills');
  if(pills&&!pills.querySelector('[data-open-possession]')){const b=document.createElement('button');b.type='button';b.className='importBtn';b.dataset.openPossession='1';b.textContent='POSSESSION ENGINE';b.onclick=open;pills.prepend(b);}
}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
window.CourtIQPossessionUI={open,install,render};
})();
