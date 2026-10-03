/* Deterministic game checks and a three-point coaching brief. */
(function(root){
  "use strict";
  const n=v=>{if(v==null||String(v).trim()==="")return null;const x=Number(String(v).replace(/%$/, ""));return Number.isFinite(x)?x:null;};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const meta={"eFG%":{label:"Shot efficiency",low:false,action:"Review shot selection and the quality of contested attempts."},"TOV%":{label:"Ball security",low:true,action:"Review turnover types and ball-handling decisions under pressure."},"ORB%":{label:"Offensive rebounding",low:false,action:"Review box-outs and the balance between crashing and getting back."},"FTr":{label:"Free-throw rate",low:false,action:"Review foul-drawing attempts and defensive discipline."}};
  function factorRows(G){return (G.factors||[]).filter(r=>meta[r[0]]).map(r=>{const key=r[0],a=n(r[1]),b=n(r[2]),m=meta[key];return {key,...m,a,b,gap:a==null||b==null?null:Math.abs(a-b),winner:a==null||b==null?null:a===b?"Even":(m.low?a<b:a>b)?G.home:G.away};});}
  function starters(G,side){
    const ps=G.players?.[side]||[],marked=ps.filter(p=>p.starter===true).map(p=>p.name);
    if(marked.length===5&&new Set(marked).size===5)return {names:marked,source:"BOX SCORE"};
    const stint=root.CourtIQLineupEngine?.derive(G)?.lineupStints.find(r=>r.side===side&&r.period===1&&r.startClock==="10:00");
    return stint?{names:stint.players,source:"PLAY-BY-PLAY"}:{names:[],source:"UNKNOWN"};
  }
  function role(G,side,p){const s=starters(G,side);return s.names.length===5?(s.names.includes(p.name)?"Starter":"Bench"):"Unknown";}
  function qa(G){
    const checks=[],add=(label,ok,detail="")=>checks.push({label,ok,detail});
    const periods=Math.max(4,Array.isArray(G.quarters)?G.quarters.length:0,...(G.playByPlay||G.play_by_play||[]).map(e=>Number(e.period)||0));
    const expectedMinutes=200+Math.max(0,periods-4)*25;
    for(const side of ["home","away"]){
      const ps=G.players?.[side]||[],team=G[side]||side,score=n(side==="home"?G.hs:G.as),s=starters(G,side);
      const complete=ps.length>0&&ps.every(p=>n(p.points)!=null);
      const total=complete?ps.reduce((sum,p)=>sum+n(p.points),0):null;
      add(team+" · player points reconcile",total==null||score==null?null:total===score,total==null?"Player points unavailable":total+" / "+score);
      add(team+" · starting five",s.names.length===5?true:null,s.source);
      const minutes=ps.length&&ps.every(p=>n(p.minutes)!=null)?ps.reduce((sum,p)=>sum+n(p.minutes),0):null;
      add(team+" · player minutes",minutes==null?null:Math.abs(minutes-expectedMinutes)<=2,minutes==null?"Minutes unavailable":minutes.toFixed(2)+" / "+expectedMinutes+" (includes overtime)");
    }
    const factors=factorRows(G);add("Four Factors available",factors.length===4&&factors.every(f=>f.a!=null&&f.b!=null));
    if(Array.isArray(G.quarters)&&G.quarters.length){const valid=G.quarters.every(q=>Array.isArray(q)&&n(q[0])!=null&&n(q[1])!=null);add("Period scores reconcile",valid&&n(G.hs)!=null&&n(G.as)!=null?G.quarters.reduce((s,q)=>s+n(q[0]),0)===n(G.hs)&&G.quarters.reduce((s,q)=>s+n(q[1]),0)===n(G.as):null);}
    return {checks,passed:checks.filter(x=>x.ok===true).length,failed:checks.filter(x=>x.ok===false).length,unknown:checks.filter(x=>x.ok==null).length,total:checks.length};
  }
  function insights(G,side=""){
    const selected=["home","away"].includes(side)?side:"",team=selected?G[selected]:null,q=qa(G);
    return factorRows(G).filter(f=>f.winner&&f.winner!=="Even").sort((a,b)=>{
      if(team&&(a.winner===team)!==(b.winner===team))return a.winner===team?1:-1;
      return b.gap-a.gap;
    }).slice(0,3).map(f=>({key:f.key,title:f.label,evidence:f.key+" · "+G.home+" "+f.a+"% · "+G.away+" "+f.b+"%",finding:team?team+(f.winner===team?" led":" trailed")+" by "+f.gap.toFixed(1)+" percentage points.":f.winner+" has the statistical edge: "+f.gap.toFixed(1)+" percentage points.",action:f.action,signal:team?(f.winner===team?"ADVANTAGE":"REVIEW PRIORITY"):"STATISTICAL GAP",confidence:(q.failed?"DATA REVIEW REQUIRED":"CALCULATED")+" · 1 GAME"}));
  }
  function safeSource(G){const s=G.sourceUrl||G.source_url;try{const u=new URL(s);return ["http:","https:"].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function render(G,side="",interactive=true){
    if(!G)return "";const q=qa(G),intel=insights(G,side),source=safeSource(G);
    const checks=q.checks.map(c=>'<li class="'+(c.ok===true?"qaOk":c.ok===false?"qaFail":"qaUnknown")+'">'+(c.ok===true?"✓ ":c.ok===false?"! ":"— ")+esc(c.label)+' <span>'+esc(c.detail)+'</span></li>').join("");
    return '<section class="card box gameIntelV2"><div class="sectionhead"><div><small>GAME DATA → COACHING PRIORITIES</small><h3>Coach Brief · דוח למאמן</h3></div><span class="intelBadge">'+(G._dbId?"SAVED GAME":G.sourceUrl||G.source_url?"LOCAL GAME":"DEMO")+'</span></div>'+(interactive?controls(G,side):'')+'<p>One-game descriptive sample. These differences guide video review; they do not establish tactical causes.</p><div class="intelGrid">'+(intel.length?intel.map((x,i)=>'<article><small>'+esc(x.signal)+' · PRIORITY '+(i+1)+' · '+x.confidence+'</small><h4>'+esc(x.title)+'</h4><p>'+esc(x.finding)+'</p><em>'+esc(x.evidence)+'</em><p><b>Coach check:</b> '+esc(x.action)+'</p>'+(interactive?'<button type="button" class="importBtn briefEvidence" data-factor="'+esc(x.key)+'">VIEW SUPPORTING DATA ↗</button>':'')+'</article>').join(""):'<article><h4>Insufficient data</h4><p>No measurable factor advantage is available. Check Team Stats before drawing a conclusion.</p></article>')+'</div><details class="qaSummary" open><summary>Data checks · '+q.passed+' passed · '+q.failed+' need review · '+q.unknown+' unavailable</summary><ul>'+checks+'</ul></details><p class="metricNote">'+(G._dbId?'Saved to the club workspace.':'This view is a demo or local preview; database saving is confirmed only for imported games with a saved game ID.')+' '+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener">Open game source ↗</a>':'No official source link supplied.')+'</p></section>';
  }
  function controls(G,side){
    return '<div class="briefControls"><label>Focus team<select class="briefFocus"><option value="">Game overview</option>'+["home","away"].map(s=>'<option value="'+s+'"'+(side===s?' selected':'')+'>'+esc(G[s])+'</option>').join("")+'</select></label><button type="button" class="importBtn briefExport">EXPORT PRINTABLE BRIEF</button><span class="briefStatus" role="status"></span></div>';
  }
  function printable(G,side=""){
    const content=render(G,side,false),team=["home","away"].includes(side)?G[side]:"Game overview";
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CourtIQ Coach Brief</title><style>body{font:14px/1.5 Arial,sans-serif;color:#18243a;max-width:1050px;margin:24px auto;padding:20px}h1{font-size:24px}h3,h4{margin:10px 0}.sectionhead{display:flex;justify-content:space-between;gap:16px}.intelGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.intelGrid article{border:1px solid #bcc6d4;padding:14px;break-inside:avoid}small,em{display:block;font-size:12px}em{font-style:normal}.qaSummary{margin:20px 0}.qaSummary li{margin:6px 0}.qaFail{color:#9e243c}.qaUnknown{color:#765b00}.qaSummary span{margin-left:8px}.metricNote{font-size:12px}a{color:#213f90}@media(max-width:650px){.intelGrid{grid-template-columns:1fr}}@media print{body{margin:0;padding:0;font-size:11px}.printHelp{display:none}.intelGrid article{padding:10px}a{color:inherit}.qaSummary{break-inside:avoid}@page{size:A4 landscape;margin:14mm}</style><h1>'+esc(G.home)+' '+esc(G.hs)+'–'+esc(G.as)+' '+esc(G.away)+'</h1><p>'+esc(G.comp)+' · '+esc(G.date)+' · Focus: '+esc(team)+'</p><p class="printHelp">Use your browser’s Print command to print this brief or save it as PDF.</p>'+content+'</html>';
  }
  function mount(G,scope=root.document,onEvidence){
    if(!scope?.querySelectorAll)return;
    scope.querySelectorAll('.gameIntelV2').forEach(card=>{
      let side=card.querySelector('.briefFocus')?.value||"";
      const bind=()=>{
        const focus=card.querySelector('.briefFocus');if(!focus)return;
        focus.onchange=()=>{side=focus.value;const template=root.document.createElement('template');template.innerHTML=render(G,side);card.innerHTML=template.content.firstElementChild.innerHTML;bind();};
        card.querySelectorAll('.briefEvidence').forEach(btn=>btn.onclick=()=>{if(onEvidence)onEvidence(btn.dataset.factor);else card.querySelector('.briefStatus').textContent='Open Team Stats for '+btn.dataset.factor+' in the game workspace.';});
        card.querySelector('.briefExport').onclick=()=>{
          const url=root.URL.createObjectURL(new root.Blob([printable(G,side)],{type:'text/html;charset=utf-8'})),a=root.document.createElement('a');
          a.href=url;a.download='courtiq-'+String(G.id||'game').replace(/[^a-z0-9_-]/gi,'-')+'-'+(side||'overview')+'-coach-brief.html';a.click();root.setTimeout(()=>root.URL.revokeObjectURL(url),1000);
          card.querySelector('.briefStatus').textContent='Brief exported. Open the HTML file and choose Print / Save as PDF.';
        };
      };bind();
    });
  }
  const api={render,qa,insights,factorRows,starters,role,mount,printable};root.CourtIQGameIntelligence=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
