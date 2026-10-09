(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const O=v=>N(v)==null?'—':(Math.round(N(v)*10)/10).toFixed(1);
const P=v=>N(v)==null?'—':O(v)+'%';
const SUM=a=>a.reduce((s,v)=>s+(N(v)||0),0);
const AVG=a=>{const x=a.map(N).filter(v=>v!=null);return x.length?SUM(x)/x.length:null};
const RATE=(a,b)=>N(a)!=null&&N(b)>0?100*N(a)/N(b):null;
function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
async function request(path,retry=true){
  const s=session();if(!s?.access_token)throw new Error('יש להתחבר לחשבון CourtIQ כדי לפתוח Season Memory.');
  const res=await fetch(SUPABASE_URL+path,{headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+s.access_token}});
  let body=null;try{body=await res.json()}catch(_){}
  if(res.status===401&&retry&&window.CourtIQData?.refreshSession){const refreshed=await window.CourtIQData.refreshSession();if(refreshed)return request(path,false)}
  if(!res.ok)throw new Error(body?.message||body?.error||body?.hint||'Season Memory request failed');
  return Array.isArray(body)?body:[];
}
function confidence(games){
  const n=Number(games)||0;
  if(n>=8)return {level:'HIGH',label:'גבוה'};
  if(n>=4)return {level:'MEDIUM',label:'בינוני'};
  return {level:'LOW',label:'נמוך'};
}
function validShots(r){return ['two_pm','two_pa','three_pm','three_pa','ftm','fta','points_for'].every(k=>N(r?.[k])!=null)&&N(r.two_pm)<=N(r.two_pa)&&N(r.three_pm)<=N(r.three_pa)&&N(r.ftm)<=N(r.fta)}
function sortRecent(rows){return [...rows].sort((a,b)=>String(b.game_date||b.created_at||'').localeCompare(String(a.game_date||a.created_at||'')))}
function teamAggregate(rows){
  const r=rows||[],shots=r.filter(validShots),fga=SUM(shots.map(x=>N(x.two_pa)+N(x.three_pa))),pts=SUM(shots.map(x=>N(x.points_for))),fta=SUM(shots.map(x=>x.fta));
  const poss=r.map(x=>N(x.possessions_est)).filter(x=>x!=null&&x>0),pfPoss=r.filter(x=>N(x.possessions_est)>0&&N(x.points_for)!=null),paPoss=r.filter(x=>N(x.possessions_est)>0&&N(x.points_against)!=null);
  const orb=r.filter(x=>N(x.oreb)!=null&&N(x.opp_dreb)!=null);
  return {
    games:r.length,wins:r.filter(x=>x.won===true).length,ppg:AVG(r.map(x=>x.points_for)),papg:AVG(r.map(x=>x.points_against)),margin:AVG(r.map(x=>N(x.points_for)!=null&&N(x.points_against)!=null?N(x.points_for)-N(x.points_against):null)),
    efg:fga>0?100*(SUM(shots.map(x=>x.two_pm))+1.5*SUM(shots.map(x=>x.three_pm)))/fga:null,
    ts:fga+.44*fta>0?100*pts/(2*(fga+.44*fta)):null,
    threeRate:fga>0?100*SUM(shots.map(x=>x.three_pa))/fga:null,
    tov:AVG(r.map(x=>x.tov)),ast:AVG(r.map(x=>x.ast)),astTo:SUM(r.map(x=>x.ast))/(SUM(r.map(x=>x.tov))||NaN),
    orb:orb.length?100*SUM(orb.map(x=>x.oreb))/SUM(orb.map(x=>N(x.oreb)+N(x.opp_dreb))):null,
    poss:AVG(poss),ortg:pfPoss.length?100*SUM(pfPoss.map(x=>x.points_for))/SUM(pfPoss.map(x=>x.possessions_est)):null,drtg:paPoss.length?100*SUM(paPoss.map(x=>x.points_against))/SUM(paPoss.map(x=>x.possessions_est)):null,
    confidence:confidence(r.length),shootingCoverage:shots.length
  };
}
function playerValidShots(r){return ['two_pm','two_pa','three_pm','three_pa','ftm','fta','points'].every(k=>N(r?.[k])!=null)&&N(r.two_pm)<=N(r.two_pa)&&N(r.three_pm)<=N(r.three_pa)&&N(r.ftm)<=N(r.fta)}
function playerAggregate(rows){
  const played=(rows||[]).filter(r=>(N(r.minutes)||0)>0||(N(r.points)||0)>0),shots=played.filter(playerValidShots),fga=SUM(shots.map(x=>N(x.two_pa)+N(x.three_pa))),fta=SUM(shots.map(x=>x.fta)),pts=SUM(shots.map(x=>x.points));
  return {games:played.length,minutes:AVG(played.map(x=>x.minutes)),points:AVG(played.map(x=>x.points)),rebounds:AVG(played.map(x=>x.rebounds)),ast:AVG(played.map(x=>x.ast)),tov:AVG(played.map(x=>x.tov)),ts:fga+.44*fta>0?100*pts/(2*(fga+.44*fta)):null,threeRate:fga>0?100*SUM(shots.map(x=>x.three_pa))/fga:null,confidence:confidence(played.length)};
}
function playerMemories(rows){
  const map=new Map();for(const r of rows||[]){if(!r.player_name)continue;if(!map.has(r.player_name))map.set(r.player_name,[]);map.get(r.player_name).push(r)}
  return [...map.entries()].map(([name,list])=>{
    const sorted=sortRecent(list),season=playerAggregate(sorted),last3=playerAggregate(sorted.slice(0,3)),previous3=playerAggregate(sorted.slice(3,6));
    const base=previous3.games>=2?previous3:season;
    const delta={minutes:N(last3.minutes)!=null&&N(base.minutes)!=null?last3.minutes-base.minutes:null,points:N(last3.points)!=null&&N(base.points)!=null?last3.points-base.points:null,ts:N(last3.ts)!=null&&N(base.ts)!=null?last3.ts-base.ts:null,threeRate:N(last3.threeRate)!=null&&N(base.threeRate)!=null?last3.threeRate-base.threeRate:null};
    const signals=[];if(Math.abs(delta.minutes||0)>=5)signals.push(`דקות ${delta.minutes>0?'+':''}${O(delta.minutes)}`);if(Math.abs(delta.points||0)>=4)signals.push(`נק׳ ${delta.points>0?'+':''}${O(delta.points)}`);if(Math.abs(delta.ts||0)>=8)signals.push(`TS ${delta.ts>0?'+':''}${O(delta.ts)}pp`);if(Math.abs(delta.threeRate||0)>=10)signals.push(`3PA rate ${delta.threeRate>0?'+':''}${O(delta.threeRate)}pp`);
    return {name,rows:sorted,season,last3,previous3,signals,delta};
  }).sort((a,b)=>(N(b.last3.points)??N(b.season.points)??-1)-(N(a.last3.points)??N(a.season.points)??-1));
}
async function loadMemory(){
  const resolved=await window.CourtIQMultiClub?.resolveClub?.();if(!resolved?.club)throw new Error('לא נמצא מועדון פעיל.');const club=resolved.club,id=Number(club.id);
  const teamFields='game_id,club_id,provider,external_id,competition,game_date,created_at,source_url,side,team_name,opponent_name,points_for,points_against,won,two_pm,two_pa,three_pm,three_pa,ftm,fta,fga,ast,tov,oreb,dreb,opp_dreb,efg_pct,ts_pct,three_pa_rate,ft_rate,orb_pct,drb_pct,possessions_est,ortg_est,drtg_est';
  const playerFields='player_game_id,game_id,club_id,game_date,game_created_at,provider,external_game_id,season,competition,team_name,opponent_name,side,player_id,player_name,starter,minutes,verified,source_url,points,rebounds,oreb,dreb,ast,tov,steals,blocks,two_pm,two_pa,three_pm,three_pa,ftm,fta,ts_pct,efg_pct,play_end_share,three_pa_rate';
  const [teams,players]=await Promise.all([
    request(`/rest/v1/team_game_memory?select=${teamFields}&club_id=eq.${id}&order=game_date.desc.nullslast,created_at.desc`),
    request(`/rest/v1/player_game_memory?select=${playerFields}&club_id=eq.${id}&verified=eq.true&order=game_date.desc.nullslast,game_created_at.desc`)
  ]);
  return {club,teams,players};
}
function badge(c){return `<span class="memConf ${E(c.level)}">${E(c.label)}</span>`}
function delta(value,suffix=''){return N(value)==null?'—':`${value>0?'+':''}${O(value)}${suffix}`}
function teamWindowCard(label,a){return `<article><div class="memHead"><h3>${E(label)}</h3>${badge(a.confidence)}</div><div class="memKpis"><b>${O(a.ppg)}</b><small>נק׳</small><b>${O(a.margin)}</b><small>הפרש</small><b>${P(a.efg)}</b><small>eFG</small><b>${P(a.ts)}</b><small>TS</small><b>${P(a.threeRate)}</b><small>3PA rate</small><b>${O(a.tov)}</b><small>איב׳</small><b>${P(a.orb)}</b><small>ORB%</small><b>${O(a.ortg)}</b><small>ORtg est.</small></div><p>${a.games} משחקים · קליעה תקינה ${a.shootingCoverage}/${a.games}</p></article>`}
function teamSignals(season,last3){
  if(!season.games||!last3.games)return [];
  const candidates=[['קצב ניקוד','ppg',' נק׳'],['יעילות קליעה','efg','pp'],['נפח שלשות','threeRate','pp'],['איבודים','tov',''],['ריבאונד התקפה','orb','pp'],['יעילות התקפית','ortg','']];
  return candidates.map(([label,k,suffix])=>({label,value:N(last3[k])!=null&&N(season[k])!=null?last3[k]-season[k]:null,suffix})).filter(x=>N(x.value)!=null&&Math.abs(x.value)>=(x.suffix==='pp'?5:x.label==='איבודים'?2:x.label==='קצב ניקוד'?4:4)).slice(0,4);
}
function sourceList(rows){return sortRecent(rows).slice(0,10).map(r=>`<li>${E(r.game_date||'—')} · ${E(r.opponent_name)} · ${E(r.provider)} ${r.source_url?`<a target="_blank" rel="noopener" href="${E(r.source_url)}">מקור</a>`:''}</li>`).join('')}
function render(root,data,team,comp){
  const all=data.teams.filter(r=>r.team_name===team),scoped=sortRecent(all.filter(r=>!comp||r.competition===comp)),season=teamAggregate(scoped),last5=teamAggregate(scoped.slice(0,5)),last3=teamAggregate(scoped.slice(0,3)),signals=teamSignals(season,last3);
  const prows=data.players.filter(r=>r.team_name===team&&(!comp||r.competition===comp)),players=playerMemories(prows),comps=[...new Set(all.map(r=>r.competition).filter(Boolean))].sort();
  const trend=signals.length?signals.map(s=>`<article><h3>${E(s.label)}</h3><b>${E(delta(s.value,s.suffix))}</b><p>3 אחרונים מול כל המדגם. שינוי תיאורי בלבד.</p></article>`).join(''):'<p>אין כרגע שינוי גדול מספיק במדדי הליבה כדי לסמן אותו אוטומטית.</p>';
  const shifts=players.filter(p=>p.signals.length&&p.last3.games>=2).slice(0,8);
  const shiftsHtml=shifts.length?shifts.map(p=>`<article><div class="memHead"><h3>${E(p.name)}</h3>${badge(p.last3.confidence)}</div><b>${E(p.signals.join(' · '))}</b><p>${p.last3.games} הופעות אחרונות מול ${p.previous3.games>=2?'3 קודמות':'המדגם העונתי'}. זהו שינוי במדגם, לא הוכחה לשינוי תפקיד.</p></article>`).join(''):'<p>אין כרגע שינויי פרופיל שעוברים את ספי ההתרעה במדגם.</p>';
  const playerRows=players.slice(0,14).map(p=>`<tr><td>${E(p.name)}</td><td>${p.season.games}</td><td>${O(p.season.minutes)}</td><td>${O(p.season.points)}</td><td>${P(p.season.ts)}</td><td>${p.last3.games}</td><td>${O(p.last3.minutes)}</td><td>${O(p.last3.points)}</td><td>${P(p.last3.ts)}</td><td>${badge(p.last3.confidence)}</td></tr>`).join('');
  root.innerHTML=`<div class="memControls"><label>קבוצה <select class="memTeam">${[...new Set(data.teams.map(r=>r.team_name))].sort().map(t=>`<option ${t===team?'selected':''}>${E(t)}</option>`).join('')}</select></label><label>מסגרת <select class="memComp"><option value="">כל המסגרות</option>${comps.map(c=>`<option ${c===comp?'selected':''}>${E(c)}</option>`).join('')}</select></label><span>${E(data.club.name)} · Live DB Memory</span></div><div class="memWindows">${teamWindowCard('Season',season)}${teamWindowCard('Last 5',last5)}${teamWindowCard('Last 3',last3)}</div><section><h3>What changed? · מה השתנה</h3><div class="memSignals">${trend}</div></section><section><h3>Player Memory · שינויי פרופיל אחרונים</h3><div class="memSignals">${shiftsHtml}</div><div class="memScroll"><table><thead><tr><th>שחקנית</th><th>G עונה</th><th>MIN</th><th>PTS</th><th>TS</th><th>G L3</th><th>MIN L3</th><th>PTS L3</th><th>TS L3</th><th>Confidence</th></tr></thead><tbody>${playerRows||'<tr><td colspan="10">אין נתוני שחקניות תקינים במדגם.</td></tr>'}</tbody></table></div></section><section><h3>Evidence</h3><p class="memNote">הזיכרון נבנה ישירות ממשחקים רשמיים שמורים ומתעדכן אוטומטית בכל Import. Last 3/5 הם המשחקים האחרונים שנשמרו לפי תאריך. אין כאן הסקת סיבה טקטית ללא וידאו.</p><ul class="memSources">${sourceList(scoped)}</ul></section>`;
  root.querySelector('.memTeam').onchange=e=>render(root,data,e.target.value,'');root.querySelector('.memComp').onchange=e=>render(root,data,team,e.target.value);
}
async function openMemory(){
  document.getElementById('cqSeasonMemory')?.remove();const modal=document.createElement('div');modal.id='cqSeasonMemory';modal.className='modal';modal.innerHTML='<div class="modalCard cqMemCard"><button class="modalX" aria-label="Close">×</button><small class="eyebrow">COURTIQ · SEASON MEMORY</small><h2>Team + Player Memory</h2><p class="memStatus">טוען זיכרון עונתי מאומת…</p><div class="memBody"></div></div>';document.body.appendChild(modal);modal.querySelector('.modalX').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
  try{const data=await loadMemory(),teams=[...new Set(data.teams.map(r=>r.team_name))].sort();if(!teams.length)throw new Error('אין עדיין משחקים שמורים בזיכרון המועדון.');const preferred=teams.find(t=>t===window.CourtIQActiveGame?.home)||teams[0];modal.querySelector('.memStatus').remove();render(modal.querySelector('.memBody'),data,preferred,'')}catch(e){modal.querySelector('.memStatus').textContent=e.message}
}
function style(){if(document.getElementById('cqSeasonMemoryStyle'))return;const s=document.createElement('style');s.id='cqSeasonMemoryStyle';s.textContent='.cqMemCard{max-width:1180px;width:min(96vw,1180px);max-height:94vh;overflow:auto}.memControls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0}.memControls label,.memControls span{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px}.memControls select{background:#0a1624;color:#fff;border:0}.memWindows{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.memWindows>article,.memSignals>article{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:13px;background:rgba(255,255,255,.035)}.memHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.memKpis{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 10px}.memKpis b{font-size:19px}.memKpis small{color:#8fa5bb}.memConf{display:inline-block;border:1px solid rgba(255,255,255,.15);padding:3px 7px;border-radius:999px;font-size:10px}.memConf.HIGH{border-color:#43c882}.memConf.MEDIUM{border-color:#ddb85e}.memConf.LOW{border-color:#cb7770}.memSignals{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.memSignals article>b{font-size:17px}.memScroll{overflow:auto}.memScroll table{width:100%;border-collapse:collapse;margin-top:12px}.memScroll th,.memScroll td{padding:8px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left;white-space:nowrap}.memNote,.memSources{color:#93a7ba;font-size:12px}.memSources a{color:#8ddbb8}@media(max-width:850px){.memWindows,.memSignals{grid-template-columns:1fr}.memKpis{grid-template-columns:repeat(2,1fr)}}';document.head.appendChild(s)}
function inject(){style();const p=document.querySelector('.pills');if(!p||document.getElementById('seasonMemoryFlow'))return;const b=document.createElement('button');b.id='seasonMemoryFlow';b.className='importBtn';b.textContent='SEASON MEMORY · זיכרון';b.onclick=openMemory;p.appendChild(b)}
const Core={confidence,validShots,teamAggregate,playerAggregate,playerMemories,teamSignals};
if(typeof window!=='undefined'){window.CourtIQSeasonMemoryCore=Core;if(typeof document!=='undefined'){let timer;const boot=()=>inject();new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(boot,80)}).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}}
})();
