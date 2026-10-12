(()=>{
'use strict';

const esc=(value)=>String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(value)=>String(value||'CourtIQ').replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'');
const num=(value)=>{const n=Number(value);return Number.isFinite(n)?Math.round(n*10)/10:'—'};
const pct=(value)=>{const n=Number(value);return Number.isFinite(n)?`${Math.round(n*10)/10}%`:'—'};

function roleFor(game,side,player){
  try{return window.CourtIQGameIntelligence?.role?.(game,side,player)||(player?.starter?'Starter':'Bench');}
  catch(_){return player?.starter?'Starter':'Bench';}
}

function rebounds(player){
  const direct=Number(player?.rebounds);
  if(Number.isFinite(direct))return direct;
  const o=Number(player?.oreb)||0,d=Number(player?.dreb)||0;
  return o+d;
}

function teamTable(game,team,side,list){
  const rows=(list||[]).map((p,index)=>`<tr>
    <td>${index+1}</td>
    <td class="name">${esc(p.name||'Unknown')}</td>
    <td>${esc(roleFor(game,side,p))}</td>
    <td>${num(p.minutes)}</td>
    <td>${num(p.points)}</td>
    <td>${num(rebounds(p))}</td>
    <td>${num(p.ast)}</td>
    <td>${num(p.to??p.turnovers)}</td>
    <td>${pct(p.fg_pct)}</td>
    <td>${pct(p.three_pct)}</td>
    <td>${pct(p.ft_pct)}</td>
    <td>${pct(p.ts)}</td>
    <td>${pct(p.efg)}</td>
    <td>${num(p.plus_minus)}</td>
  </tr>`).join('');
  return `<section class="team"><div class="teamHead"><h2>${esc(team)}</h2><span>${(list||[]).length} players</span></div><table><thead><tr><th>#</th><th>Player</th><th>Role</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>TO</th><th>FG%</th><th>3P%</th><th>FT%</th><th>TS%</th><th>eFG%</th><th>+/-</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function exportPlayerList(game){
  const g=game||window.CourtIQActiveGame;
  if(!g)return alert('Open a game first.');
  const home=g.players?.home||[],away=g.players?.away||[];
  if(!home.length&&!away.length)return alert('Player data is not available for this game yet.');
  const w=window.open('','_blank');
  if(!w)return alert('Please allow pop-ups for CourtIQ.');
  const title=`CourtIQ-Player-List-${safe(g.home)}-vs-${safe(g.away)}`;
  const source=g.sourceLabel||(g._dbId?'Official saved game':'CourtIQ game report');
  const css=`@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;font-size:9px;line-height:1.25}.header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #6d28d9;padding-bottom:8px;margin-bottom:12px}.brand{font-size:24px;font-weight:900}.brand span{color:#6d28d9}.report{font-size:13px;font-weight:800;margin-top:2px}.score{font-size:20px;font-weight:900;margin-top:4px}.meta{text-align:right;color:#6b7280;font-size:9px}.team{break-inside:avoid-page;margin:0 0 14px}.teamHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}.teamHead h2{font-size:14px;margin:0}.teamHead span{color:#6b7280}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #d1d5db;padding:4px 5px;text-align:center;white-space:nowrap}th{background:#f3f4f6;font-weight:800;font-size:8px}.name{text-align:left;font-weight:700;min-width:120px}.note{margin-top:7px;color:#6b7280;font-size:8px}.footer{margin-top:9px;border-top:1px solid #d1d5db;padding-top:5px;color:#6b7280;text-align:right;font-size:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
  const body=`<div class="header"><div><div class="brand">Court<span>IQ</span></div><div class="report">PLAYER LIST PDF</div><div class="score">${esc(g.home)} ${esc(g.hs)} - ${esc(g.as)} ${esc(g.away)}</div></div><div class="meta">${esc(g.comp||'')}<br>${esc(g.date||'')}<br>${esc(source)}</div></div>${teamTable(g,g.home,'home',home)}${teamTable(g,g.away,'away',away)}<div class="note">Roster and production metrics are taken from the active official game data. Advanced percentages are CourtIQ calculations when available.</div><div class="footer">CourtIQ · Basketball Intelligence · Player List PDF</div>`;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body>${body}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),180));<\/script></body></html>`);
  w.document.close();
}

function patchUi(){
  document.querySelectorAll('.reportExportCard[data-r="player"]').forEach((card)=>{
    card.dataset.playerListPatched='1';
    const h=card.querySelector('h3'); if(h)h.textContent='2. Player List PDF';
    const p=card.querySelector('p'); if(p)p.textContent='Full player list for both teams in one PDF.';
    card.querySelector('#r2')?.remove();
    const b=card.querySelector('#b2');
    if(b){b.textContent='EXPORT PLAYER LIST PDF';b.dataset.courtiqPlayerListExport='1';}
  });
  document.querySelectorAll('[data-game-view="player"] .pdfInlineActions button').forEach((b)=>{
    if(/PLAYER CARD PDF/i.test(b.textContent||'')){
      b.textContent='EXPORT PLAYER LIST PDF';
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

window.CourtIQPlayerListExport={export:exportPlayerList,install:patchUi};
})();
