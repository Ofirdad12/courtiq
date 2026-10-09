(()=>{
'use strict';

const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const O=v=>N(v)==null?'—':(Math.round(Number(v)*10)/10).toFixed(1);
const P=v=>N(v)==null?'—':O(v)+'%';
const RATE=(a,b)=>N(a)!=null&&N(b)>0?100*N(a)/N(b):null;
const SUM=a=>a.reduce((s,v)=>s+(N(v)||0),0);
const SHOT=['two_pm','two_pa','three_pm','three_pa','ftm','fta'];

function normalize(r){
  if(!r)return null;
  const u=r.payload?.ui||r.ui||r;
  const g={...u,_dbId:r.id??u._dbId,id:u.id??r.external_id??r.id,comp:u.comp??r.competition??'Competition',date:u.date??u.date_display??r.game_date??'—',home:u.home??r.home_team,away:u.away??r.away_team,hs:u.hs??r.payload?.raw?.home?.points,as:u.as??r.payload?.raw?.away?.points,raw:u.raw??r.payload?.raw,players:u.players??r.payload?.ui?.players,sourceUrl:u.sourceUrl??u.source_url??r.source_url??r.sourceUrl,sourceLabel:u.sourceLabel??r.provider??'COURTIQ VERIFIED DATA'};
  return g.home&&g.away?g:null;
}
function metricConfidence(metric,total){
  const n=Math.max(0,N(metric?.n)||0),coverage=total>0?n/total:0;
  if(total>=5&&coverage>=.8)return {level:'HIGH',label:'גבוה',coverage,n,total};
  if(total>=3&&coverage>=.66)return {level:'MEDIUM',label:'בינוני',coverage,n,total};
  return {level:'LOW',label:'נמוך',coverage,n,total};
}
function overallConfidence(metrics,total){
  const valid=metrics.filter(Boolean).map(m=>metricConfidence(m,total));
  if(!valid.length)return {level:'LOW',label:'נמוך'};
  if(valid.every(x=>x.level==='HIGH'))return {level:'HIGH',label:'גבוה'};
  if(valid.every(x=>x.level!=='LOW')&&total>=3)return {level:'MEDIUM',label:'בינוני'};
  return {level:'LOW',label:'נמוך'};
}
function opponentOutcome(rows){
  const valid=rows.filter(x=>x?.opp?.valid&&SHOT.every(k=>N(x.opp[k])!=null));
  const total={};for(const k of SHOT)total[k]=SUM(valid.map(x=>x.opp[k]));
  const fga=total.two_pa+total.three_pa,points=2*total.two_pm+3*total.three_pm+total.ftm;
  return {n:valid.length,total,fga,points,two:RATE(total.two_pm,total.two_pa),three:RATE(total.three_pm,total.three_pa),efg:RATE(total.two_pm+1.5*total.three_pm,fga),threeShare:RATE(total.three_pa,fga),ftr:RATE(total.fta,fga)};
}
function reportConfidence(rows,a,opp){
  return overallConfidence([a?.m?.threeShare,a?.m?.tovRate,a?.m?.orb,{n:opp?.n}],rows.length);
}
function strongestPlayers(players,totalGames){
  return (players||[]).filter(p=>(N(p?.g)||0)>0).slice(0,3).map(p=>({
    name:p.name,g:p.g,ppg:p.metrics?.points?.value,ts:p.ts,pointShare:p.pointShare?.value,
    confidence:metricConfidence({n:p.metrics?.points?.n||p.g},totalGames)
  }));
}
function tendencyCards(a,rows){
  const total=rows.length,cards=[];
  const shot=a.m.threeShare,turn=a.m.tovRate,orb=a.m.orb;
  if(N(shot?.value)!=null)cards.push({title:'פרופיל זריקות',value:`${P(shot.value)} מה־FGA לשלוש`,evidence:`${shot.n}/${total} משחקים · ${a.total.three_pa}/${a.fga} ניסיונות מהשדה`,confidence:metricConfidence(shot,total)});
  if(N(turn?.value)!=null)cards.push({title:'שמירת כדור',value:`TOV% ${P(turn.value)}`,evidence:`${turn.n}/${total} משחקים · ${O(a.m.tov.value)} איבודים למשחק`,confidence:metricConfidence(turn,total)});
  if(N(orb?.value)!=null)cards.push({title:'ריבאונד התקפה',value:`ORB% ${P(orb.value)}`,evidence:`${orb.n}/${total} משחקים · ${O(a.m.oreb.value)} ריב׳ התקפה למשחק`,confidence:metricConfidence(orb,total)});
  return cards;
}
function decisionCandidates(a,opp,rows){
  const total=rows.length,out=[];
  const three=N(a.m.threeShare.value),tov=N(a.m.tovRate.value),orb=N(a.m.orb.value);
  if(three!=null){
    const high=three>=40,low=three<=30;
    out.push({
      title:high?'להוריד נפח שלשות':'לא למכור את כל ההגנה לקשת',
      action:high?'עדיפות תכנית: לצמצם את נפח השלשות שלהם ולבדוק כבר ברבע הראשון אם 3PA share יורד מהבסיס.':low?'עדיפות תכנית: לא לבנות את כל ההגנה סביב מניעת שלשות; לעקוב קודם אחרי תמהיל 2PA/FTA והיעילות הכוללת.':'פרופיל הזריקות מאוזן יחסית; אל תבנה את תכנית המשחק על אזור אחד בלבד בלי ראיית וידאו.',
      why:`בסיס: ${P(three)} מה־FGA לשלוש ב־${a.m.threeShare.n}/${total} משחקים.`,
      confidence:metricConfidence(a.m.threeShare,total)
    });
  }
  if(tov!=null){
    out.push({
      title:tov>=16?'לבדוק לחץ על הכדור מוקדם':'לא לבנות את הניצחון על איבודים',
      action:tov>=16?'בדוק לחץ מבוקר מוקדם. אם TOV% בזמן אמת אינו לפחות באזור הבסיס שלהם, אל תמשיך לרדוף איבודים במחיר זריקות קלות.':'המדגם לא מצביע על שיעור איבודים גבוה; עדיף לשפוט את ההגנה לפי יעילות הזריקות והריבאונד ולא לפי מספר החטיפות בלבד.',
      why:`בסיס: TOV% ${P(tov)} ב־${a.m.tovRate.n}/${total} משחקים.`,
      confidence:metricConfidence(a.m.tovRate,total)
    });
  }
  if(orb!=null){
    out.push({
      title:orb>=30?'להגן על הריבאונד כיעד משחק':'לנטר ריבאונד בלי להמציא חולשה',
      action:orb>=30?'הגדר סגירת ריבאונד כ־KPI. בדוק בזמן אמת אם ORB% שלהם נשאר מתחת לבסיס.':'אין במדגם הוכחה ליתרון חריג בריבאונד התקפה; שמור על סטנדרט ריבאונד רגיל ובדוק את הנתון בזמן אמת.',
      why:`בסיס: ORB% ${P(orb)} ב־${a.m.orb.n}/${total} משחקים.`,
      confidence:metricConfidence(a.m.orb,total)
    });
  }
  if(opp.n){
    const choice=(N(opp.three)>=38&&N(opp.threeShare)>=32)?'שלשות':N(opp.two)>=55?'שתיים':null;
    out.push({
      title:'איפה לבדוק אותם בהתקפה',
      action:choice?`במשחקים שנבחרו היריבות המירו ${choice} באחוז גבוה יחסית. בדוק את הכיוון הזה מוקדם, אבל אל תקבע שהוא "חולשה הגנתית" בלי וידאו והתאמת חוזק יריבות.`:'לא נראית מהממוצעים בלבד נקודת תקיפה חד־משמעית. עדיף להשתמש בדקות הראשונות כדי לבדוק מה מייצר יעילות ולא להמציא חולשה מה־Box Score.',
      why:`תוצאות יריבות במדגם: 2P ${P(opp.two)} · 3P ${P(opp.three)} · eFG ${P(opp.efg)} · ${opp.n}/${total} משחקים תקינים.`,
      confidence:metricConfidence({n:opp.n},total)
    });
  }
  return out.slice(0,4);
}
function liveChecks(a,rows){
  const total=rows.length,checks=[];
  if(N(a.m.threeShare.value)!=null)checks.push({label:'3PA share',baseline:P(a.m.threeShare.value),question:'האם נפח השלשות מעל או מתחת לבסיס?',confidence:metricConfidence(a.m.threeShare,total)});
  if(N(a.m.tovRate.value)!=null)checks.push({label:'TOV%',baseline:P(a.m.tovRate.value),question:'האם הלחץ שלנו באמת משנה את שיעור האיבודים?',confidence:metricConfidence(a.m.tovRate,total)});
  if(N(a.m.orb.value)!=null)checks.push({label:'ORB%',baseline:P(a.m.orb.value),question:'האם אנחנו מסיימים פוזשנים בריבאונד הגנה?',confidence:metricConfidence(a.m.orb,total)});
  return checks.slice(0,3);
}
function sourceRows(rows){
  return rows.map(x=>({date:x.g.date,opponent:x.opponent,source:x.g.sourceUrl||'',provider:x.g.sourceLabel||x.g.comp||'Official source'}));
}
function buildModel(team,games,S){
  const scoped=S.teamGames(games,team),rows=S.evidenceRows(scoped,team),a=S.teamEvidence(rows),players=S.detailedPlayers(rows),opp=opponentOutcome(rows),trend=S.trendEvidence(rows);
  return {team,games:scoped,rows,a,opp,trend,players:strongestPlayers(players,rows.length),tendencies:tendencyCards(a,rows),decisions:decisionCandidates(a,opp,rows),live:liveChecks(a,rows),confidence:reportConfidence(rows,a,opp),sources:sourceRows(rows)};
}
function trendLine(model){
  const t=model.trend;if(!t?.ready)return t?.reason||'אין חלון של 3 אחרונים מול 3 קודמים עם כיסוי מספיק.';
  const items=[];for(const [k,label] of [['pf','נק׳'],['pa','ספיגה'],['efg','eFG%'],['three','3P%'],['tov','איבודים'],['oreb','ריב׳ התקפה']]){const d=N(t.deltas?.[k]);if(d!=null)items.push(`${label} ${d>0?'+':''}${O(d)}${['efg','three'].includes(k)?' נק׳ אחוז':''}`)}
  return items.length?`3 אחרונים מול 3 קודמים: ${items.join(' · ')}`:'אין מדדים עם כיסוי מלא בשני החלונות.';
}
function badge(c){return `<span class="conf ${E(c.level)}">Confidence ${E(c.label)}</span>`}
function reportHtml(model){
  const a=model.a,m=a.m;
  const tendencies=model.tendencies.map(x=>`<article><div>${badge(x.confidence)}<h3>${E(x.title)}</h3><b>${E(x.value)}</b><p>${E(x.evidence)}</p></div></article>`).join('')||'<p>אין מספיק נתונים תקינים.</p>';
  const decisions=model.decisions.map((x,i)=>`<article class="decision"><span class="num">${i+1}</span><div>${badge(x.confidence)}<h3>${E(x.title)}</h3><p>${E(x.action)}</p><small>${E(x.why)}</small></div></article>`).join('');
  const players=model.players.map(p=>`<tr><td>${E(p.name)}</td><td>${p.g}/${model.rows.length}</td><td>${O(p.ppg)}</td><td>${P(p.ts)}</td><td>${P(p.pointShare)}</td><td>${badge(p.confidence)}</td></tr>`).join('')||'<tr><td colspan="6">אין נתוני שחקניות מלאים.</td></tr>';
  const live=model.live.map(x=>`<article><h3>${E(x.label)} <b>${E(x.baseline)}</b></h3><p>${E(x.question)}</p>${badge(x.confidence)}</article>`).join('');
  const sources=model.sources.map(s=>{let link='';try{const u=new URL(s.source);if(u.protocol==='https:')link=`<a href="${E(u.href)}" target="_blank" rel="noopener">מקור</a>`}catch(_){}return `<li>${E(s.date)} · ${E(s.opponent)} · ${E(s.provider)} ${link}</li>`}).join('');
  const core=[m.threeShare,m.tovRate,m.orb].filter(x=>N(x?.value)!=null).map(x=>`${x.n}/${model.rows.length}`).join(' · ');
  return `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CourtIQ Coach Brief — ${E(model.team)}</title><style>
  @page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef3f0;color:#162b23;font:14px/1.55 Arial,sans-serif}main{max-width:900px;margin:auto;padding:22px}.hero{background:#102e24;color:white;padding:24px;border-radius:16px}.hero h1{margin:5px 0 2px;font-size:28px}.hero p{margin:5px 0;color:#cfe0d8}.bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.conf{display:inline-block;padding:4px 8px;border-radius:999px;font-size:10px;border:1px solid #b9c9c1;background:#f4f7f5;color:#35574a}.conf.HIGH{background:#e1f4e8;border-color:#8fc9a3}.conf.MEDIUM{background:#fff4d9;border-color:#e8c774}.conf.LOW{background:#fde8e5;border-color:#df9c92}.section{background:white;border:1px solid #d7e2dc;border-radius:14px;padding:18px;margin-top:14px}.section h2{margin:0 0 12px;color:#14563d}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.grid3 article{background:#f5f8f6;border-right:4px solid #2c805e;padding:12px}.grid3 h3,.decision h3{margin:4px 0}.grid3 b{font-size:20px}.decision{display:flex;gap:12px;border-bottom:1px solid #e1e9e4;padding:12px 0}.decision:last-child{border-bottom:0}.num{display:grid;place-items:center;min-width:34px;height:34px;border-radius:50%;background:#133e2f;color:white;font-weight:700}.decision p{margin:4px 0}.decision small{color:#60756b}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e1e8e4;text-align:right}.watch article{border-right-color:#c68b2d}.note{font-size:12px;color:#60756b}.danger{background:#fff7e8;border-color:#ecd1a0}.sources{font-size:11px;max-height:130px;overflow:auto}.actions{margin-top:12px}button{padding:9px 14px;cursor:pointer}@media(max-width:650px){main{padding:10px}.grid3{grid-template-columns:1fr}}@media print{body{background:#fff}main{padding:0}.section,.hero{break-inside:avoid}button{display:none}.sources{max-height:none}.hero{border-radius:0}.section{margin-top:8px;padding:13px}}
  </style><main><header class="hero"><small>COURTIQ · COACH BRIEF · BOX SCORE EVIDENCE ONLY</small><h1>${E(model.team)}</h1><div class="bar">${badge(model.confidence)}<span>${model.rows.length} משחקים · כיסוי ליבה ${E(core||'חלקי')}</span></div><p>${E(trendLine(model))}</p><div class="actions"><button onclick="window.print()">הדפסה / PDF</button></div></header>
  <section class="section"><h2>3 נטיות מוכחות</h2><div class="grid3">${tendencies}</div></section>
  <section class="section"><h2>החלטות אפשריות למאמן</h2>${decisions||'<p>אין מספיק ראיות להחלטות אוטומטיות.</p>'}<p class="note">ההחלטות הן מועמדות לתכנית משחק שנגזרו מה־Box Score. הן אינן הוכחה לסיבה טקטית ויש לאמת אותן מול וידאו/ידע צוות.</p></section>
  <section class="section"><h2>שחקניות מפתח במדגם</h2><table><thead><tr><th>שחקנית</th><th>הופעות</th><th>נק׳</th><th>TS%</th><th>נתח נקודות</th><th>אמון</th></tr></thead><tbody>${players}</tbody></table><p class="note">הדירוג לפי ממוצע נקודות במדגם; אינו Usage% ואינו קובע תפקיד.</p></section>
  <section class="section watch"><h2>מה לבדוק בזמן המשחק</h2><div class="grid3">${live}</div></section>
  <section class="section danger"><h2>גבולות המסקנה</h2><p>ללא וידאו CourtIQ אינו טוען על PNR, יד דומיננטית, סוג הגנה, איכות זריקה, matchup, תרגיל, closeout או סיבת טעות. גם תוצאות היריבות אינן מוכיחות חולשה הגנתית בלי תיקון לחוזק היריבה.</p></section>
  <section class="section"><h2>Evidence</h2><ul class="sources">${sources}</ul></section>
  </main></html>`;
}
async function context(){
  const S=window.CourtIQScoutingReport;if(!S)throw new Error('Scouting engine is not ready.');
  let games=[];if(window.CourtIQData?.isSignedIn?.()){const w=await window.CourtIQData.workspace();games=(w.games||[]).map(normalize).filter(Boolean)}
  const active=normalize(window.CourtIQActiveGame);if(active&&!games.some(g=>String(g._dbId||g.id)===String(active._dbId||active.id)))games.unshift(active);
  games=S.uniqueGames(games);return {S,games};
}
async function openFlow(){
  document.getElementById('cqCoachBriefModal')?.remove();
  const modal=document.createElement('div');modal.id='cqCoachBriefModal';modal.className='modal';modal.innerHTML='<div class="modalCard" style="max-width:720px"><button class="modalX" aria-label="Close">×</button><small class="eyebrow">COURTIQ · COACH BRIEF</small><h2 dir="rtl">דף משחק למאמן</h2><p dir="rtl">הדוח משתמש רק בנתונים שניתנים להוכחה מהמשחקים השמורים.</p><div class="cqBriefControls"></div><p class="cqBriefInfo" dir="rtl"></p><button class="runImport cqBriefBuild">הפקת Coach Brief</button></div>';document.body.appendChild(modal);
  modal.querySelector('.modalX').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
  try{
    const {S,games}=await context();if(!games.length)throw new Error('ייבא משחקים רשמיים לפני הפקת Coach Brief.');
    const controls=modal.querySelector('.cqBriefControls'),info=modal.querySelector('.cqBriefInfo');
    const teams=[...new Set(games.flatMap(g=>[g.home,g.away]))].sort();let team=teams.find(t=>t===window.CourtIQActiveGame?.away)||teams[0],comp='',windowSize=5;
    function draw(){
      const tg=S.teamGames(games,team),comps=[...new Set(tg.map(g=>g.comp))];if(comp&&!comps.includes(comp))comp='';const scoped=tg.filter(g=>!comp||g.comp===comp),selected=windowSize==='all'?scoped:scoped.slice(0,Number(windowSize));
      controls.innerHTML=`<label>קבוצה <select class="cqBriefTeam">${teams.map(t=>`<option ${t===team?'selected':''}>${E(t)}</option>`).join('')}</select></label> <label>מסגרת <select class="cqBriefComp"><option value="">כל המסגרות</option>${comps.map(c=>`<option ${c===comp?'selected':''}>${E(c)}</option>`).join('')}</select></label> <label>מדגם <select class="cqBriefWindow"><option value="3" ${windowSize===3?'selected':''}>3 אחרונים</option><option value="5" ${windowSize===5?'selected':''}>5 אחרונים</option><option value="all" ${windowSize==='all'?'selected':''}>כל המשחקים</option></select></label>`;
      info.textContent=`${selected.length} משחקים ייכללו בדוח${comp?' · '+comp:''}.`;
      controls.querySelector('.cqBriefTeam').onchange=e=>{team=e.target.value;comp='';draw()};controls.querySelector('.cqBriefComp').onchange=e=>{comp=e.target.value;draw()};controls.querySelector('.cqBriefWindow').onchange=e=>{windowSize=e.target.value==='all'?'all':Number(e.target.value);draw()};
      modal.querySelector('.cqBriefBuild').disabled=!selected.length;modal.querySelector('.cqBriefBuild').onclick=()=>{const w=window.open('','_blank');if(!w)return alert('Please allow pop-ups for CourtIQ.');try{const model=buildModel(team,selected,S);w.document.open();w.document.write(reportHtml(model));w.document.close()}catch(err){w.document.body.textContent=err.message}};
    }
    draw();
  }catch(err){modal.querySelector('.cqBriefInfo').textContent=err.message;modal.querySelector('.cqBriefBuild').disabled=true}
}
function inject(){
  const p=document.querySelector('.pills');if(!p||document.getElementById('coachBriefFlow'))return;
  const b=document.createElement('button');b.id='coachBriefFlow';b.className='importBtn primaryAction';b.textContent='COACH BRIEF · דף משחק';b.onclick=openFlow;p.appendChild(b);
}

const Core={metricConfidence,overallConfidence,opponentOutcome,reportConfidence,strongestPlayers,tendencyCards,decisionCandidates,liveChecks,buildModel,reportHtml};
if(typeof window!=='undefined'){window.CourtIQCoachBriefCore=Core;if(typeof document!=='undefined'){let timer;const boot=()=>inject();new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(boot,80)}).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}}
})();
