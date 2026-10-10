(()=>{
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A=v=>Array.isArray(v)?v:[];
const N=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const statusRank={INCOMPLETE:0,WARNING:1,VERIFIED:2};
function uiOf(r){return r?.payload?.ui||r?.ui||r||{};}
function rawOf(r){return r?.payload?.raw||r?.raw||{};}
function playersOf(r){const u=uiOf(r);return u?.players||r?.players||r?.payload?.players||{};}
function providerOf(r){return String(r?.provider||r?.payload?.provider||r?.sourceLabel||uiOf(r)?.sourceLabel||'OFFICIAL').toUpperCase();}
function sum(rows,key){return A(rows).reduce((s,p)=>s+Number(p?.[key]||0),0);}
function played(rows){return A(rows).filter(p=>p&&(Number(p.minutes||0)>0||Number(p.points||0)>0||p.has_played===true));}
function shotLine(t){if(!t)return null;const vals=['points','two_pm','two_pa','three_pm','three_pa','ftm','fta'];if(vals.some(k=>N(t[k])===null))return null;return t;}
function teamValid(t){t=shotLine(t);if(!t)return false;return t.two_pm<=t.two_pa&&t.three_pm<=t.three_pa&&t.ftm<=t.fta&&t.points===2*t.two_pm+3*t.three_pm+t.ftm&&(t.two_pa+t.three_pa)>0;}
function q(name,severity,outcome,expected,actual,detail=''){return {check_name:name,severity,outcome,expected,actual,detail};}
function sideChecks(label,total,rows){
  const p=played(rows),checks=[];
  checks.push(q(`${label}_team_totals`,'critical',teamValid(total)?'PASS':'FAIL','valid non-negative totals; makes <= attempts; points reconcile',total,'Official team totals must reconcile.'));
  checks.push(q(`${label}_player_rows`,'critical',p.length>0?'PASS':'FAIL','at least one played player',p.length,`${p.length} played player rows found.`));
  if(p.length&&total){
    const pts=sum(p,'points');
    checks.push(q(`${label}_score_reconcile`,'critical',pts===Number(total.points)?'PASS':'FAIL',Number(total.points),pts,'Player points should equal team points.'));
    const keys=['two_pm','two_pa','three_pm','three_pa','ftm','fta'];
    const actual=Object.fromEntries(keys.map(k=>[k,sum(p,k)]));
    const expected=Object.fromEntries(keys.map(k=>[k,Number(total[k]||0)]));
    const ok=keys.every(k=>actual[k]===expected[k]);
    checks.push(q(`${label}_shooting_reconcile`,'critical',ok?'PASS':'FAIL',expected,actual,'Player shooting totals should equal official team shooting totals.'));
    const names=p.map(x=>String(x.name||'').trim().toLowerCase()).filter(Boolean),dupes=names.filter((x,i)=>names.indexOf(x)!==i);
    checks.push(q(`${label}_duplicate_players`,'warning',dupes.length?'WARN':'PASS','unique played-player names',[...new Set(dupes)],dupes.length?'Duplicate player rows detected.':'No duplicate played-player names.'));
  }
  return checks;
}
function capabilities(record){
  const u=uiOf(record),p=playersOf(record),pbp=A(u.playByPlay||record?.payload?.play_by_play||record?.play_by_play),quarters=A(u.quarters||record?.quarters),home=A(p.home),away=A(p.away);
  const starterCount=rows=>rows.filter(x=>x?.starter===true).length;
  const starters=starterCount(home)===5&&starterCount(away)===5;
  const coords=pbp.some(x=>N(x?.x)!==null&&N(x?.y)!==null);
  const box=!!(rawOf(record)?.home&&rawOf(record)?.away);
  return {
    box_score:box,
    player_box_score:home.length>0&&away.length>0,
    play_by_play:pbp.length>0,
    starters,
    starter_bench:!!u.splits,
    quarter_scores:quarters.length>=4,
    shot_coordinates:coords,
    extra_team_stats:!!u.extra,
    tier:coords?'EVENT + SHOT DATA':pbp.length?'EVENT DATA':u.splits||u.extra?'BOX SCORE+':'BOX SCORE'
  };
}
function evaluate(record){
  if(record?._qualityV225)return record._qualityV225;
  const u=uiOf(record),raw=rawOf(record),p=playersOf(record),quarters=A(u.quarters||record?.quarters),checks=[...sideChecks('home',raw.home,A(p.home)),...sideChecks('away',raw.away,A(p.away))];
  const paceHome=N(u?.calculated?.home?.pace),paceAway=N(u?.calculated?.away?.pace);
  if(paceHome!==null||paceAway!==null)checks.push(q('pace_formula','critical',paceHome!==null&&paceAway!==null?'PASS':'FAIL','finite pace for both teams',{home:paceHome,away:paceAway},'Calculated pace must be finite for both teams.'));
  const expectedMinutes=5*(40+Math.max(0,quarters.length-4)*5);
  for(const [label,rows] of [['home',A(p.home)],['away',A(p.away)]]){
    const mins=sum(played(rows),'minutes');
    if(mins>0){const diff=Math.abs(mins-expectedMinutes);checks.push(q(`${label}_team_minutes`,'warning',diff<=2.5?'PASS':'WARN',expectedMinutes,Math.round(mins*10)/10,'Played-player minutes should be close to five players × game length.'))}
  }
  if(quarters.length>=4&&raw.home&&raw.away){
    const hs=quarters.reduce((s,x)=>s+Number(x?.[0]||0),0),as=quarters.reduce((s,x)=>s+Number(x?.[1]||0),0),ok=hs===Number(raw.home.points)&&as===Number(raw.away.points);
    checks.push(q('quarter_score_reconcile','warning',ok?'PASS':'WARN',{home:raw.home.points,away:raw.away.points},{home:hs,away:as},'Quarter totals should reconcile to the final score when period data is available.'));
  }
  const critical=checks.filter(x=>x.severity==='critical'&&x.outcome==='FAIL'),warnings=checks.filter(x=>x.outcome==='WARN');
  const legacy=A(record?.payload?.quality?.checks);
  for(const old of legacy){
    if(String(old?.status||'').toUpperCase()==='FAIL'&&!checks.some(x=>x.check_name===old.check_name))critical.push({check_name:old.check_name,detail:'Legacy server validation failed.'});
  }
  const score=clamp(100-critical.length*22-warnings.length*6,0,100);
  const status=critical.length?'INCOMPLETE':warnings.length?'WARNING':'VERIFIED';
  const out={status,score,checks,blockers:critical,warnings,capabilities:capabilities(record),trusted:status!=='INCOMPLETE'};
  try{Object.defineProperty(record,'_qualityV225',{value:out,writable:true,configurable:true,enumerable:false})}catch(_){record._qualityV225=out}
  return out;
}
function normalizeQuality(record){const q=evaluate(record);return {status:q.status,score:q.score,checks:q.checks,pass:q.checks.filter(x=>x.outcome==='PASS').length,total:q.checks.length,starterVerified:q.capabilities.starters,capabilities:q.capabilities,blockers:q.blockers,warnings:q.warnings};}
function patchIntegrity(){const x=window.CourtIQIntegrity;if(!x||x.__qualityV225)return false;x.qualityOf=normalizeQuality;x.__qualityV225=true;return true;}
function patchNormalize(){const c=window.CourtIQReportLibrary?.Core;if(!c?.normalize||c.__qualityV225)return false;const base=c.normalize.bind(c);c.normalize=r=>{const g=base(r);if(g)g._qualityV225=evaluate(r);return g};c.__qualityV225=true;return true;}
function patchScouting(){const s=window.CourtIQScoutingReport;if(!s?.teamGames||s.__qualityV225)return false;const base=s.teamGames.bind(s);s.teamGames=(games,team)=>base(games,team).filter(g=>(g?._qualityV225||evaluate(g)).status!=='INCOMPLETE');s.__qualityV225=true;return true;}
function patchProductHealth(){const d=window.CourtIQData;if(!d?.productHealth||d.__qualityHealthV225)return false;const base=d.productHealth.bind(d);d.productHealth=async()=>{const h=await base();try{const w=await d.workspace();const qs=A(w.games).map(evaluate);h.counts=h.counts||{};h.quality={verified:qs.filter(x=>x.status==='VERIFIED').length,warning:qs.filter(x=>x.status==='WARNING').length,incomplete:qs.filter(x=>x.status==='INCOMPLETE').length,trusted:qs.filter(x=>x.trusted).length,total:qs.length};h.checks=h.checks||{};h.checks.dataTrust=qs.length>0&&h.quality.incomplete===0}catch(_){}return h};d.__qualityHealthV225=true;return true;}
function capChip(label,on){return `<span class="dqCap ${on?'on':'off'}">${on?'✓':'—'} ${E(label)}</span>`;}
function qualityPill(q){return `<span class="dqStatus ${q.status}">${E(q.status)} · ${Math.round(q.score)}/100</span>`;}
function sourceUrl(g){return g?.source_url||g?.payload?.source_url||uiOf(g)?.sourceUrl||'';}
function gameLabel(g){return `${g.home_team||uiOf(g).home||'Home'} — ${g.away_team||uiOf(g).away||'Away'}`;}
async function retry(url,button,reload){if(!url)return alert('No official source URL is stored for this import.');const original=button.textContent;button.disabled=true;button.textContent='REVALIDATING…';try{await window.CourtIQData.importOfficialGame(url);button.textContent='DONE ✓';setTimeout(reload,300)}catch(e){button.disabled=false;button.textContent=original;alert(e.message||String(e))}}
async function load(){if(!window.CourtIQData?.isSignedIn?.())throw new Error('Sign in to open Games & Quality.');const w=await window.CourtIQData.workspace();let runs=[];try{runs=await window.CourtIQData.importRuns?.(w.club.id)||[]}catch(_){}return {club:w.club,games:A(w.games),runs:A(runs)}}
function render(root,data,reload){
  const rows=data.games.map(g=>({g,q:evaluate(g)})).sort((a,b)=>String(b.g.game_date||'').localeCompare(String(a.g.game_date||''))),verified=rows.filter(x=>x.q.status==='VERIFIED').length,warning=rows.filter(x=>x.q.status==='WARNING').length,incomplete=rows.filter(x=>x.q.status==='INCOMPLETE').length,failed=data.runs.filter(r=>r.status==='failed');
  root.innerHTML=`<div class="dqHero"><div><small>COURTIQ DATA QUALITY CENTER</small><h2>${E(data.club?.name||'Club')}</h2><p>Official data reliability · source coverage · revalidation</p></div><b>${rows.length?Math.round((verified+warning)/rows.length*100):0}% TRUSTED</b></div>
  <div class="dqSummary"><article><strong>${verified}</strong><span>VERIFIED</span></article><article><strong>${warning}</strong><span>WARNING</span></article><article><strong>${incomplete}</strong><span>INCOMPLETE</span></article><article><strong>${failed.length}</strong><span>FAILED IMPORTS</span></article></div>
  <p class="dqRule">INCOMPLETE games are automatically excluded from Opponent Scouting / Coach Brief samples. WARNING games remain usable, with the warning exposed.</p>
  <div class="dqList">${rows.map(({g,q})=>{const c=q.capabilities,issues=[...q.blockers,...q.warnings];return `<article><div class="dqMain"><div><small>${E(g.provider||'OFFICIAL')} · ${E(g.game_date||'DATE UNKNOWN')}</small><h3>${E(gameLabel(g))}</h3><div class="dqCaps">${capChip('BOX',c.box_score)}${capChip('PBP',c.play_by_play)}${capChip('STARTERS',c.starters)}${capChip('SPLITS',c.starter_bench)}${capChip('SHOT XY',c.shot_coordinates)}</div></div><div class="dqRight">${qualityPill(q)}<button class="dqRetry" data-url="${E(sourceUrl(g))}">REVALIDATE</button></div></div>${issues.length?`<div class="dqIssues">${issues.slice(0,4).map(x=>`<span><b>${E(String(x.check_name||'check').replaceAll('_',' '))}</b> · ${E(x.detail||'Needs review')}</span>`).join('')}</div>`:'<div class="dqClean">All structural checks passed.</div>'}</article>`}).join('')||'<div class="dqEmpty">No imported games yet.</div>'}</div>
  ${failed.length?`<section class="dqFailed"><h3>FAILED IMPORTS</h3>${failed.slice(0,8).map(r=>`<article><div><b>${E(r.provider||'IMPORT')}</b><p>${E(r.error_message||'Import failed')}</p></div><button class="dqRetry" data-url="${E(r.source_url||'')}">RETRY</button></article>`).join('')}</section>`:''}`;
  root.querySelectorAll('.dqRetry').forEach(b=>b.onclick=()=>retry(b.dataset.url,b,reload));
}
async function open(){document.getElementById('cqDataQualityCenter')?.remove();const m=document.createElement('div');m.id='cqDataQualityCenter';m.className='modal';m.innerHTML='<div class="modalCard dqCard"><button class="modalX">×</button><p class="dqLoading">Auditing imported games…</p><div class="dqBody"></div></div>';document.body.appendChild(m);const close=()=>m.remove();m.querySelector('.modalX').onclick=close;m.onclick=e=>{if(e.target===m)close()};const reload=async()=>{try{m.querySelector('.dqBody').innerHTML='';let l=m.querySelector('.dqLoading');if(!l){l=document.createElement('p');l.className='dqLoading';m.querySelector('.dqBody').before(l)}l.textContent='Revalidating workspace…';const data=await load();l.remove();render(m.querySelector('.dqBody'),data,reload)}catch(e){const l=m.querySelector('.dqLoading');if(l)l.textContent=e.message}};await reload()}
function style(){if(document.getElementById('cqDataQualityStyle'))return;const s=document.createElement('style');s.id='cqDataQualityStyle';s.textContent='.dqCard{max-width:1040px}.dqHero{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.dqHero h2{margin:4px 0}.dqHero p,.dqRule,.dqIssues,.dqFailed p{color:#8fa5b8}.dqHero>b{font-size:12px;border:1px solid rgba(92,226,157,.32);background:rgba(92,226,157,.08);padding:8px 10px;border-radius:999px}.dqSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.dqSummary article{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:10px;display:grid}.dqSummary strong{font-size:24px}.dqSummary span{font-size:9px;color:#8299ad}.dqRule{font-size:11px;border-left:3px solid rgba(95,181,255,.45);padding-left:9px}.dqList{display:grid;gap:8px;margin-top:12px}.dqList>article,.dqFailed>article{border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:12px;background:rgba(255,255,255,.025)}.dqMain,.dqFailed>article{display:flex;justify-content:space-between;gap:12px}.dqMain h3{margin:3px 0 8px}.dqMain small{font-size:9px;color:#8299ad}.dqRight{display:flex;align-items:flex-end;gap:7px;flex-direction:column}.dqStatus{font-size:10px;padding:5px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12)}.dqStatus.VERIFIED{color:#9cf0bd;border-color:rgba(61,207,126,.35)}.dqStatus.WARNING{color:#f0d68d;border-color:rgba(220,180,75,.35)}.dqStatus.INCOMPLETE{color:#f0a1a1;border-color:rgba(220,75,75,.4)}.dqRetry{border:1px solid rgba(255,255,255,.14);background:#13263a;color:#fff;padding:7px 9px;border-radius:8px;cursor:pointer;font-size:10px}.dqCaps{display:flex;gap:5px;flex-wrap:wrap}.dqCap{font-size:9px;padding:4px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.08);color:#788da0}.dqCap.on{color:#b8dfc6;border-color:rgba(78,190,127,.25)}.dqIssues{display:grid;gap:3px;margin-top:9px;font-size:10px}.dqClean{font-size:10px;color:#87caa4;margin-top:8px}.dqFailed{margin-top:18px}.dqFailed>article{align-items:center;margin-top:7px}.dqFailed p{margin:3px 0 0;font-size:11px}.dqEmpty{padding:25px;text-align:center;color:#8fa5b8}@media(max-width:700px){.dqSummary{grid-template-columns:repeat(2,1fr)}.dqMain,.dqHero{flex-direction:column}.dqRight{align-items:flex-start}}';document.head.appendChild(s)}
function boot(){style();patchIntegrity();patchNormalize();patchScouting();patchProductHealth()}
const Core={evaluate,capabilities,teamValid,sideChecks,statusRank};
if(typeof window!=='undefined'){window.CourtIQDataQuality={open,Core};if(typeof document!=='undefined'){let t;const run=()=>{clearTimeout(t);t=setTimeout(boot,60)};new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run()}}
if(typeof module!=='undefined'&&module.exports)module.exports=Core;
})();
