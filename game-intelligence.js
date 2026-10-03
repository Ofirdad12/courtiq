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
  function insights(G){return factorRows(G).filter(f=>f.winner&&f.winner!=="Even").sort((a,b)=>b.gap-a.gap).slice(0,3).map(f=>({title:f.label,evidence:f.key+" · "+G.home+" "+f.a+"% · "+G.away+" "+f.b+"%",finding:f.winner+" has the statistical edge: "+f.gap.toFixed(1)+" percentage points.",action:f.action,confidence:"CALCULATED · 1 GAME"}));}
  function safeSource(G){const s=G.sourceUrl||G.source_url;try{const u=new URL(s);return ["http:","https:"].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function render(G){
    if(!G)return "";const q=qa(G),intel=insights(G),source=safeSource(G);
    const checks=q.checks.map(c=>'<li class="'+(c.ok===true?"qaOk":c.ok===false?"qaFail":"qaUnknown")+'">'+(c.ok===true?"✓ ":c.ok===false?"! ":"— ")+esc(c.label)+' <span>'+esc(c.detail)+'</span></li>').join("");
    return '<section class="card box gameIntelV2"><div class="sectionhead"><div><small>GAME DATA → COACHING PRIORITIES</small><h3>Coach Brief · דוח למאמן</h3></div><span class="intelBadge">'+(G._dbId?"SAVED GAME":G.sourceUrl||G.source_url?"LOCAL GAME":"DEMO")+'</span></div><p>One-game descriptive sample. These differences guide video review; they do not establish tactical causes.</p><div class="intelGrid">'+(intel.length?intel.map((x,i)=>'<article><small>PRIORITY '+(i+1)+' · '+x.confidence+'</small><h4>'+esc(x.title)+'</h4><p>'+esc(x.finding)+'</p><em>'+esc(x.evidence)+'</em><p><b>Coach check:</b> '+esc(x.action)+'</p></article>').join(""):'<article><h4>Insufficient data</h4><p>No measurable factor advantage is available. Check Team Stats before drawing a conclusion.</p></article>')+'</div><details class="qaSummary" open><summary>Data checks · '+q.passed+' passed · '+q.failed+' need review · '+q.unknown+' unavailable</summary><ul>'+checks+'</ul></details><p class="metricNote">'+(G._dbId?'Saved to the club workspace.':'This view is a demo or local preview; database saving is confirmed only for imported games with a saved game ID.')+' '+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener">Open game source ↗</a>':'No official source link supplied.')+'</p></section>';
  }
  const api={render,qa,insights,factorRows,starters,role};root.CourtIQGameIntelligence=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
