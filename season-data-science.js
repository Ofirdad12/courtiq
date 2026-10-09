(function(){
'use strict';
const VERSION='1.0.0';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>{const x=Number(String(v??'').replace('%',''));return Number.isFinite(x)?x:null};
const avg=a=>{const x=a.filter(Number.isFinite);return x.length?x.reduce((s,v)=>s+v,0)/x.length:null};
const sd=a=>{const x=a.filter(Number.isFinite);if(x.length<2)return null;const m=avg(x);return Math.sqrt(x.reduce((s,v)=>s+(v-m)**2,0)/(x.length-1))};
const fmt=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'—';
const pct=(v,d=1)=>Number.isFinite(v)?v.toFixed(d)+'%':'—';
const dateVal=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?t:null};

function payload(row){
  const p=row?.payload;
  if(!p)return row||{};
  if(typeof p==='string'){try{return {...row,...JSON.parse(p)}}catch(_){return row||{}}}
  return {...row,...p};
}
function metric(g,name,side){
  const key=String(name).toLowerCase();
  const direct=g?.calculated?.[side]||{};
  const map={ortg:'ortg',drtg:'drtg',net:'net_rating',pace:'pace',efg:'efg',tov:'tov',orb:'orb',ftr:'ftr',ts:'ts'};
  if(map[key]&&Number.isFinite(n(direct[map[key]])))return n(direct[map[key]]);
  for(const row of g?.metrics||[])if(String(row?.[0]).toLowerCase().includes(key))return n(row[side==='home'?1:2]);
  for(const row of g?.factors||[])if(String(row?.[0]).toLowerCase().includes(key.replace('%','')))return n(row[side==='home'?1:2]);
  return null;
}
function sides(g,team){
  if(g.home===team||g.home_team===team)return {side:'home',opp:g.away||g.away_team};
  if(g.away===team||g.away_team===team)return {side:'away',opp:g.home||g.home_team};
  return null;
}
function score(g,side){
  const h=n(g.hs??g.home_score??g?.raw?.home?.points),a=n(g.as??g.away_score??g?.raw?.away?.points);
  return side==='home'?[h,a]:[a,h];
}
function normalizeGame(row,team){
  const g=payload(row), s=sides(g,team); if(!s)return null;
  const sc=score(g,s.side), margin=Number.isFinite(sc[0])&&Number.isFinite(sc[1])?sc[0]-sc[1]:null;
  const side=s.side, other=side==='home'?'away':'home';
  return {
    id:row.id||g.id,date:g.date||g.game_date||row.game_date||'',dateTs:dateVal(g.date||g.game_date||row.game_date),
    opponent:s.opp||'Opponent',side,margin,result:Number.isFinite(margin)?(margin>0?'W':margin<0?'L':'T'):'—',
    ortg:metric(g,'ortg',side),drtg:metric(g,'drtg',side),net:metric(g,'net',side),
    pace:metric(g,'pace',side),efg:metric(g,'efg',side),tov:metric(g,'tov',side),
    orb:metric(g,'orb',side),ftr:metric(g,'ftr',side),ts:metric(g,'ts',side),
    oppEfg:metric(g,'efg',other), raw:g
  };
}
function allTeams(rows){
  return [...new Set(rows.flatMap(r=>{const g=payload(r);return [g.home||g.home_team,g.away||g.away_team]}).filter(Boolean))].sort();
}
function rolling(rows,key,w=5){
  return rows.map((r,i)=>({...r,value:avg(rows.slice(Math.max(0,i-w+1),i+1).map(x=>x[key]))}));
}
function trend(rows,key){
  const vals=rows.map(r=>r[key]), recent=avg(vals.slice(-5)), prev=avg(vals.slice(-10,-5)), season=avg(vals);
  return {season,recent,prev,delta:Number.isFinite(recent)&&Number.isFinite(prev)?recent-prev:null};
}
function spark(rows,key){
  const pts=rolling(rows,key,5).filter(x=>Number.isFinite(x.value));
  if(pts.length<2)return '<div class="sds-empty">Need at least 2 valid games for a trend.</div>';
  const vals=pts.map(x=>x.value),lo=Math.min(...vals),hi=Math.max(...vals),range=Math.max(1,hi-lo);
  const xy=pts.map((p,i)=>`${20+i*260/Math.max(1,pts.length-1)},${90-(p.value-lo)*70/range}`).join(' ');
  return `<svg class="sds-spark" viewBox="0 0 300 110" role="img" aria-label="${esc(key)} rolling five-game trend"><polyline points="${xy}"></polyline>${pts.map((p,i)=>`<circle cx="${20+i*260/Math.max(1,pts.length-1)}" cy="${90-(p.value-lo)*70/range}" r="3"><title>${esc(p.date||'Game')} · ${fmt(p.value)}</title></circle>`).join('')}</svg>`;
}
function anomalies(rows){
  const keys=[['net','Net Rating'],['efg','eFG%'],['tov','TOV%'],['pace','Pace']];
  const out=[];
  for(const [key,label] of keys){
    const vals=rows.map(r=>r[key]).filter(Number.isFinite); if(vals.length<5)continue;
    const m=avg(vals),s=sd(vals);if(!Number.isFinite(s)||s<0.01)continue;
    rows.forEach(r=>{if(!Number.isFinite(r[key]))return;const z=(r[key]-m)/s;if(Math.abs(z)>=1.5)out.push({label,key,z,value:r[key],r});});
  }
  return out.sort((a,b)=>Math.abs(b.z)-Math.abs(a.z)).slice(0,6);
}
function readiness(rows){
  const pbp=rows.filter(r=>r.raw?.pbp?.length||r.raw?.playByPlay?.length||r.raw?._pbp?.length).length;
  const lu=rows.filter(r=>r.raw?.lineups?.length||r.raw?.lineupStints?.length||r.raw?._lineups?.length).length;
  return {games:rows.length,pbp,lineups:lu,rapm:rows.length>=10&&lu>=8&&pbp>=8,predict:rows.length>=8};
}
function playerSeries(rows,team){
  const map=new Map();
  rows.forEach(r=>{
    const side=r.side, list=r.raw?.players?.[side]||[];
    list.forEach(p=>{
      const name=p.name||p.player_name;if(!name)return;
      if(!map.has(name))map.set(name,[]);
      map.get(name).push({date:r.date,dateTs:r.dateTs,minutes:n(p.minutes),points:n(p.points),ts:n(p.ts),efg:n(p.efg),playEnd:n(p.play_end_share)});
    });
  });
  return map;
}
function projectPlayers(rows,team){
  const series=playerSeries(rows,team),out=[];
  for(const [name,games] of series){
    const ordered=games.filter(x=>x.dateTs!=null).sort((a,b)=>a.dateTs-b.dateTs);
    if(ordered.length<3)continue;
    const recent=ordered.slice(-5), seasonPts=avg(ordered.map(x=>x.points)), recentPts=avg(recent.map(x=>x.points));
    const seasonMin=avg(ordered.map(x=>x.minutes)), recentMin=avg(recent.map(x=>x.minutes));
    const baseline=Number.isFinite(seasonPts)&&Number.isFinite(recentPts)?0.65*recentPts+0.35*seasonPts:null;
    const minBase=Number.isFinite(seasonMin)&&Number.isFinite(recentMin)?0.65*recentMin+0.35*seasonMin:null;
    out.push({name,games:ordered.length,pts:baseline,min:minBase,ts:avg(recent.map(x=>x.ts)),trend:Number.isFinite(recentPts)&&Number.isFinite(seasonPts)?recentPts-seasonPts:null});
  }
  return out.sort((a,b)=>(b.min||0)-(a.min||0)).slice(0,10);
}
function metricCard(label,t,unit=''){
 return `<article class="sds-kpi"><small>${esc(label)}</small><strong>${fmt(t.recent)}${unit}</strong><span>Last 5</span><p>Season ${fmt(t.season)}${unit} · ${Number.isFinite(t.delta)?(t.delta>=0?'+':'')+fmt(t.delta)+unit:'no prior 5-game window'}</p></article>`;
}
function anomalyHtml(items){
 if(!items.length)return '<div class="sds-empty">No statistically unusual game-level signals yet, or the sample is too small.</div>';
 return `<div class="sds-list">${items.map(a=>`<div class="sds-row"><span class="${a.z>0?'up':'down'}">${a.z>0?'↑':'↓'} ${fmt(Math.abs(a.z),1)}σ</span><div><b>${esc(a.label)} · ${fmt(a.value)}</b><small>${esc(a.r.date||'Date unknown')} vs ${esc(a.r.opponent)}</small></div></div>`).join('')}</div>`;
}
function playerTable(rows,team){
 const p=projectPlayers(rows,team);
 if(!p.length)return '<div class="sds-empty">Need at least 3 dated player box-score rows per player.</div>';
 return `<div class="sds-scroll"><table><thead><tr><th>Player</th><th>Games</th><th>Baseline PTS</th><th>Baseline MIN</th><th>Recent TS</th><th>Trend</th></tr></thead><tbody>${p.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${x.games}</td><td>${fmt(x.pts)}</td><td>${fmt(x.min)}</td><td>${pct(x.ts)}</td><td>${Number.isFinite(x.trend)?(x.trend>=0?'+':'')+fmt(x.trend):'—'}</td></tr>`).join('')}</tbody></table></div><p class="sds-note">Baseline = 65% recent 5-game mean + 35% season mean. This is a transparent planning baseline, not a trained prediction model.</p>`;
}
function render(rows,team){
 const games=rows.map(r=>normalizeGame(r,team)).filter(Boolean).sort((a,b)=>(a.dateTs??0)-(b.dateTs??0));
 const ready=readiness(games), net=trend(games,'net'),efg=trend(games,'efg'),tov=trend(games,'tov'),pace=trend(games,'pace');
 const wins=games.filter(g=>g.margin>0).length;
 return `<div class="sds-head"><div><small>COURTIQ · SEASON DATA SCIENCE LAB</small><h2>${esc(team||'Season')} · Model-ready basketball intelligence</h2><p>Rolling trends, anomaly detection, impact-model readiness and player baselines from saved official games.</p></div><span>v${VERSION}</span></div>
 <div class="sds-kpis">${metricCard('NET RATING',net)}${metricCard('eFG%',efg,'%')}${metricCard('TOV%',tov,'%')}${metricCard('PACE',pace)}</div>
 <div class="sds-grid">
  <section class="sds-panel"><div class="sds-title"><div><small>ROLLING FORM</small><h3>5-game Net Rating trend</h3></div><b>${games.length} games · ${wins}-${Math.max(0,games.length-wins)}</b></div>${spark(games,'net')}<p class="sds-note">Rolling means reduce one-game noise but do not prove causation.</p></section>
  <section class="sds-panel"><div class="sds-title"><div><small>MODEL READINESS</small><h3>RAPM / forecasting pipeline</h3></div></div>
   <div class="sds-ready"><div><b>RAPM</b><span class="${ready.rapm?'ok':'warn'}">${ready.rapm?'ESTIMATION READY':'NOT READY'}</span><p>${ready.lineups}/${ready.games} games with lineup stints · ${ready.pbp}/${ready.games} with PBP. Require ≥10 games and reliable stint coverage.</p></div>
   <div><b>Rolling forecast</b><span class="${ready.predict?'ok':'warn'}">${ready.predict?'SAMPLE READY':'BUILDING SAMPLE'}</span><p>${ready.predict?'Enough games for back-tested rolling baselines.':'Need at least 8 official games before presenting forecasts as decision support.'}</p></div>
   <div><b>EPM</b><span>EXTERNAL / OWN MODEL</span><p>CourtIQ does not infer EPM from box scores. Use licensed values or a documented trained impact model.</p></div></div>
  </section>
  <section class="sds-panel"><div class="sds-title"><div><small>ANOMALY DETECTION</small><h3>Games that deserve film review</h3></div><span>|z| ≥ 1.5</span></div>${anomalyHtml(anomalies(games))}<p class="sds-note">Z-scores flag unusual values relative to this team's current sample; they are not tactical explanations.</p></section>
  <section class="sds-panel"><div class="sds-title"><div><small>PLAYER PROJECTIONS</small><h3>Next-game planning baselines</h3></div><span>transparent model</span></div>${playerTable(games,team)}</section>
 </div>
 <section class="sds-panel sds-full"><div class="sds-title"><div><small>COACH DECISION LAYER</small><h3>What to investigate now</h3></div></div>
 <div class="sds-decisions">
  <div><b>1</b><span>Form</span><p>${Number.isFinite(net.delta)?`Last-five Net Rating moved ${net.delta>=0?'+':''}${fmt(net.delta)} versus the previous five.`:'Build a 10-game sample to compare two full five-game windows.'}</p></div>
  <div><b>2</b><span>Stability</span><p>${anomalies(games).length?`${anomalies(games).length} unusual statistical signals are flagged for video verification.`:'No major anomaly is currently detected with the available sample.'}</p></div>
  <div><b>3</b><span>Impact</span><p>${ready.rapm?'The season data is structurally ready for a first RAPM/ridge impact estimate, with validation and shrinkage.':'Keep collecting possession-level lineup stints before publishing RAPM.'}</p></div>
 </div></section>`;
}
async function loadRows(){
 if(window.CourtIQData?.isSignedIn?.()){
   const w=await window.CourtIQData.workspace();
   return {rows:w.games||[],club:w.club};
 }
 const active=window.CourtIQActiveGame;
 return {rows:active?[active]:[],club:null};
}
async function open(){
 let modal=document.querySelector('.seasonDataScienceModal');
 if(modal)modal.remove();
 modal=document.createElement('div');modal.className='modal seasonDataScienceModal';
 modal.innerHTML='<div class="modalCard sds-modal"><button type="button" class="modalX" aria-label="Close">×</button><div class="sds-loading">Loading official season data…</div></div>';
 document.body.appendChild(modal);modal.querySelector('.modalX').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
 try{
   const {rows,club}=await loadRows(), teams=allTeams(rows), preferred=club?.name&&teams.includes(club.name)?club.name:(teams.find(x=>/ashdod/i.test(x))||teams[0]||'');
   const card=modal.querySelector('.sds-modal');
   card.innerHTML='<button type="button" class="modalX" aria-label="Close">×</button><div class="sds-toolbar"><label>Team<select class="sds-team">'+teams.map(t=>`<option${t===preferred?' selected':''}>${esc(t)}</option>`).join('')+'</select></label><span class="sds-source">'+(window.CourtIQData?.isSignedIn?.()?'SAVED OFFICIAL GAMES':'CURRENT GAME PREVIEW')+'</span></div><div class="sds-body"></div>';
   card.querySelector('.modalX').onclick=()=>modal.remove();
   const draw=()=>{const team=card.querySelector('.sds-team').value;card.querySelector('.sds-body').innerHTML=render(rows,team)};
   card.querySelector('.sds-team').onchange=draw;draw();
 }catch(err){
   modal.querySelector('.sds-loading').innerHTML='<b>Season Data Science could not load.</b><p>'+esc(err.message||err)+'</p>';
 }
}
function install(){
 const pills=document.querySelector('.pills');
 if(pills&&!pills.querySelector('[data-season-data-science]')){
   const b=document.createElement('button');b.type='button';b.className='importBtn primaryAction';b.dataset.seasonDataScience='1';b.textContent='SEASON DATA SCIENCE';b.onclick=open;pills.prepend(b);
 }
 const menu=document.querySelector('.menu');
 if(menu&&!menu.querySelector('[data-season-data-science-menu]')){
   const item=document.createElement('div');item.dataset.seasonDataScienceMenu='1';item.setAttribute('role','button');item.tabIndex=0;item.innerHTML='◆ <span>Season Data Science</span>';item.onclick=open;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
   const season=[...menu.children].find(x=>/Season Memory/i.test(x.textContent));if(season?.nextSibling)menu.insertBefore(item,season.nextSibling);else menu.appendChild(item);
 }
}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
window.CourtIQSeasonDataScience={open,render,version:VERSION};
})();