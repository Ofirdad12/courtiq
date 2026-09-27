/*
 * CourtIQ Game Intelligence V2
 * Deterministic, evidence-first interpretation of verified game data.
 * No tactical cause is invented from box-score data.
 */
(function(){
  const n=v=>{const x=parseFloat(String(v??"").replace("%",""));return Number.isFinite(x)?x:null};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const factorMeta={
    "eFG%":{better:"high",label:"Shot efficiency"},
    "TOV%":{better:"low",label:"Ball security"},
    "ORB%":{better:"high",label:"Offensive rebounding"},
    "FTr":{better:"high",label:"Free-throw pressure"}
  };
  function factorRows(G){
    return (G.factors||[]).map(r=>{
      const key=String(r[0]),a=n(r[1]),b=n(r[2]),meta=factorMeta[key]||{better:"high",label:key};
      if(a==null||b==null)return {key,label:meta.label,a,b,winner:null,gap:null};
      const homeWins=meta.better==="low"?a<b:a>b;
      const tied=a===b;
      return {key,label:meta.label,a,b,winner:tied?"Even":(homeWins?G.home:G.away),gap:Math.abs(a-b)};
    });
  }
  function qa(G){
    const checks=[];
    const players=[...(G.players?.home||[]),...(G.players?.away||[])];
    for(const side of ["home","away"]){
      const ps=G.players?.[side]||[],team=G[side],score=side==="home"?G.hs:G.as;
      if(ps.length){
        checks.push({label:team+" player points = team score",ok:ps.reduce((s,p)=>s+Number(p.points||0),0)===Number(score)});
        checks.push({label:team+" has exactly 5 starters",ok:ps.filter(p=>p.starter&&Number(p.minutes||0)>0).length===5});
        const mins=ps.reduce((s,p)=>s+Number(p.minutes||0),0);
        checks.push({label:team+" player minutes ≈ 200",ok:mins>=198&&mins<=202,detail:mins.toFixed(1)});
      }
    }
    checks.push({label:"Four Factors available",ok:(G.factors||[]).length===4});
    return {checks,passed:checks.filter(x=>x.ok).length,total:checks.length};
  }
  function insights(G){
    const f=factorRows(G),out=[];
    f.filter(x=>x.winner&&x.winner!=="Even").sort((a,b)=>b.gap-a.gap).slice(0,3).forEach(x=>{
      out.push({title:x.label,evidence:x.key+" "+x.a+"% vs "+x.b+"%",finding:x.winner+" held the statistical edge ("+x.gap.toFixed(1)+" pp).",confidence:"CALCULATED"});
    });
    const homeTs=n(G.calculated?.home?.ts),awayTs=n(G.calculated?.away?.ts);
    if(homeTs!=null&&awayTs!=null)out.push({title:"Scoring efficiency",evidence:"TS% "+homeTs+"% vs "+awayTs+"%",finding:(homeTs===awayTs?"Efficiency was even.":(homeTs>awayTs?G.home:G.away)+" finished with the higher true-shooting rate."),confidence:"CALCULATED"});
    return out.slice(0,4);
  }
  function render(G){
    if(!G)return "";
    const intel=insights(G),f=factorRows(G),q=qa(G);
    return '<section class="card box gameIntelV2"><div class="sectionhead"><div><small>COURTIQ · GAME INTELLIGENCE V2</small><h3>Coach Intelligence</h3></div><span class="intelBadge">EVIDENCE FIRST</span></div>'+
      '<div class="intelConfidence"><span><b>OFFICIAL</b> source box score</span><span><b>CALCULATED</b> transparent formulas</span><span><b>ESTIMATED</b> clearly marked</span></div>'+
      '<h4>What decided the numbers?</h4><div class="intelGrid">'+(intel.length?intel.map((x,i)=>'<article><small>KEY '+(i+1)+' · '+x.confidence+'</small><b>'+esc(x.title)+'</b><p>'+esc(x.finding)+'</p><em>'+esc(x.evidence)+'</em></article>').join(""):'<article><b>INSUFFICIENT DATA</b><p>No unsupported conclusion generated.</p></article>')+'</div>'+
      '<h4>Four Factors interpretation</h4><div class="factorIntel">'+f.map(x=>'<div><b>'+esc(x.key)+'</b><span>'+esc(x.a==null?"—":x.a+"%")+' · '+esc(x.b==null?"—":x.b+"%")+'</span><em>'+(x.winner?esc(x.winner==="Even"?"Even":x.winner+" edge"):"Insufficient data")+'</em></div>').join("")+'</div>'+
      '<h4>Automated QA</h4><div class="qaSummary"><b>'+q.passed+'/'+q.total+' checks passed</b>'+q.checks.map(x=>'<span class="'+(x.ok?"qaOk":"qaFail")+'">'+(x.ok?"✓":"! ")+' '+esc(x.label)+(x.detail?" · "+esc(x.detail):"")+'</span>').join("")+'</div>'+
      '<div class="metricNote"><b>Coach note:</b> CourtIQ describes what the verified data shows. Tactical cause, coverage quality and decision-making require play-by-play or video evidence.</div></section>';
  }
  window.CourtIQGameIntelligence={render,qa,insights,factorRows};
})();