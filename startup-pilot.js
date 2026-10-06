(()=>{
  const STORAGE_KEY="courtiq_pilot_feedback_v1";
  const state={rating:0};

  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const num=value=>{const n=Number(String(value??"").replace(/%/g,"").trim());return Number.isFinite(n)?n:null;};
  const feedback=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return[]}};
  const saveFeedback=rows=>localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));
  const gameEntries=()=>{
    try{return typeof games!=="undefined"?Object.entries(games).filter(([,g])=>g&&g.home&&g.away):[]}catch{return[]}
  };
  const isVerified=g=>/CONFIRMED|OFFICIAL|VERIFIED/i.test(String(g.sourceLabel||g.confidence||""))||Boolean(g._dbId);
  const hasPbp=g=>Boolean(g.pbp||g.playByPlay||g.events||g.timeline||g.possessions||g.pbpData);
  const hasVideo=g=>Boolean(g.videoEvidence||g.videoClips||g.clips||g.linkedVideo);
  const rowPair=(rows,label)=>{
    const row=(rows||[]).find(r=>String(r?.[0]||"").toLowerCase()===label.toLowerCase());
    return row?[num(row[1]),num(row[2])]:[null,null];
  };
  const factorPair=(g,label)=>rowPair(g.factors,label);
  const statPair=(g,label)=>rowPair(g.stats,label);
  const side=(focus)=>focus==="home"?0:1;

  function factorSignals(g,focus){
    const idx=side(focus),opp=idx?0:1,team=focus==="home"?g.home:g.away,opponent=focus==="home"?g.away:g.home;
    const defs=[
      {key:"eFG%",good:"high",weight:1,title:"Shot-making efficiency",plus:"Your shot profile is creating the cleaner scoring outcome.",minus:"The opponent owns the efficiency edge; shot quality and contest quality need attention.",actionPlus:"Protect the current shot profile: keep generating rim / paint touches and clean kick-out threes before settling.",actionMinus:"Create a better first advantage: prioritize paint touches, short-roll decisions and inside-out threes instead of early contested shots."},
      {key:"TOV%",good:"low",weight:1.15,title:"Possession control",plus:"You are protecting possessions better than the opponent.",minus:"Turnovers are giving away too many possessions.",actionPlus:"Keep the ball-security edge: attack pressure with spacing and punish over-help instead of adding unnecessary risk.",actionMinus:"Simplify the first action: improve spacing, shorten passing windows and identify the opponent pressure that is producing turnovers."},
      {key:"ORB%",good:"high",weight:.85,title:"Offensive glass",plus:"You are creating more second-chance pressure.",minus:"The opponent has the rebounding leverage.",actionPlus:"Keep selective crash rules while maintaining floor balance; identify which matchups can attack the weak side glass.",actionMinus:"Finish defensive possessions: assign hit-first box-outs and protect the weak-side rebound before leaking out."},
      {key:"FTr",good:"high",weight:.75,title:"Free-throw pressure",plus:"You are getting to the line more often relative to shot volume.",minus:"The opponent is applying more rim and foul pressure.",actionPlus:"Continue attacking closeouts and the rim; do not trade the pressure advantage for low-value jumpers.",actionMinus:"Increase paint pressure offensively and defend without reaching; make the opponent finish over length instead of earning free throws."}
    ];
    const out=[];
    for(const d of defs){
      const pair=factorPair(g,d.key); if(pair[0]===null||pair[1]===null) continue;
      const mine=pair[idx],theirs=pair[opp],raw=mine-theirs,edge=d.good==="low"?-raw:raw;
      out.push({...d,mine,theirs,edge,impact:Math.abs(raw)*d.weight,team,opponent,positive:edge>=0});
    }
    return out.sort((a,b)=>b.impact-a.impact);
  }

  function fallbackSignals(g,focus){
    const idx=side(focus),opp=idx?0:1,team=focus==="home"?g.home:g.away,opponent=focus==="home"?g.away:g.home;
    const tov=statPair(g,"Turnovers"),pts=statPair(g,"Points"),oreb=statPair(g,"Offensive Rebounds");
    const arr=[];
    if(tov[idx]!==null&&tov[opp]!==null){const positive=tov[idx]<=tov[opp];arr.push({key:"Turnovers",title:"Possession control",mine:tov[idx],theirs:tov[opp],team,opponent,positive,impact:Math.abs(tov[idx]-tov[opp]),plus:"You committed fewer turnovers.",minus:"You committed more turnovers.",actionPlus:"Keep the passing windows clean and punish pressure without increasing risk.",actionMinus:"Reduce live-ball turnovers by simplifying the first action and improving spacing."});}
    if(oreb[idx]!==null&&oreb[opp]!==null){const positive=oreb[idx]>=oreb[opp];arr.push({key:"OREB",title:"Second-chance pressure",mine:oreb[idx],theirs:oreb[opp],team,opponent,positive,impact:Math.abs(oreb[idx]-oreb[opp]),plus:"You generated more offensive rebounds.",minus:"The opponent generated more offensive rebounds.",actionPlus:"Keep selective weak-side crash rules while protecting transition defense.",actionMinus:"Prioritize hit-first box-outs and finish the possession before running."});}
    if(pts[idx]!==null&&pts[opp]!==null){const positive=pts[idx]>=pts[opp];arr.push({key:"Points",title:"Scoreboard outcome",mine:pts[idx],theirs:pts[opp],team,opponent,positive,impact:Math.abs(pts[idx]-pts[opp])*.25,plus:"The scoreboard outcome favors your side.",minus:"The scoreboard outcome favors the opponent.",actionPlus:"Use the underlying factors—not the final score alone—to identify what should repeat.",actionMinus:"Separate repeatable possession problems from shot-making variance before changing the plan."});}
    return arr.sort((a,b)=>b.impact-a.impact);
  }

  function briefFor(g,focus){
    const team=focus==="home"?g.home:g.away,opponent=focus==="home"?g.away:g.home;
    let signals=factorSignals(g,focus); if(signals.length<3) signals=[...signals,...fallbackSignals(g,focus).filter(x=>!signals.some(s=>s.key===x.key))];
    signals=signals.slice(0,3);
    const tendencies=signals.map(s=>({title:s.title,text:`${s.mine}${String(s.key).includes("%")||["eFG%","TOV%","ORB%"].includes(s.key)?"%":""} vs ${s.theirs}${String(s.key).includes("%")||["eFG%","TOV%","ORB%"].includes(s.key)?"%":""} · ${s.positive?s.plus:s.minus}`,confidence:"BOX SCORE · CONFIRMED OUTCOME"}));
    const decisions=signals.map(s=>({title:s.positive?"Protect the edge":"Correct the leak",text:s.positive?s.actionPlus:s.actionMinus,confidence:hasPbp(g)?"PBP AVAILABLE · VERIFY CAUSE":"VIDEO / PBP CHECK REQUIRED"}));
    const evidence=[isVerified(g)?"OFFICIAL DATA":"LOCAL DATA",hasPbp(g)?"PBP AVAILABLE":"PBP NEEDED",hasVideo(g)?"VIDEO LINKED":"VIDEO CHECK NEEDED"];
    return {team,opponent,tendencies,decisions,evidence};
  }

  function feedbackStats(){
    const rows=feedback(),rated=rows.filter(x=>Number(x.rating)>0),avg=rated.length?rated.reduce((s,x)=>s+Number(x.rating),0)/rated.length:0,repeat=rows.filter(x=>x.useAgain==="yes").length;
    return {count:rows.length,avg,repeatPct:rows.length?Math.round(repeat/rows.length*100):0};
  }

  function launch(){
    document.querySelector(".cq-pilot-modal")?.remove();
    const entries=gameEntries(),stats=feedbackStats();
    const modal=document.createElement("div"); modal.className="cq-pilot-modal";
    modal.innerHTML=`<section class="cq-pilot-shell" role="dialog" aria-modal="true" aria-label="CourtIQ Pilot Mode">
      <header class="cq-pilot-head"><div><div class="cq-pilot-kicker">COURTIQ · STARTUP PILOT MODE</div><h2>Coach value loop</h2><p>Turn verified game data into a short decision brief, then capture whether the coach would actually use it. This separates product value from dashboard volume.</p></div><button class="cq-pilot-close" aria-label="Close">×</button></header>
      <div class="cq-pilot-grid">
        <aside class="cq-pilot-panel">
          <h3>Pilot session</h3>
          <div class="cq-pilot-field"><label>GAME</label><select id="cqPilotGame">${entries.map(([k,g])=>`<option value="${esc(k)}">${esc(g.home)} ${esc(g.hs??"")}–${esc(g.as??"")} ${esc(g.away)} · ${esc(g.comp||"")}</option>`).join("")}</select></div>
          <div class="cq-pilot-field"><label>FOCUS TEAM</label><select id="cqPilotFocus"></select></div>
          <button class="cq-pilot-btn" id="cqPilotBuild">BUILD DECISION BRIEF</button>
          <div class="cq-pilot-stats"><div class="cq-pilot-stat"><b>${entries.filter(([,g])=>isVerified(g)).length}</b><span>verified games</span></div><div class="cq-pilot-stat"><b>${stats.avg?stats.avg.toFixed(1):"—"}</b><span>avg usefulness</span></div><div class="cq-pilot-stat"><b>${stats.count?stats.repeatPct+"%":"—"}</b><span>would use again</span></div></div>
          <div class="cq-pilot-flow"><div class="cq-pilot-step"><i>1</i><span>Import official game</span></div><div class="cq-pilot-step"><i>2</i><span>Verify deterministic metrics</span></div><div class="cq-pilot-step"><i>3</i><span>Turn metrics into decisions</span></div><div class="cq-pilot-step"><i>4</i><span>Ask the coach if it changed preparation</span></div></div>
          <button class="cq-pilot-btn secondary" id="cqPilotExport">EXPORT PILOT FEEDBACK</button>
        </aside>
        <main class="cq-pilot-panel" id="cqPilotOutput">${entries.length?"":"<div class='cq-empty'><div><b>No game is available yet</b>Import a verified game first, then return to Pilot Mode.</div></div>"}</main>
      </div>
    </section>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove(); modal.querySelector(".cq-pilot-close").onclick=close; modal.addEventListener("click",e=>{if(e.target===modal)close()});
    const gameSelect=modal.querySelector("#cqPilotGame"),focusSelect=modal.querySelector("#cqPilotFocus"),output=modal.querySelector("#cqPilotOutput");

    const selected=()=>entries.find(([k])=>k===gameSelect?.value)?.[1];
    const fillFocus=()=>{const g=selected();if(!g||!focusSelect)return;focusSelect.innerHTML=`<option value="home">${esc(g.home)}</option><option value="away">${esc(g.away)}</option>`;};
    const renderBrief=()=>{
      const g=selected(); if(!g)return; state.rating=0; const focus=focusSelect.value||"home",b=briefFor(g,focus);
      output.innerHTML=`<div class="cq-brief-top"><div><div class="cq-pilot-kicker">ONE-PAGE COACH BRIEF</div><div class="cq-brief-score">${esc(b.team)} vs ${esc(b.opponent)}</div><div class="cq-brief-meta">${esc(g.comp||"Game")} · ${esc(g.date||"")} · ${esc(g.hs??"")}–${esc(g.as??"")}</div></div><div class="cq-evidence-badges">${b.evidence.map((x,i)=>`<span class="cq-evidence-badge ${i===0&&isVerified(g)?"good":i>0&&!x.includes("NEEDED")&&!x.includes("CHECK")?"good":"warn"}">${esc(x)}</span>`).join("")}</div></div>
        <div class="cq-brief-columns"><section class="cq-brief-card"><h4>3 VERIFIED TENDENCIES</h4>${b.tendencies.map(x=>`<div class="cq-brief-item"><strong>${esc(x.title)}</strong><span>${esc(x.text)}</span><div class="cq-confidence">${esc(x.confidence)}</div></div>`).join("")}</section><section class="cq-brief-card"><h4>3 COACH DECISIONS</h4>${b.decisions.map(x=>`<div class="cq-brief-item"><strong>${esc(x.title)}</strong><span>${esc(x.text)}</span><div class="cq-confidence">${esc(x.confidence)}</div></div>`).join("")}</section></div>
        <section class="cq-feedback"><h3>Coach validation</h3><div class="cq-feedback-row"><div><div class="cq-pilot-field"><label>HOW USEFUL IS THIS BRIEF?</label><div class="cq-rating">${[1,2,3,4,5].map(n=>`<button type="button" data-rating="${n}">${n}</button>`).join("")}</div></div></div><div class="cq-pilot-field"><label>WOULD YOU USE THIS BEFORE THE NEXT GAME?</label><select id="cqUseAgain"><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select></div></div><div class="cq-pilot-field"><label>WHAT IS MISSING FOR A REAL COACHING DECISION?</label><textarea id="cqPilotNote" placeholder="Example: I need the exact possessions, lineup context, and video clips behind this tendency."></textarea></div><button class="cq-pilot-btn" id="cqPilotSave">SAVE COACH FEEDBACK</button><button class="cq-pilot-btn secondary" id="cqPilotCopy">COPY BRIEF</button><div class="cq-feedback-status" id="cqPilotStatus"></div></section>`;
      output.querySelectorAll("[data-rating]").forEach(btn=>btn.onclick=()=>{state.rating=Number(btn.dataset.rating);output.querySelectorAll("[data-rating]").forEach(x=>x.classList.toggle("active",x===btn));});
      output.querySelector("#cqPilotSave").onclick=()=>{
        const useAgain=output.querySelector("#cqUseAgain").value,note=output.querySelector("#cqPilotNote").value.trim(),status=output.querySelector("#cqPilotStatus");
        if(!state.rating){status.textContent="Choose a usefulness score from 1 to 5.";return} if(!useAgain){status.textContent="Select whether you would use this before the next game.";return}
        const rows=feedback(); rows.push({createdAt:new Date().toISOString(),gameId:g.id||gameSelect.value,gameKey:gameSelect.value,team:b.team,opponent:b.opponent,rating:state.rating,useAgain,note,verified:isVerified(g),pbp:hasPbp(g),video:hasVideo(g)}); saveFeedback(rows); status.textContent="Feedback saved. Pilot KPIs will update the next time you open Pilot Mode.";
      };
      output.querySelector("#cqPilotCopy").onclick=async()=>{
        const text=[`CourtIQ Coach Brief · ${b.team} vs ${b.opponent}`,"", "Tendencies:",...b.tendencies.map((x,i)=>`${i+1}. ${x.title}: ${x.text}`),"","Decisions:",...b.decisions.map((x,i)=>`${i+1}. ${x.title}: ${x.text}`),"","Evidence status: "+b.evidence.join(" · ")].join("\n");
        const status=output.querySelector("#cqPilotStatus"); try{await navigator.clipboard.writeText(text);status.textContent="Decision brief copied."}catch{status.textContent="Clipboard access is unavailable in this browser."}
      };
    };
    if(gameSelect){fillFocus();gameSelect.onchange=()=>{fillFocus();renderBrief()};focusSelect.onchange=renderBrief;modal.querySelector("#cqPilotBuild").onclick=renderBrief;if(entries.length)renderBrief();}
    modal.querySelector("#cqPilotExport").onclick=()=>{const rows=feedback(),blob=new Blob([JSON.stringify(rows,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`courtiq-pilot-feedback-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  }

  function mount(){
    if(document.querySelector(".cq-pilot-launcher"))return;
    const btn=document.createElement("button");btn.type="button";btn.className="cq-pilot-launcher";btn.textContent="PILOT · COACH VALUE";btn.title="Open CourtIQ Startup Pilot Mode";btn.onclick=launch;document.body.appendChild(btn);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
  window.CourtIQStartupPilot={open:launch,feedbackStats};
})();