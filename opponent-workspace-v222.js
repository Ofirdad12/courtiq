(()=>{
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const O=v=>N(v)==null?'—':(Math.round(Number(v)*10)/10).toFixed(1);
const P=v=>N(v)==null?'—':O(v)+'%';
function normalize(r){
  if(window.CourtIQReportLibrary?.Core?.normalize)return window.CourtIQReportLibrary.Core.normalize(r);
  if(!r)return null;const u=r.payload?.ui||r.ui||r;
  const g={...u,_dbId:r.id??u._dbId,id:u.id??r.external_id??r.id,comp:u.comp??r.competition??'Competition',date:u.date??u.date_display??r.game_date??'—',home:u.home??r.home_team,away:u.away??r.away_team,hs:u.hs??r.payload?.raw?.home?.points,as:u.as??r.payload?.raw?.away?.points,raw:u.raw??r.payload?.raw,players:u.players??r.payload?.ui?.players,sourceUrl:u.sourceUrl??u.source_url??r.source_url??r.sourceUrl,sourceLabel:u.sourceLabel??r.provider??'COURTIQ VERIFIED DATA'};
  return g.home&&g.away?g:null;
}
function candidateTeams(games){
  const m=new Map();for(const g of games||[])for(const t of [g?.home,g?.away])if(t)m.set(t,(m.get(t)||0)+1);
  return [...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,games])=>({name,games}));
}
function splitDecisions(decisions){
  const attack=[],defend=[];for(const d of decisions||[]){const text=`${d?.title||''} ${d?.action||''}`;(/בהתקפה|attack/i.test(text)?attack:defend).push(d)}
  return {attack,defend};
}
function trendSignals(trend){
  if(!trend?.ready)return [];
  const out=[];for(const [k,label,suffix] of [['pf','נק׳',''],['pa','ספיגה',''],['efg','eFG','pp'],['three','3P','pp'],['tov','איבודים',''],['oreb','ריב׳ התקפה','']]){const v=N(trend?.deltas?.[k]);if(v!=null)out.push({key:k,label,value:v,suffix});}
  return out.sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,4);
}
function scopeGames(games,team,competition,windowSize,S){
  let x=S.teamGames((games||[]).map(normalize).filter(Boolean),team);
  if(competition)x=x.filter(g=>g.comp===competition);
  const n=windowSize==='all'?null:Number(windowSize);if(n&&n>0)x=x.slice(0,n);return x;
}
function sampleBand(n){return n>=5?{level:'STRONG',label:'5+ משחקים'}:n>=3?{level:'USABLE',label:'מדגם שימושי'}:{level:'THIN',label:'מדגם קטן'};}
function modelFor(games,team,competition,windowSize,S,C){const scoped=scopeGames(games,team,competition,windowSize,S);if(!scoped.length)return null;return C.buildModel(team,scoped,S)}
function confidenceBadge(c){const x=String(c?.level||'LOW').toUpperCase();return `<span class="owConf ${E(x)}">${E(x)}</span>`}
function decisionCard(d,i){return `<article><i>${i+1}</i><div>${confidenceBadge(d.confidence)}<h4>${E(d.title)}</h4><p>${E(d.action)}</p><small>${E(d.why||'')}</small></div></article>`}
function openHtml(html){const w=window.open('','_blank');if(!w)return alert('Please allow pop-ups for CourtIQ.');w.document.open();w.document.write(html);w.document.close()}
async function saveModel(model,button){const original=button.textContent;button.disabled=true;button.textContent='SAVING…';try{const saved=await window.CourtIQReportLibrary?.saveModel?.(model);if(!saved)throw new Error('Report Library is unavailable.');button.textContent='SAVED ✓';setTimeout(()=>{button.disabled=false;button.textContent=original},1200)}catch(e){button.disabled=false;button.textContent=original;alert(e.message)}}
function render(root,state){
  const S=window.CourtIQScoutingReport,C=window.CourtIQCoachBriefCore;
  const teams=candidateTeams(state.games),team=state.team||teams[0]?.name||'',teamGames=team?S.teamGames(state.games,team):[],comps=[...new Set(teamGames.map(g=>g.comp).filter(Boolean))].sort();
  if(state.competition&&!comps.includes(state.competition))state.competition='';
  const model=team?modelFor(state.games,team,state.competition,state.windowSize,S,C):null;
  const sample=sampleBand(model?.rows?.length||0),split=splitDecisions(model?.decisions),trends=trendSignals(model?.trend);
  const tendencies=(model?.tendencies||[]).slice(0,3).map(x=>`<article>${confidenceBadge(x.confidence)}<h4>${E(x.title)}</h4><b>${E(x.value)}</b><p>${E(x.evidence)}</p></article>`).join('')||'<p class="owEmpty">אין מספיק נתונים תקינים להצגת נטיות.</p>';
  const players=(model?.players||[]).slice(0,5).map(p=>`<tr><td>${E(p.name)}</td><td>${p.g}/${model.rows.length}</td><td>${O(p.ppg)}</td><td>${P(p.ts)}</td><td>${P(p.pointShare)}</td><td>${confidenceBadge(p.confidence)}</td></tr>`).join('')||'<tr><td colspan="6">אין נתוני שחקניות מלאים במדגם.</td></tr>';
  const trendHtml=trends.length?trends.map(x=>`<article><b>${E(x.label)}</b><strong>${x.value>0?'+':''}${O(x.value)}${x.suffix}</strong><small>3 אחרונים מול 3 קודמים</small></article>`).join(''):`<p class="owEmpty">${E(model?.trend?.reason||'אין כרגע שינוי עם כיסוי מספיק.')}</p>`;
  const attack=split.attack.length?split.attack.map(decisionCard).join(''):'<p class="owEmpty">אין נקודת תקיפה חד־משמעית מהנתונים בלבד. CourtIQ לא ממציא חולשה טקטית ללא ראיה.</p>';
  const defend=split.defend.length?split.defend.slice(0,3).map(decisionCard).join(''):'<p class="owEmpty">אין כרגע החלטת הגנה מבוססת מספיק.</p>';
  const sources=(model?.sources||[]).map(s=>`<li><span>${E(s.date)} · ${E(s.opponent)} · ${E(s.provider)}</span>${s.source?`<a href="${E(s.source)}" target="_blank" rel="noopener">SOURCE</a>`:''}</li>`).join('')||'<li>אין מקורות להצגה.</li>';
  root.innerHTML=`
    <div class="owTop"><div><small>COURTIQ OPPONENT WORKSPACE</small><h2>${E(team||'בחר יריבה')}</h2><p>One workspace · Evidence first · Coach ready</p></div>${model?confidenceBadge(model.confidence):''}</div>
    <div class="owControls">
      <label>יריבה<select class="owTeam">${teams.map(t=>`<option value="${E(t.name)}" ${t.name===team?'selected':''}>${E(t.name)} · ${t.games} games</option>`).join('')}</select></label>
      <label>מסגרת<select class="owComp"><option value="">כל המסגרות</option>${comps.map(c=>`<option value="${E(c)}" ${c===state.competition?'selected':''}>${E(c)}</option>`).join('')}</select></label>
      <label>מדגם<select class="owWindow"><option value="3" ${state.windowSize==='3'?'selected':''}>Last 3</option><option value="5" ${state.windowSize==='5'?'selected':''}>Last 5</option><option value="all" ${state.windowSize==='all'?'selected':''}>All</option></select></label>
    </div>
    ${model?`<div class="owSample"><article><b>${model.rows.length}</b><span>משחקים במדגם</span></article><article><b>${E(sample.level)}</b><span>${E(sample.label)}</span></article><article><b>${model.sources.length}</b><span>מקורות</span></article><article><b>${E(model.confidence?.level||'LOW')}</b><span>Confidence</span></article></div>
    <div class="owActions"><button class="owBrief primary">OPEN COACH BRIEF</button><button class="owSave">SAVE REPORT</button><button class="owReports">REPORT LIBRARY</button><button class="owImport">IMPORT MORE</button></div>
    <section><div class="owTitle"><small>01</small><div><h3>3 VERIFIED TENDENCIES</h3><p>מה אפשר להוכיח מהמדגם שנבחר</p></div></div><div class="owCards">${tendencies}</div></section>
    <section><div class="owTitle"><small>02</small><div><h3>KEY PLAYERS</h3><p>נוכחות, ניקוד, יעילות וחלק מהנקודות</p></div></div><div class="owScroll"><table><thead><tr><th>שחקנית</th><th>G</th><th>PTS</th><th>TS</th><th>Point share</th><th>Confidence</th></tr></thead><tbody>${players}</tbody></table></div></section>
    <section><div class="owTitle"><small>03</small><div><h3>WHAT CHANGED?</h3><p>Recent form vs previous window</p></div></div><div class="owTrend">${trendHtml}</div></section>
    <div class="owDecisionGrid"><section><div class="owTitle"><small>04</small><div><h3>HOW TO DEFEND</h3><p>החלטות אפשריות עם בסיס נתונים</p></div></div><div class="owDecisions">${defend}</div></section><section><div class="owTitle"><small>05</small><div><h3>HOW TO ATTACK</h3><p>מה לבדוק מוקדם בלי להמציא חולשה</p></div></div><div class="owDecisions">${attack}</div></section></div>
    <section><div class="owTitle"><small>06</small><div><h3>EVIDENCE</h3><p>Exact games and official sources behind this workspace</p></div></div><ul class="owSources">${sources}</ul></section>
    <p class="owGuardrail">CourtIQ guardrail: Box Score / official data can support tendencies, efficiency, rebounding, turnovers, player production and recent change. It cannot prove PNR coverage, weak hand, screen defense, zone/man scheme or play-call tendencies without richer event/video evidence.</p>`:'<div class="owEmptyState"><b>אין משחקים עבור היריבה והמדגם שנבחרו.</b><p>ייבא משחקים רשמיים או שנה את המסגרת.</p><button class="owImport primary">IMPORT GAME</button></div>'}`;
  const rerender=()=>render(root,state);
  root.querySelector('.owTeam')?.addEventListener('change',e=>{state.team=e.target.value;state.competition='';try{localStorage.setItem('courtiq_last_opponent',state.team)}catch(_){}rerender()});
  root.querySelector('.owComp')?.addEventListener('change',e=>{state.competition=e.target.value;rerender()});
  root.querySelector('.owWindow')?.addEventListener('change',e=>{state.windowSize=e.target.value;rerender()});
  root.querySelector('.owBrief')?.addEventListener('click',()=>openHtml(C.reportHtml(model)));
  root.querySelector('.owSave')?.addEventListener('click',e=>saveModel(model,e.currentTarget));
  root.querySelector('.owReports')?.addEventListener('click',()=>window.CourtIQReportLibrary?.open?.());
  root.querySelectorAll('.owImport').forEach(b=>b.addEventListener('click',()=>window.CourtIQAppActions?.run?.('import')));
}
async function load(){if(!window.CourtIQData?.isSignedIn?.())throw new Error('יש להתחבר כדי לפתוח Opponent Workspace.');const w=await window.CourtIQData.workspace();return (w.games||[]).map(normalize).filter(Boolean)}
async function open(){
  document.getElementById('cqOpponentWorkspace')?.remove();const m=document.createElement('div');m.id='cqOpponentWorkspace';m.className='modal';m.innerHTML='<div class="modalCard owModal"><button class="modalX">×</button><p class="owLoading">Building opponent intelligence…</p><div class="owBody"></div></div>';document.body.appendChild(m);const close=()=>m.remove();m.querySelector('.modalX').onclick=close;m.onclick=e=>{if(e.target===m)close()};
  try{const games=await load(),teams=candidateTeams(games);let saved='';try{saved=localStorage.getItem('courtiq_last_opponent')||''}catch(_){}const state={games,team:teams.some(t=>t.name===saved)?saved:(teams[0]?.name||''),competition:'',windowSize:'5'};m.querySelector('.owLoading').remove();render(m.querySelector('.owBody'),state)}catch(e){m.querySelector('.owLoading').textContent=e.message}
}
function style(){if(document.getElementById('cqOpponentWorkspaceStyle'))return;const s=document.createElement('style');s.id='cqOpponentWorkspaceStyle';s.textContent='.owModal{max-width:1120px}.owTop{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.owTop h2{margin:3px 0;font-size:28px}.owTop p,.owTitle p,.owCards p,.owDecisions p,.owDecisions small,.owGuardrail,.owEmpty,.owEmptyState p{color:#8fa5b8}.owControls{display:grid;grid-template-columns:2fr 1.4fr 1fr;gap:8px;margin:14px 0}.owControls label{display:grid;gap:5px;font-size:10px;color:#8fa5b8}.owControls select{background:#0c1724;color:white;border:1px solid rgba(255,255,255,.11);border-radius:9px;padding:9px}.owSample{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.owSample article{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:11px;display:flex;flex-direction:column}.owSample b{font-size:20px}.owSample span{font-size:10px;color:#8fa5b8}.owActions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.owActions button,.owEmptyState button{border:1px solid rgba(255,255,255,.13);background:#12263a;color:white;border-radius:9px;padding:9px 12px;cursor:pointer}.owActions .primary,.owEmptyState .primary{font-weight:800;border-color:rgba(90,198,150,.4)}.owTitle{display:flex;gap:10px;align-items:flex-start;margin:18px 0 8px}.owTitle small{display:grid;place-items:center;width:28px;height:28px;border:1px solid rgba(255,255,255,.11);border-radius:50%;color:#8fa5b8}.owTitle h3{margin:0}.owTitle p{margin:2px 0;font-size:11px}.owCards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.owCards article,.owTrend article{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);border-radius:11px;padding:12px}.owCards h4{margin:5px 0}.owCards b{font-size:18px}.owCards p{font-size:11px}.owConf{display:inline-flex;border:1px solid rgba(255,255,255,.13);border-radius:999px;padding:4px 7px;font-size:9px}.owConf.HIGH{color:#9cf0bd;border-color:rgba(61,207,126,.35)}.owConf.MEDIUM{color:#f0d68d;border-color:rgba(220,180,75,.35)}.owConf.LOW{color:#e8a4a4;border-color:rgba(211,86,86,.35)}.owScroll{overflow:auto}.owScroll table{width:100%;border-collapse:collapse}.owScroll th,.owScroll td{padding:8px;border-bottom:1px solid rgba(255,255,255,.07);text-align:left;font-size:11px}.owTrend{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.owTrend article{display:grid;gap:4px}.owTrend strong{font-size:18px}.owTrend small{color:#8198ac}.owDecisionGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.owDecisions{display:grid;gap:8px}.owDecisions article{display:grid;grid-template-columns:28px 1fr;gap:9px;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:11px}.owDecisions article>i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.06);font-style:normal}.owDecisions h4{margin:5px 0}.owDecisions p{margin:4px 0;font-size:12px}.owDecisions small{font-size:10px}.owSources{display:grid;gap:6px;padding:0;list-style:none}.owSources li{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(255,255,255,.06);padding:8px 0;font-size:11px}.owSources a{color:inherit}.owGuardrail{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:11px;font-size:10px}.owEmptyState{text-align:center;padding:32px;border:1px dashed rgba(255,255,255,.15);border-radius:12px;margin-top:16px}@media(max-width:760px){.owControls,.owSample,.owCards,.owTrend,.owDecisionGrid{grid-template-columns:1fr}.owTop{flex-direction:column}.owActions button{flex:1 1 45%}}';document.head.appendChild(s)}
const Core={candidateTeams,splitDecisions,trendSignals,scopeGames,sampleBand,modelFor};
if(typeof window!=='undefined'){window.CourtIQOpponentWorkspace={open,Core};if(typeof document!=='undefined'){style();}}
})();
