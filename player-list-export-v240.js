(()=>{
'use strict';

const esc=(value)=>String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(value)=>String(value||'CourtIQ').replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'');
const n=(...values)=>{for(const v of values){if(v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v)))return Number(v);}return null;};
const one=(value)=>value==null?'—':String(Math.round(Number(value)*10)/10);
const pct=(value)=>value==null?'—':`${Math.round(Number(value)*10)/10}%`;
const ratio=(value)=>value==null?'—':String(Math.round(Number(value)*100)/100);
const rate=(a,b)=>a!=null&&b!=null&&b>0?100*a/b:null;

function roleFor(game,side,player){
  try{return window.CourtIQGameIntelligence?.role?.(game,side,player)||(player?.starter?'Starter':'Bench');}
  catch(_){return player?.starter?'Starter':'Bench';}
}
function mins(p){return n(p?.minutes,p?.min,p?.mins);}
function pts(p){return n(p?.points,p?.pts);}
function ast(p){return n(p?.ast,p?.assists);}
function tov(p){return n(p?.to,p?.turnovers,p?.tov);}
function oreb(p){return n(p?.oreb,p?.offensive_rebounds,p?.orb);}
function dreb(p){return n(p?.dreb,p?.defensive_rebounds,p?.drb);}
function reb(p){const direct=n(p?.rebounds,p?.reb);return direct!=null?direct:(oreb(p)!=null||dreb(p)!=null?(oreb(p)||0)+(dreb(p)||0):null);}
function twoPa(p){return n(p?.two_pa,p?.twoPointAttempts,p?.two_attempts);}
function twoPm(p){return n(p?.two_pm,p?.twoPointMade,p?.two_made);}
function threePa(p){return n(p?.three_pa,p?.threePointAttempts,p?.three_attempts);}
function threePm(p){return n(p?.three_pm,p?.threePointMade,p?.three_made);}
function fta(p){return n(p?.fta,p?.freeThrowAttempts,p?.ft_attempts);}
function ftm(p){return n(p?.ftm,p?.freeThrowMade,p?.ft_made);}
function fga(p){const direct=n(p?.fga,p?.field_goal_attempts);if(direct!=null)return direct;const a=twoPa(p),b=threePa(p);return a!=null||b!=null?(a||0)+(b||0):null;}
function fgm(p){const direct=n(p?.fgm,p?.field_goals_made);if(direct!=null)return direct;const a=twoPm(p),b=threePm(p);return a!=null||b!=null?(a||0)+(b||0):null;}
function teamPoints(game,side){return n(side==='home'?game?.hs:game?.as);}

function derived(p,game,side,teamList){
  const FGA=fga(p),FGM=fgm(p),THA=threePa(p),THM=threePm(p),FTA=fta(p),PTS=pts(p),MIN=mins(p),AST=ast(p),TO=tov(p),REB=reb(p),OREB=oreb(p),DREB=dreb(p);
  const efg=n(p?.efg,p?.efg_pct)??(FGA>0&&FGM!=null?100*(FGM+0.5*(THM||0))/FGA:null);
  const ts=n(p?.ts,p?.ts_pct)??(PTS!=null&&FGA!=null&&FTA!=null&&(FGA+0.44*FTA)>0?100*PTS/(2*(FGA+0.44*FTA)):null);
  const pps=n(p?.pps)??(PTS!=null&&FGA>0?PTS/FGA:null);
  const threeRate=n(p?.three_pa_rate,p?.threePaRate)??rate(THA,FGA);
  const ftRate=n(p?.ft_rate,p?.fta_rate)??rate(FTA,FGA);
  const astTo=n(p?.ast_to,p?.assist_turnover_ratio)??(AST!=null&&TO!=null?(TO===0?(AST>0?AST:null):AST/TO):null);
  const pts40=n(p?.points_per_40)??(PTS!=null&&MIN>0?40*PTS/MIN:null);
  const reb40=n(p?.rebounds_per_40)??(REB!=null&&MIN>0?40*REB/MIN:null);
  const ast40=n(p?.assists_per_40)??(AST!=null&&MIN>0?40*AST/MIN:null);
  const load=FGA!=null&&FTA!=null&&TO!=null?FGA+0.44*FTA+TO:null;
  const teamLoad=(teamList||[]).reduce((sum,x)=>{const a=fga(x),b=fta(x),c=tov(x);return sum+(a!=null&&b!=null&&c!=null?a+0.44*b+c:0);},0);
  const playEnd=n(p?.play_end_share)??(load!=null&&teamLoad>0?100*load/teamLoad:null);
  const scoringShare=PTS!=null&&teamPoints(game,side)>0?100*PTS/teamPoints(game,side):null;
  return {FGA,FGM,THA,THM,FTA,FTM:ftm(p),PTS,MIN,AST,TO,REB,OREB,DREB,efg,ts,pps,threeRate,ftRate,astTo,pts40,reb40,ast40,playEnd,scoringShare,plusMinus:n(p?.plus_minus,p?.plusMinus)};
}

