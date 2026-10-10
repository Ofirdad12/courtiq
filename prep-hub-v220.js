(()=>{
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function prepState(health,savedReports=0){
  const games=Number(health?.counts?.games)||0;
  const checks=health?.checks||{};
  return {
    games,
    validated:checks.importValidated===true,
    sampleReady:games>=3,
    strongSample:games>=5,
    memoryReady:games>=3,
    reports:Number(savedReports)||0,
    reportReady:(Number(savedReports)||0)>0,
    roster:Number(health?.counts?.roster)||0
  };
}
function nextCoachAction(state){
  if(!state.games)return {key:'import',title:'Import the opponent',text:'Start with 3–5 official games so CourtIQ can build a verified evidence base.'};
  if(!state.validated)return {key:'games',title:'Resolve data quality first',text:'Do not scout from uncertain data. Open Games and review the latest Import Health result.'};
  if(!state.sampleReady)return {key:'import',title:'Complete the sample',text:`${state.games}/3 games loaded. Add official games before drawing opponent trends.`};
  if(!state.reportReady)return {key:'scouting',title:'Build the game plan',text:'The sample is ready. Generate opponent scouting, then turn it into a one-page Coach Brief.'};
  return {key:'reports',title:'Review the saved game plan',text:'A reusable report exists. Review it, compare recent form, then monitor the live KPIs you selected.'};
}
function coachSteps(state){
  return [
    {n:1,key:'import',title:'IMPORT',text:'Official data only',done:state.sampleReady,meta:`${state.games} games`},
    {n:2,key:'scouting',title:'SCOUT',text:'Opponent tendencies + evidence',done:state.sampleReady&&state.validated,meta:state.strongSample?'strong sample':state.sampleReady?'minimum sample':'needs 3 games'},
    {n:3,key:'coach-brief',title:'COACH BRIEF',text:'Priorities + decisions + confidence',done:state.reportReady,meta:state.reportReady?'saved output':'generate next'},
    {n:4,key:'reports',title:'SAVE / REVIEW',text:'Reusable pre-game snapshot',done:state.reportReady,meta:`${state.reports} saved`}
  ];
}
function confidenceLabel(state){if(state.strongSample&&state.validated)return 'STRONG SAMPLE';if(state.sampleReady&&state.validated)return 'USABLE SAMPLE';return 'BUILDING SAMPLE'}

function action(key,close){
  const byId={scouting:'scoutingReportFlow','coach-brief':'coachBriefFlow',season:'seasonMemoryFlow'};
  const id=byId[key],el=id&&document.getElementById(id);
  if(el){close?.();el.click();return true}
  if(key==='reports'&&window.CourtIQReportLibrary?.open){close?.();window.CourtIQReportLibrary.open();return true}
  if(key==='coach-brief')key='coach';
  if(window.CourtIQAppActions?.run?.(key)){close?.();return true}
  return false;
}
async function load(){
  if(!window.CourtIQData?.isSignedIn?.())throw new Error('Sign in to open the Game Prep Hub.');
  const health=await window.CourtIQData.productHealth();
  let saved=0;
  try{const lib=await window.CourtIQReportLibrary?.rows?.();saved=Array.isArray(lib?.rows)?lib.rows.length:0}catch(_){saved=0}
  return {health,state:prepState(health,saved)};
}
function render(root,data,close){
  const {health,state}=data,next=nextCoachAction(state),steps=coachSteps(state);
  root.innerHTML=`<header class="phHero"><div><small>COURTIQ · GAME PREP</small><h2>${E(health.club?.name||'Club workspace')}</h2><p>${E(confidenceLabel(state))} · ${state.games} official games · ${state.reports} saved reports</p></div><button class="phImport" data-go="import">+ IMPORT GAME</button></header>
  <section class="phNext"><small>NEXT BEST ACTION</small><h3>${E(next.title)}</h3><p>${E(next.text)}</p><button data-go="${E(next.key)}">CONTINUE →</button></section>
  <section><div class="phSectionTitle"><div><small>COACH WORKFLOW</small><h3>From official data to game plan</h3></div><span>Do not explain every metric. Show the decision.</span></div><div class="phFlow">${steps.map(s=>`<article data-done="${s.done?'1':'0'}"><i>${s.done?'✓':s.n}</i><div><small>${E(s.title)}</small><b>${E(s.text)}</b><span>${E(s.meta)}</span></div><button data-go="${E(s.key)}">OPEN</button></article>`).join('')}</div></section>
  <section class="phQuick"><button data-go="season"><span>◈</span><b>Season Memory</b><small>Season vs Last 5 vs Last 3</small></button><button data-go="reports"><span>▤</span><b>Report Library</b><small>Saved coach-ready snapshots</small></button><button data-go="games"><span>▣</span><b>Games & Quality</b><small>Sources, validation and evidence</small></button></section>`;
  root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{if(!action(b.dataset.go,close))alert('This workflow is not available on the current screen yet.')});
}
async function open(){
  document.getElementById('cqPrepHub')?.remove();
  const modal=document.createElement('div');modal.id='cqPrepHub';modal.className='modal';
  modal.innerHTML='<div class="modalCard phCard"><button class="modalX" aria-label="Close">×</button><p class="phLoading">Building your game-prep workspace…</p><div class="phBody"></div></div>';
  document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modalX').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  try{const data=await load();modal.querySelector('.phLoading').remove();render(modal.querySelector('.phBody'),data,close)}catch(e){modal.querySelector('.phLoading').textContent=e.message}
}
function style(){
  if(document.getElementById('cqPrepHubStyle'))return;const s=document.createElement('style');s.id='cqPrepHubStyle';
  s.textContent='.phCard{max-width:980px}.phHero{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.phHero h2{font-size:30px;margin:4px 0}.phHero p,.phSectionTitle span,.phFlow span,.phQuick small{color:#8ea4b8}.phImport,.phNext button,.phFlow button{border:1px solid rgba(255,255,255,.14);background:#13283b;color:#fff;border-radius:9px;padding:9px 13px;cursor:pointer}.phImport{background:#fff;color:#07101d;font-weight:800}.phNext{margin:18px 0;border:1px solid rgba(71,207,137,.3);background:rgba(55,184,119,.08);border-radius:14px;padding:16px}.phNext small,.phSectionTitle small{font-size:9px;letter-spacing:.12em;color:#7d94a9}.phNext h3{margin:4px 0}.phNext p{color:#a3b4c4}.phSectionTitle{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:18px 0 9px}.phSectionTitle h3{margin:3px 0}.phFlow{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.phFlow article{display:flex;flex-direction:column;gap:10px;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:12px;min-height:170px;background:rgba(255,255,255,.025)}.phFlow article[data-done="1"]{border-color:rgba(63,201,130,.28)}.phFlow i{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;font-style:normal;background:rgba(255,255,255,.07)}.phFlow div{display:flex;flex:1;flex-direction:column;gap:5px}.phFlow small{font-size:9px;letter-spacing:.1em}.phFlow b{font-size:13px}.phFlow span{font-size:11px}.phQuick{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:18px}.phQuick button{display:grid;grid-template-columns:34px 1fr;text-align:left;gap:2px 8px;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:11px;background:rgba(255,255,255,.025);color:#fff;cursor:pointer}.phQuick span{grid-row:1/3;font-size:22px}.phQuick small{grid-column:2;font-size:11px}@media(max-width:760px){.phFlow{grid-template-columns:1fr 1fr}.phQuick{grid-template-columns:1fr}.phHero,.phSectionTitle{align-items:flex-start;flex-direction:column}}@media(max-width:480px){.phFlow{grid-template-columns:1fr}}';document.head.appendChild(s)
}
function boot(){style()}
const Core={prepState,nextCoachAction,coachSteps,confidenceLabel};
if(typeof window!=='undefined'){window.CourtIQPrepHub={open,Core};if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}}
})();
