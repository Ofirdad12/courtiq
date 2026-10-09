(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'—';

async function loadRows(){
  if(window.CourtIQData?.isSignedIn?.()){
    const w=await window.CourtIQData.workspace();
    return {rows:w.games||[],club:w.club||null};
  }
  return {rows:window.CourtIQActiveGame?[window.CourtIQActiveGame]:[],club:null};
}

function readiness(model){
  const c=model.sourceCoverage||{},m=model.coverage||{};
  return `<div class="rapm-readiness">
    <div><small>OFFICIAL GAMES</small><b>${c.games||0}</b><span>loaded into sample</span></div>
    <div><small>LINEUP COVERAGE</small><b>${c.gamesWithAnyLineups||0}</b><span>games with reconstructed lineups</span></div>
    <div><small>POSSESSION STINTS</small><b>${c.gamesWithPossessionStints||0}</b><span>games eligible for RAPM</span></div>
    <div><small>MODEL POSSESSIONS</small><b>${Math.round(m.totalPossessions||0)}</b><span>${m.stints||0} paired stints</span></div>
  </div>`;
}

function reasonBox(model){
  if(model.status==='READY')return '';
  return `<section class="rapm-panel rapm-blocked"><div class="rapm-title"><div><small>PUBLICATION GUARDRAIL</small><h3>RAPM is not publishable yet</h3></div><span>NO FAKE METRICS</span></div>
    <p>CourtIQ will only publish RAPM from 5v5 lineup stints with explicit offensive possession counts. Time-only plus/minus is not relabeled as RAPM.</p>
    <div class="rapm-reasons">${(model.reasons||[]).map((r,i)=>`<div><b>${i+1}</b><span>${esc(r)}</span></div>`).join('')}</div>
    <div class="rapm-next"><b>Data required next</b><span>Complete Play-by-Play → certified five-player lineups → possession counts for each offense → ridge model.</span></div>
  </section>`;
}

function table(model,team=''){
  if(model.status!=='READY')return '';
  const rows=(model.players||[]).filter(p=>!team||p.team===team);
  return `<section class="rapm-panel"><div class="rapm-title"><div><small>PLAYER IMPACT</small><h3>Regularized Adjusted Plus-Minus</h3></div><span>${esc(model.diagnostics?.scale||'')}</span></div>
    <div class="rapm-scroll"><table><thead><tr><th>#</th><th>Player</th><th>Team</th><th>O-RAPM</th><th>D-RAPM</th><th>Total RAPM</th><th>Off Poss</th><th>Def Poss</th><th>Games</th><th>Confidence</th></tr></thead>
    <tbody>${rows.map((p,i)=>`<tr><td>${i+1}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.team)}</td><td class="num ${p.oRAPM>=0?'pos':'neg'}">${p.oRAPM>=0?'+':''}${fmt(p.oRAPM)}</td><td class="num ${p.dRAPM>=0?'pos':'neg'}">${p.dRAPM>=0?'+':''}${fmt(p.dRAPM)}</td><td class="num total ${p.totalRAPM>=0?'pos':'neg'}">${p.totalRAPM>=0?'+':''}${fmt(p.totalRAPM)}</td><td>${Math.round(p.offPossessions)}</td><td>${Math.round(p.defPossessions)}</td><td>${p.games}</td><td><span class="rapm-conf ${String(p.confidenceBand).toLowerCase()}">${p.confidence}% · ${p.confidenceBand}</span></td></tr>`).join('')}</tbody></table></div>
    <p class="rapm-note">O-RAPM estimates offensive scoring impact after teammate/opponent adjustment. D-RAPM is signed so positive means fewer points allowed. Total RAPM = O-RAPM + D-RAPM. Values are ridge-shrunk toward zero.</p>
  </section>`;
}