function basicRows(game,side,list){
  return (list||[]).map((p,index)=>{const d=derived(p,game,side,list);return `<tr><td>${index+1}</td><td class="name">${esc(p.name||'Unknown')}</td><td>${esc(roleFor(game,side,p))}</td><td>${one(d.MIN)}</td><td>${one(d.PTS)}</td><td>${one(d.REB)}</td><td>${one(d.AST)}</td><td>${one(d.TO)}</td><td>${d.FGM!=null&&d.FGA!=null?`${one(d.FGM)}/${one(d.FGA)}`:'—'}</td><td>${d.THM!=null&&d.THA!=null?`${one(d.THM)}/${one(d.THA)}`:'—'}</td><td>${d.FTM!=null&&d.FTA!=null?`${one(d.FTM)}/${one(d.FTA)}`:'—'}</td><td>${one(d.plusMinus)}</td></tr>`;}).join('');
}
function advancedRows(game,side,list){
  return (list||[]).map((p)=>{const d=derived(p,game,side,list);return `<tr><td class="name">${esc(p.name||'Unknown')}</td><td>${pct(d.efg)}</td><td>${pct(d.ts)}</td><td>${ratio(d.pps)}</td><td>${pct(d.threeRate)}</td><td>${pct(d.ftRate)}</td><td>${ratio(d.astTo)}</td><td>${one(d.pts40)}</td><td>${one(d.reb40)}</td><td>${one(d.ast40)}</td><td>${pct(d.playEnd)}</td><td>${pct(d.scoringShare)}</td></tr>`;}).join('');
}
function teamBlock(game,team,side,list){
  return `<section class="team"><div class="teamHead"><h2>${esc(team)}</h2><span>${(list||[]).length} players</span></div><h3>Box Score</h3><table><thead><tr><th>#</th><th>Player</th><th>Role</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>TO</th><th>FG</th><th>3P</th><th>FT</th><th>+/-</th></tr></thead><tbody>${basicRows(game,side,list)}</tbody></table><h3>Advanced Metrics</h3><table class="advanced"><thead><tr><th>Player</th><th>eFG%</th><th>TS%</th><th>PPS</th><th>3PA Rate</th><th>FT Rate</th><th>AST/TO</th><th>PTS/40</th><th>REB/40</th><th>AST/40</th><th>Play-End Share*</th><th>Scoring Share</th></tr></thead><tbody>${advancedRows(game,side,list)}</tbody></table></section>`;
}

