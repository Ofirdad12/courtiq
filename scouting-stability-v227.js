(()=>{
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A=v=>Array.isArray(v)?v:[];
const N=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const r1=v=>N(v)==null?null:Math.round(Number(v)*10)/10;
const avg=xs=>{const v=xs.map(N).filter(x=>x!==null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
const sd=xs=>{const v=xs.map(N).filter(x=>x!==null);if(v.length<2)return null;const m=v.reduce((a,b)=>a+b,0)/v.length;return Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/v.length)};
const pct=(a,b)=>b?Math.round(a/b*1000)/10:null;
const fmt=(v,s='')=>N(v)==null?'—':`${r1(v)}${s}`;
function normalize(r){return window.CourtIQReportLibrary?.Core?.normalize?.(r)||r?.payload?.ui||r?.ui||r;}
function perspective(g,team){
  if(!g||!team)return null;const home=g.home===team,away=g.away===team;if(!home&&!away)return null;
  const raw=g.raw||g.payload?.raw||{},t=home?raw.home:raw.away,o=home?raw.away:raw.home;if(!t||!o)return null;
  const fga=Number(t.two_pa||0)+Number(t.three_pa||0),fgm=Number(t.two_pm||0)+Number(t.three_pm||0),oppFga=Number(o.two_pa||0)+Number(o.three_pa||0);
  const calc=g.calculated?.[home?'home':'away']||g.payload?.calculated?.[home?'home':'away']||{};
  const pf=Number(t.points||0),pa=Number(o.points||0),margin=pf-pa;
  return {game:g,date:g.date||g.game_date||'—',opponent:home?g.away:g.home,venue:home?'HOME':'AWAY',result:margin>0?'WIN':margin<0?'LOSS':'TIE',close:Math.abs(margin)<=5,pf,pa,margin,
    efg:N(calc.efg)??pct(fgm+.5*Number(t.three_pm||0),fga),three:N(calc.three_pct)??pct(Number(t.three_pm||0),Number(t.three_pa||0)),tov:N(calc.tov)??pct(Number(t.tov||0),fga+.44*Number(t.fta||0)+Number(t.tov||0)),orb:N(calc.orb)??pct(Number(t.oreb||0),Number(t.oreb||0)+Number(o.dreb||0)),ftr:N(calc.ftr)??pct(Number(t.fta||0),fga),opp_efg:pct(Number(o.two_pm||0)+1.5*Number(o.three_pm||0),oppFga)};
}
function summarize(rows){
  const x=A(rows);if(!x.length)return {games:0};
  return {games:x.length,pf:r1(avg(x.map(r=>r.pf))),pa:r1(avg(x.map(r=>r.pa))),margin:r1(avg(x.map(r=>r.margin))),efg:r1(avg(x.map(r=>r.efg))),three:r1(avg(x.map(r=>r.three))),tov:r1(avg(x.map(r=>r.tov))),orb:r1(avg(x.map(r=>r.orb))),ftr:r1(avg(x.map(r=>r.ftr))),win_rate:pct(x.filter(r=>r.result==='WIN').length,x.length)};
}
function groups(rows){const x=A(rows);return {ALL:x,HOME:x.filter(r=>r.venue==='HOME'),AWAY:x.filter(r=>r.venue==='AWAY'),WINS:x.filter(r=>r.result==='WIN'),LOSSES:x.filter(r=>r.result==='LOSS'),CLOSE:x.filter(r=>r.close)};}
function splitCards(rows){const g=groups(rows),order=['ALL','HOME','AWAY','WINS','LOSSES','CLOSE'];return order.map(k=>({key:k,...summarize(g[k])})).filter(x=>x.games>0);}
function stability(rows){
  const x=A(rows),defs=[['pf','PF',8],['pa','PA',8],['efg','eFG%',6],['three','3P%',8],['tov','TOV%',5],['orb','ORB%',6]],metrics=[];
  for(const [key,label,scale] of defs){const vals=x.map(r=>r[key]).filter(v=>N(v)!==null),m=avg(vals),s=sd(vals);if(vals.length<3||m===null||s===null)continue;const ratio=s/scale;metrics.push({key,label,mean:r1(m),sd:r1(s),score:r1(ratio),level:ratio<=.6?'STABLE':ratio<=1?'MIXED':'VOLATILE'});}
  const overall=x.length<5?'SMALL SAMPLE':metrics.filter(m=>m.level==='VOLATILE').length>=2?'VOLATILE':metrics.filter(m=>m.level==='STABLE').length>=Math.ceil(metrics.length/2)?'STABLE':'MIXED';
  return {overall,metrics,games:x.length};
}
function outliers(rows){
  const x=A(rows);if(x.length<5)return [];
  const defs=[['pf','Points For'],['pa','Points Allowed'],['efg','eFG%'],['three','3P%'],['tov','TOV%'],['orb','ORB%']],stats={};
  for(const [key] of defs)stats[key]={mean:avg(x.map(r=>r[key])),sd:sd(x.map(r=>r[key]))};
  const found=[];
  for(const r of x){for(const [key,label] of defs){const v=N(r[key]),m=N(stats[key].mean),s=N(stats[key].sd);if(v===null||m===null||s===null||s===0)continue;const z=(v-m)/s;if(Math.abs(z)>=1.5)found.push({date:r.date,opponent:r.opponent,key,label,value:r1(v),mean:r1(m),z:r1(z),direction:z>0?'HIGH':'LOW'});}}
  return found.sort((a,b)=>Math.abs(b.z)-Math.abs(a.z)).slice(0,4);
}
function contrast(rows,a,b){const g=groups(rows),sa=summarize(g[a]),sb=summarize(g[b]);if(sa.games<2||sb.games<2)return null;const metrics=[['pf','PF'],['pa','PA'],['efg','eFG%'],['three','3P%'],['tov','TOV%'],['orb','ORB%']];const diffs=metrics.map(([k,label])=>({key:k,label,a:sa[k],b:sb[k],delta:N(sa[k])!==null&&N(sb[k])!==null?r1(sa[k]-sb[k]):null})).filter(x=>x.delta!==null).sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta));return {a,b,aGames:sa.games,bGames:sb.games,diffs};}
function build(rows){return {cards:splitCards(rows),stability:stability(rows),outliers:outliers(rows),homeAway:contrast(rows,'HOME','AWAY'),winsLosses:contrast(rows,'WINS','LOSSES')};}
function card(x){return `<article><small>${E(x.key)} · ${x.games}G</small><b>${fmt(x.margin>0?`+${x.margin}`:x.margin)}</b><span>Margin</span><div><em>PF ${fmt(x.pf)}</em><em>PA ${fmt(x.pa)}</em><em>eFG ${fmt(x.efg,'%')}</em><em>3P ${fmt(x.three,'%')}</em><em>TOV ${fmt(x.tov,'%')}</em><em>ORB ${fmt(x.orb,'%')}</em></div></article>`;}
function contrastHtml(c,title){if(!c)return `<article class="ssEmpty"><b>${E(title)}</b><span>Need at least 2 games in both groups.</span></article>`;return `<article><small>${E(title)} · ${c.aGames} vs ${c.bGames} games</small>${c.diffs.slice(0,3).map(d=>`<div class="ssDiff"><b>${E(d.label)}</b><span>${E(c.a)} ${fmt(d.a)} · ${E(c.b)} ${fmt(d.b)}</span><strong>${d.delta>0?'+':''}${fmt(d.delta)}</strong></div>`).join('')}</article>`;}
async function scopedFromDom(modal){
  const team=modal.querySelector('.owTeam')?.value||'',comp=modal.querySelector('.owComp')?.value||'',win=modal.querySelector('.owWindow')?.value||'5';if(!team)return null;
  const w=await window.CourtIQData.workspace(),S=window.CourtIQScoutingReport;if(!S?.teamGames)return null;let games=A(w.games).map(normalize).filter(Boolean);games=S.teamGames(games,team);if(comp)games=games.filter(g=>g.comp===comp);const n=win==='all'?null:Number(win);if(n)games=games.slice(0,n);const rows=games.map(g=>perspective(g,team)).filter(Boolean);return {team,comp,win,rows,model:build(rows)};
}
function renderSection(data){
  const m=data.model,s=m.stability;return `<section id="cqScoutingStability"><div class="owTitle"><small>SPLITS</small><div><h3>SPLITS & STABILITY</h3><p>What repeats across context — and what may be a one-game outlier</p></div></div>
  <div class="ssCards">${m.cards.map(card).join('')}</div>
  <div class="ssGrid"><div><h4>CONTEXT CONTRASTS</h4>${contrastHtml(m.homeAway,'HOME vs AWAY')}${contrastHtml(m.winsLosses,'WINS vs LOSSES')}</div><div><h4>STABILITY</h4><article class="ssStability"><strong>${E(s.overall)}</strong><span>${s.games} trusted games</span>${s.metrics.map(x=>`<div><b>${E(x.label)}</b><span>${fmt(x.mean)} ± ${fmt(x.sd)}</span><em class="${E(x.level)}">${E(x.level)}</em></div>`).join('')}</article></div></div>
  <div class="ssOut"><h4>OUTLIER SIGNALS</h4>${m.outliers.length?m.outliers.map(x=>`<article><b>${E(x.date)} · ${E(x.opponent)}</b><span>${E(x.label)} ${fmt(x.value)} vs sample ${fmt(x.mean)}</span><strong>${E(x.direction)} · z ${fmt(x.z)}</strong></article>`).join(''):'<p>No strong descriptive outlier signal in this sample, or fewer than 5 games.</p>'}</div>
  <p class="ssGuard">Stability and outlier signals are descriptive, not statistical significance tests. They help the staff distinguish repeated patterns from one-game noise; tactical causation still requires event/video evidence.</p></section>`;}
let busy=false,lastSig='';
async function sync(){if(busy)return;const modal=document.getElementById('cqOpponentWorkspace');if(!modal)return;const body=modal.querySelector('.owBody');if(!body||!modal.querySelector('.owTeam'))return;const sig=[modal.querySelector('.owTeam')?.value,modal.querySelector('.owComp')?.value,modal.querySelector('.owWindow')?.value].join('|');if(sig===lastSig&&body.querySelector('#cqScoutingStability'))return;busy=true;try{const data=await scopedFromDom(modal);if(!data)return;body.querySelector('#cqScoutingStability')?.remove();const guard=body.querySelector('.owGuardrail'),wrap=document.createElement('div');wrap.innerHTML=renderSection(data);const section=wrap.firstElementChild;if(guard)guard.before(section);else body.appendChild(section);lastSig=sig}catch(e){console.error('[CourtIQ v227] splits',e)}finally{busy=false}}
function style(){if(document.getElementById('cqScoutingStabilityStyle'))return;const s=document.createElement('style');s.id='cqScoutingStabilityStyle';s.textContent='#cqScoutingStability{border-color:rgba(103,190,255,.18)!important}.ssCards{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.ssCards>article,.ssGrid article,.ssOut article{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px;background:rgba(255,255,255,.025)}.ssCards small{font-size:9px;color:#8299ad}.ssCards>b{display:block;font-size:20px;margin:4px 0}.ssCards>span{font-size:9px;color:#8299ad}.ssCards div{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;margin-top:8px}.ssCards em{font-style:normal;font-size:9px;color:#b7c7d5}.ssGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.ssGrid h4,.ssOut h4{font-size:10px;letter-spacing:.08em;color:#8ea6ba}.ssGrid>div{display:grid;gap:7px}.ssDiff{display:grid;grid-template-columns:1fr auto;gap:3px 8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}.ssDiff span{grid-column:1/-1;font-size:9px;color:#8299ad}.ssDiff strong{grid-column:2;grid-row:1}.ssStability>strong{font-size:23px}.ssStability>span{display:block;color:#8299ad;font-size:9px;margin-bottom:8px}.ssStability>div{display:grid;grid-template-columns:1fr 1fr auto;gap:6px;font-size:9px;padding:4px 0}.ssStability em{font-style:normal}.ssStability em.STABLE{color:#9cf0bd}.ssStability em.MIXED{color:#f0d68d}.ssStability em.VOLATILE{color:#f0a1a1}.ssOut{margin-top:10px}.ssOut article{display:grid;grid-template-columns:1fr auto;gap:3px 8px;margin-top:5px}.ssOut article span{grid-column:1/-1;color:#8299ad;font-size:9px}.ssOut p,.ssGuard,.ssEmpty span{color:#8299ad;font-size:10px}.ssGuard{margin-top:9px}@media(max-width:760px){.ssCards{grid-template-columns:1fr 1fr}.ssGrid{grid-template-columns:1fr}}';document.head.appendChild(s)}
function boot(){style();sync();const o=new MutationObserver(()=>{clearTimeout(boot.t);boot.t=setTimeout(sync,90)});o.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('change',e=>{if(e.target?.closest?.('#cqOpponentWorkspace')){lastSig='';setTimeout(sync,40)}})}
const Core={perspective,summarize,groups,splitCards,stability,outliers,contrast,build};
if(typeof window!=='undefined'){window.CourtIQScoutingStability={Core,sync};if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}}
if(typeof module!=='undefined'&&module.exports)module.exports=Core;
})();