function diagnostics(model){
  if(model.status!=='READY')return '';
  const d=model.diagnostics||{};
  return `<div class="rapm-grid">
    <section class="rapm-panel"><div class="rapm-title"><div><small>MODEL DIAGNOSTICS</small><h3>Ridge specification</h3></div></div><div class="rapm-metrics">
      <div><span>λ shrinkage</span><b>${fmt(d.lambda,0)}</b></div><div><span>Weighted RMSE</span><b>${fmt(d.weightedRMSE)}</b></div><div><span>League intercept</span><b>${fmt(d.intercept)}</b></div><div><span>Observations</span><b>${model.coverage?.observations||0}</b></div>
    </div><p class="rapm-note">The intercept is the sample scoring baseline. Player coefficients are estimated simultaneously with ridge regularization to reduce instability from correlated lineups.</p></section>
    <section class="rapm-panel"><div class="rapm-title"><div><small>INTERPRETATION</small><h3>How coaches should use it</h3></div></div><div class="rapm-coach">
      <div><b>1</b><p>Use RAPM as an impact signal, not a role-independent player ranking.</p></div><div><b>2</b><p>Compare with minutes, lineup role, opponent quality and film evidence.</p></div><div><b>3</b><p>Low-confidence samples stay visibly labeled and should not drive recruitment decisions alone.</p></div>
    </div></section>
  </div>`;
}

function render(model,selectedTeam=''){
  const teams=[...new Set((model.players||[]).map(p=>p.team))].sort();
  const team=teams.includes(selectedTeam)?selectedTeam:(teams[0]||'');
  return `<div class="rapm-head"><div><small>COURTIQ · RAPM ENGINE</small><h2>Possession-aware ridge impact model</h2><p>Adjusted player impact from simultaneous 5v5 lineup context — with sample thresholds, shrinkage and transparent confidence.</p></div><span>v${esc(window.CourtIQRAPM?.version||'')}</span></div>
    ${readiness(model)}
    ${model.status==='READY'?`<div class="rapm-toolbar"><label>Team<select class="rapm-team"><option value="">All teams</option>${teams.map(t=>`<option${t===team?' selected':''}>${esc(t)}</option>`).join('')}</select></label><label>Ridge λ<select class="rapm-lambda"><option value="100">100 · lighter shrinkage</option><option value="250" selected>250 · default</option><option value="500">500 · stronger shrinkage</option></select></label></div>`:''}
    ${reasonBox(model)}${table(model,team)}${diagnostics(model)}`;
}

async function open(){
  let modal=document.querySelector('.rapmModal');if(modal)modal.remove();
  modal=document.createElement('div');modal.className='modal rapmModal';
  modal.innerHTML='<div class="modalCard rapm-modal"><button type="button" class="modalX" aria-label="Close RAPM Engine">×</button><div class="rapm-loading"><b>Building RAPM sample…</b><span>Auditing lineup and possession coverage.</span></div></div>';
  document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)modal.remove()};modal.querySelector('.modalX').onclick=()=>modal.remove();
  try{
    const {rows}=await loadRows();
    const draw=(lambda=250,team='')=>{
      const model=window.CourtIQRAPM.fitGames(rows,{lambda});
      const card=modal.querySelector('.rapm-modal');
      card.innerHTML='<button type="button" class="modalX" aria-label="Close RAPM Engine">×</button><div class="rapm-body">'+render(model,team)+'</div>';
      card.querySelector('.modalX').onclick=()=>modal.remove();
      card.querySelector('.rapm-team')?.addEventListener('change',e=>draw(Number(card.querySelector('.rapm-lambda')?.value||lambda),e.target.value));
      card.querySelector('.rapm-lambda')?.addEventListener('change',e=>draw(Number(e.target.value),card.querySelector('.rapm-team')?.value||team));
    };
    draw();
  }catch(err){
    modal.querySelector('.rapm-modal').innerHTML='<button type="button" class="modalX" aria-label="Close RAPM Engine">×</button><div class="rapm-loading"><b>RAPM Engine could not load the season sample.</b><span>'+esc(err?.message||err)+'</span></div>';
    modal.querySelector('.modalX').onclick=()=>modal.remove();
  }
}

function install(){
  const pills=document.querySelector('.pills');
  if(pills&&!pills.querySelector('[data-open-rapm]')){
    const b=document.createElement('button');b.type='button';b.className='importBtn primaryAction';b.dataset.openRapm='1';b.textContent='RAPM ENGINE';b.onclick=open;pills.prepend(b);
  }
  const toolbar=document.querySelector('.seasonDataScienceModal .sds-toolbar');
  if(toolbar&&!toolbar.querySelector('[data-open-rapm]')){
    const b=document.createElement('button');b.type='button';b.className='importBtn';b.dataset.openRapm='1';b.textContent='OPEN RAPM ENGINE';b.onclick=open;toolbar.appendChild(b);
  }
}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
window.CourtIQRAPMUI={open,install};
})();