function exportPlayerList(game){
  const g=game||window.CourtIQActiveGame;
  if(!g)return alert('Open a game first.');
  const home=g.players?.home||[],away=g.players?.away||[];
  if(!home.length&&!away.length)return alert('Player data is not available for this game yet. Import a box score with player rows first.');
  const w=window.open('','_blank');
  if(!w)return alert('Please allow pop-ups for CourtIQ.');
  const title=`CourtIQ-Advanced-Player-List-${safe(g.home)}-vs-${safe(g.away)}`;
  const source=g.sourceLabel||(g._dbId?'Official saved game':'CourtIQ game report');
  const css=`@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;font-size:8.5px;line-height:1.22}.header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #6d28d9;padding-bottom:8px;margin-bottom:10px}.brand{font-size:24px;font-weight:900}.brand span{color:#6d28d9}.report{font-size:12px;font-weight:800;margin-top:2px}.score{font-size:19px;font-weight:900;margin-top:3px}.meta{text-align:right;color:#6b7280;font-size:8.5px}.team{break-inside:auto;margin:0 0 12px}.teamHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}.teamHead h2{font-size:14px;margin:0}.teamHead span{color:#6b7280}h3{font-size:10px;margin:6px 0 3px}table{width:100%;border-collapse:collapse;table-layout:auto;margin-bottom:6px}th,td{border:1px solid #d1d5db;padding:3px 4px;text-align:center;white-space:nowrap}th{background:#f3f4f6;font-weight:800;font-size:7.6px}.name{text-align:left;font-weight:700;min-width:108px}.advanced th{background:#ede9fe}.formula{margin-top:6px;border-top:1px solid #d1d5db;padding-top:5px;color:#4b5563;font-size:7.5px;line-height:1.35}.footer{margin-top:7px;border-top:1px solid #d1d5db;padding-top:4px;color:#6b7280;text-align:right;font-size:7.5px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.team{break-inside:avoid-page}}`;
  const body=`<div class="header"><div><div class="brand">Court<span>IQ</span></div><div class="report">ADVANCED PLAYER LIST PDF</div><div class="score">${esc(g.home)} ${esc(g.hs)} - ${esc(g.as)} ${esc(g.away)}</div></div><div class="meta">${esc(g.comp||'')}<br>${esc(g.date||'')}<br>${esc(source)}</div></div>${teamBlock(g,g.home,'home',home)}${teamBlock(g,g.away,'away',away)}<div class="formula"><b>Calculated directly from the imported box score when not supplied by the source:</b> eFG% = 100 × (FGM + 0.5×3PM) / FGA · TS% = 100 × PTS / [2 × (FGA + 0.44×FTA)] · PPS = PTS / FGA · 3PA Rate = 3PA/FGA · FT Rate = FTA/FGA · per-40 = stat/MIN × 40. <b>*Play-End Share</b> = player's (FGA + 0.44×FTA + TO) divided by the team total of the same expression. It is a box-score possession-load estimate, <b>not official Usage%</b>. Scoring Share = player points / team points. Tactical role, shot quality and defensive impact still require video/possession context.</div><div class="footer">CourtIQ · Basketball Intelligence · Advanced Player List</div>`;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body>${body}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),180));<\/script></body></html>`);
  w.document.close();
}

function patchUi(){
  document.querySelectorAll('.reportExportCard[data-r="player"]').forEach((card)=>{
    const h=card.querySelector('h3'); if(h)h.textContent='2. Advanced Player List PDF';
    const p=card.querySelector('p'); if(p)p.textContent='All players + calculated advanced box-score metrics.';
    card.querySelector('#r2')?.remove();
    const b=card.querySelector('#b2');
    if(b){b.textContent='EXPORT ADVANCED PLAYER PDF';b.dataset.courtiqPlayerListExport='1';}
  });
  document.querySelectorAll('[data-game-view="player"] .pdfInlineActions button').forEach((b)=>{
    if(/PLAYER CARD PDF|PLAYER LIST PDF|ADVANCED PLAYER/i.test(b.textContent||'')){
      b.textContent='EXPORT ADVANCED PLAYER PDF';
      b.dataset.courtiqPlayerListExport='1';
    }
  });
}

document.addEventListener('click',(event)=>{
  const button=event.target?.closest?.('button');
  if(!button)return;
  const isReportButton=button.id==='b2'&&button.closest('.reportExportCard[data-r="player"]');
  const isInline=button.dataset.courtiqPlayerListExport==='1';
  if(!isReportButton&&!isInline)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  exportPlayerList(window.CourtIQActiveGame);
},{capture:true});

let timer;
new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(patchUi,30)}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchUi,{once:true});else patchUi();

window.CourtIQPlayerListExport={export:exportPlayerList,install:patchUi,version:'241'};
})();
