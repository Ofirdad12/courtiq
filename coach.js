/* CourtIQ coach workflow. Only database imports contribute to season claims. */
(() => {
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const average = (rows, key) => {
    const values = rows.map(row => row[key]).filter(value => value !== null && value !== undefined && value !== "").map(Number).filter(Number.isFinite);
    return values.length ? Math.round(values.reduce((a,b) => a+b,0)/values.length*10)/10 : null;
  };
  const sourceKey = url => { try {const u = new URL(url); return (u.hostname.toLowerCase()+u.pathname.replace(/\/$/,"")).toLowerCase();} catch (_) {return "";} };
  const sourceHost = url => { try {const host = new URL(url).hostname.toLowerCase();return ["ibasketball.co.il","basket.co.il","fiba.basketball","euroleaguebasketball.net","eurobasket.com"].some(domain => host === domain || host.endsWith("."+domain));} catch (_) {return false;} };
  const claims = [
    {key:"turnovers", label:"Possession security · TOV%", metric:"tov", question:"Which actions cause the turnovers, and should our defense pressure them?", live:"Track live-ball turnovers and where the pressure starts."},
    {key:"shooting", label:"Shot conversion · eFG%", metric:"efg", question:"Which shooters and locations explain the efficiency before choosing coverage?", live:"Record shot quality and creator, not only makes and misses."},
    {key:"rebounding", label:"Offensive glass · ORB%", metric:"orb", question:"Who crashes the glass and which lineup must secure the rebound?", live:"Count contested offensive-rebound chances and personnel."}
  ];
  function sampleGames(games, team, venue, opponent) {
    return games.filter(g => (g.home === team || g.away === team) && (!venue || (venue === "home" ? g.home === team : g.away === team)) && (!opponent || (g.home === team ? g.away : g.home) === opponent));
  }
  function gameRow(g, team) {
    const side = g.home === team ? "home" : "away", calc = g.calculated?.[side] || {};
    return {game:g, date:g.date, side, opponent:side === "home" ? g.away : g.home,
      tov:calc.tov, efg:calc.efg, orb:calc.orb};
  }
  function csvRecords(input) {
    const records=[]; let fields=[], field="", quote=false;
    for (let i=0;i<input.length;i++) {
      const ch=input[i];
      if (ch==='"') {if(quote && input[i+1]==='"'){field+='"';i++;} else quote=!quote;}
      else if(ch===','&&!quote){fields.push(field);field="";}
      else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&input[i+1]==='\n')i++;fields.push(field);field="";if(fields.some(x=>x.trim()))records.push(fields);fields=[];}
      else field+=ch;
    }
    if(quote)throw new Error("CSV has an unclosed quote.");
    fields.push(field);if(fields.some(x=>x.trim()))records.push(fields);
    const headings=records.shift()?.map(x=>x.trim().toLowerCase())||[];
    const required=["date","competition","season","provider","home_team","away_team","source_url","status"];
    if(!required.every(h=>headings.includes(h)))throw new Error("CSV columns: "+required.join(", "));
    return records.map((values,i)=>{const row=Object.fromEntries(headings.map((h,j)=>[h,(values[j]||"").trim()]));
      if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!sourceHost(row.source_url)||!["scheduled","final","cancelled"].includes(row.status)||!row.home_team||!row.away_team)throw new Error("Invalid official schedule row "+(i+2));
      return {game_date:row.date,competition:row.competition,season:row.season,provider:row.provider,home_team:row.home_team,away_team:row.away_team,source_url:row.source_url,status:row.status};
    });
  }
  function playerRows(sample,team,minMinutes,role) {
    const map=new Map();
    for(const g of sample){const side=g.home===team?"home":"away";
      for(const p of g.players?.[side]||[]){if(!p.name||!Number.isFinite(Number(p.minutes))||Number(p.minutes)<minMinutes||role && (p.starter?"starter":"bench")!==role)continue;
        if(!map.has(p.name))map.set(p.name,{name:p.name,games:0,minutes:0,points:0,starts:0});
        const row=map.get(p.name);row.games++;row.minutes+=Number(p.minutes);row.points+=Number(p.points)||0;row.starts+=p.starter?1:0;
      }
    }
    return [...map.values()].sort((a,b)=>b.games-a.games||b.minutes-a.minutes).slice(0,12);
  }
  function evidenceCards(rows, key) {
    const subset=rows.filter(e=>e.claim_key===key);
    const make=polarity=>subset.filter(e=>e.polarity===polarity).map(e=>{
      const link=new URL(e.video_url);link.searchParams.set("t",String(e.start_seconds));
      return `<li><a href="${escape(link.toString())}" target="_blank" rel="noopener noreferrer">${escape(e.possession_note)} · ${e.start_seconds}s</a> <small>game ${e.game_id}</small></li>`;
    }).join("");
    return `<div class="coachEvidence"><b>Supporting clips (${subset.filter(e=>e.polarity==="supports").length})</b><ul>${make("supports")||"<li>Awaiting video review.</li>"}</ul><b>Counterexamples (${subset.filter(e=>e.polarity==="counterexample").length})</b><ul>${make("counterexample")||"<li>None annotated; this does not mean none exist.</li>"}</ul></div>`;
  }
  function install() {
    const pills=document.querySelector(".pills");if(!pills||pills.querySelector("#coachSheet"))return;
    const button=document.createElement("button");button.id="coachSheet";button.className="importBtn primaryAction";button.textContent="COACH PREP";
    button.onclick=open;pills.prepend(button);
  }
  async function open() {
    const modal=document.createElement("div");modal.className="modal";
    modal.innerHTML='<div class="modalCard compareModal gameLibrary coachSheet"><button class="modalX">×</button><small class="eyebrow">COURTIQ · COACH WORKFLOW</small><h2>Coach preparation</h2><div id="coachContent">Loading saved sources…</div></div>';
    document.body.appendChild(modal);modal.querySelector(".modalX").onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove();};
    const content=modal.querySelector("#coachContent"), data=window.CourtIQData;
    if(!data?.isSignedIn()){content.innerHTML='<div class="productEmpty"><b>Club sign-in required</b><span>The coach sheet uses saved official games, source history and staff-annotated video.</span></div>';return;}
    let workspace,extra;
    try {workspace=await data.workspace();extra=await data.coachWorkspace(workspace.club.id,workspace.games.map(g=>g.id));}
    catch(e){content.textContent="Could not load coach workspace: "+e.message;return;}
    let saved=workspace.games.map(row=>({...row.payload?.ui,_dbId:row.id,sourceUrl:row.source_url,provider:row.provider})).filter(g=>g.home&&g.away);
    const teams=[...new Set(saved.flatMap(g=>[g.home,g.away]))].sort();
    const defaultTeam=teams.find(t=>/ashdod/i.test(t))||teams[0]||"";
    const options=values=>values.map(value=>`<option value="${escape(value)}">${escape(value)}</option>`).join("");
    content.innerHTML=`<div class="coachControls"><label>Scout team <select id="coachTeam">${options(teams)}</select></label><label>Venue <select id="coachVenue"><option value="">All</option><option value="home">Home</option><option value="away">Away</option></select></label><label>Opponent <select id="coachOpponent"><option value="">All opponents</option></select></label><label>Player role <select id="coachRole"><option value="">All</option><option value="starter">Starter</option><option value="bench">Bench</option></select></label><label>Minimum minutes <input id="coachMinutes" type="number" min="0" max="60" value="0"></label></div><div id="coachSummary"></div><details class="coachOps"><summary>Source coverage, revisions and analyst review</summary><div id="coachOperations"></div></details>`;
    content.querySelector("#coachTeam").value=defaultTeam;
    const refreshOpponent=()=>{const team=content.querySelector("#coachTeam").value,opps=[...new Set(saved.filter(g=>g.home===team||g.away===team).map(g=>g.home===team?g.away:g.home))].sort();content.querySelector("#coachOpponent").innerHTML='<option value="">All opponents</option>'+options(opps);};
    function draw(){
      const team=content.querySelector("#coachTeam").value,venue=content.querySelector("#coachVenue").value,opp=content.querySelector("#coachOpponent").value;
      const sample=sampleGames(saved,team,venue,opp), rows=sample.map(g=>gameRow(g,team)), selectedIds=new Set(sample.map(g=>g._dbId));
      const evidence=extra.evidence.filter(e=>selectedIds.has(e.game_id));
      const dates=rows.map(r=>r.date).filter(Boolean).sort((a,b)=>(Date.parse(a)||0)-(Date.parse(b)||0));
      const period=dates.length?`${escape(dates[0])} – ${escape(dates.at(-1))}`:"No dates";
      const cards=claims.map(claim=>{const value=average(rows,claim.metric),n=rows.filter(r=>Number.isFinite(Number(r[claim.metric]))&&r[claim.metric]!==null&&r[claim.metric]!==undefined).length;
        return `<article class="card box coachClaim"><small>${escape(claim.label)} · ${n} game${n===1?"":"s"}</small><h3>${value===null?"No verified value":value+"%"}</h3><p><b>Decision to examine:</b> ${escape(claim.question)}</p><p><b>During the game:</b> ${escape(claim.live)}</p>${evidenceCards(evidence,claim.key)}<small>${n<3?"SMALL SAMPLE · Treat as a question, not a stable tendency.":"Descriptive sample · Opponent and lineup context still matter."}</small></article>`;}).join("");
      const min=Math.max(0,Number(content.querySelector("#coachMinutes").value)||0),role=content.querySelector("#coachRole").value;
      const players=playerRows(sample,team,min,role);
      content.querySelector("#coachSummary").innerHTML=`<div class="insight">${sample.length} saved games · ${period} · ${escape(venue||"all venues")} · ${escape(opp||"all opponents")}. Only stored official imports are included.</div><div class="coachClaims">${cards}</div><h3>Minutes and role · ${escape(team)}</h3><table class="stats"><tr><th>Player</th><th>Games</th><th>Average minutes</th><th>Starts</th><th>Points / game</th></tr>${players.map(p=>`<tr><td>${escape(p.name)}</td><td>${p.games}</td><td>${Math.round(p.minutes/p.games*10)/10}</td><td>${p.starts}</td><td>${Math.round(p.points/p.games*10)/10}</td></tr>`).join("")||'<tr><td colspan="5">No player rows match these filters.</td></tr>'}</table><div class="insight warning">Lineup combinations and on/off impact require substitution-level events or tagged video. A box score supplies starters and minutes, not five-player lineup possessions.</div>`;
    }
    function drawOps(){
      const imported=new Set(workspace.games.map(g=>sourceKey(g.source_url))), schedule=extra.schedule;
      const pending=schedule.filter(row=>row.status==="final"&&!imported.has(sourceKey(row.source_url)));
      const scheduled=schedule.filter(row=>row.status==="scheduled"&&!imported.has(sourceKey(row.source_url)));
      const revisions=extra.revisions.slice(0,20).map(r=>{const previous=r.previous_payload?.ui;const current=saved.find(g=>g._dbId===r.game_id);
        return `<li>${escape(r.changed_at)} · ${escape(current?.home||"Game "+r.game_id)} · prior ${escape(previous?.hs)}–${escape(previous?.as)} / current ${escape(current?.hs)}–${escape(current?.as)} · source changed</li>`;}).join("");
      const reviewRows=extra.reports.map(report=>{const latest=extra.reviews.find(r=>r.report_id===report.id && r.report_updated_at===report.updated_at),approved=latest?.decision==="approved";
        return `<li>Game ${report.game_id} · ${escape(report.report_version)} · ${approved?"APPROVED":"DRAFT / REVIEW REQUIRED"} ${approved?"":`<button data-approve="${report.id}">Approve reviewed report</button>`}</li>`;}).join("");
      content.querySelector("#coachOperations").innerHTML=`<p>Schedule coverage: ${schedule.length} listed · ${pending.length} final not matched to a saved source · ${scheduled.length} upcoming. Missing means a supplied URL has no matching import; it does not claim a complete league schedule.</p><input id="scheduleCsv" type="file" accept=".csv,text/csv"><small>CSV: date,competition,season,provider,home_team,away_team,source_url,status</small><button id="importMissing" class="runImport" ${pending.length?"":"disabled"}>IMPORT ${pending.length} UNMATCHED FINAL GAMES</button><div id="coachStatus"></div><table class="stats"><tr><th>Date</th><th>Game</th><th>Status</th><th>Source</th></tr>${schedule.map(s=>`<tr><td>${escape(s.game_date||"—")}</td><td>${escape(s.home_team)} – ${escape(s.away_team)}</td><td>${imported.has(sourceKey(s.source_url))?"Imported":s.status==="final"?"Final · unmatched":escape(s.status)}</td><td><a href="${escape(s.source_url)}" target="_blank" rel="noopener">Official link</a></td></tr>`).join("")}</table><h3>Source corrections</h3><ul>${revisions||"<li>No corrected source records yet.</li>"}</ul><h3>Analyst review</h3><ul>${reviewRows||"<li>No saved reports.</li>"}</ul><h3>Tag a possession / video clip</h3><div class="coachControls"><select id="evidenceGame">${options(saved.map(g=>String(g._dbId)))}</select><select id="evidenceClaim">${options(claims.map(c=>c.key))}</select><select id="evidencePolarity"><option value="supports">Supports</option><option value="counterexample">Counterexample</option></select><input id="evidenceUrl" placeholder="Authorized video URL (https://)"><input id="evidenceStart" type="number" min="0" placeholder="Start seconds"><input id="evidenceEnd" type="number" min="0" placeholder="End seconds, optional"><input id="evidenceNote" placeholder="What happened in this possession?"><button id="saveEvidence" class="runImport">SAVE VIDEO EVIDENCE</button></div>`;
      const status=content.querySelector("#coachStatus");
      content.querySelector("#scheduleCsv").onchange=async e=>{try{const rows=csvRecords(await e.target.files[0].text());if(rows.length>100)throw new Error("Import at most 100 fixtures per batch.");for(const row of rows)await data.saveScheduleGame({...row,club_id:workspace.club.id});extra.schedule=(await data.coachWorkspace(workspace.club.id,[])).schedule;drawOps();}catch(err){status.textContent=err.message;}};
      content.querySelector("#importMissing").onclick=async()=>{const errors=[];for(const row of pending){try{status.textContent="Importing "+row.home_team+" – "+row.away_team;await data.importOfficialGame(row.source_url);imported.add(sourceKey(row.source_url));}catch(err){errors.push(row.home_team+" – "+row.away_team+": "+err.message);}}workspace=await data.workspace();saved=workspace.games.map(row=>({...row.payload?.ui,_dbId:row.id,sourceUrl:row.source_url,provider:row.provider})).filter(g=>g.home&&g.away);extra=await data.coachWorkspace(workspace.club.id,workspace.games.map(g=>g.id));drawOps();draw();content.querySelector("#coachStatus").textContent=errors.length?errors.join(" · "):"Import batch complete.";};
      content.querySelectorAll("[data-approve]").forEach(button=>button.onclick=async()=>{const report=extra.reports.find(r=>r.id===Number(button.dataset.approve));try{await data.reviewReport({club_id:workspace.club.id,report_id:report.id,report_updated_at:report.updated_at,decision:"approved",note:"Reviewed by analyst"});extra=await data.coachWorkspace(workspace.club.id,workspace.games.map(g=>g.id));drawOps();}catch(err){status.textContent=err.message;}});
      content.querySelector("#saveEvidence").onclick=async()=>{try{const val=id=>content.querySelector("#"+id).value.trim(),url=val("evidenceUrl"),start=Number(val("evidenceStart")),end=val("evidenceEnd");if(!sourceHost(url)&&!/^https:\/\//.test(url))throw new Error("Use an authorized HTTPS video URL.");if(!Number.isInteger(start)||start<0||!val("evidenceStart"))throw new Error("Enter clip start in seconds.");if(val("evidenceNote").length<5)throw new Error("Describe this possession.");await data.addEvidence({club_id:workspace.club.id,game_id:Number(val("evidenceGame")),claim_key:val("evidenceClaim"),polarity:val("evidencePolarity"),video_url:url,start_seconds:start,end_seconds:end?Number(end):null,possession_note:val("evidenceNote")});extra=await data.coachWorkspace(workspace.club.id,workspace.games.map(g=>g.id));drawOps();draw();}catch(err){status.textContent=err.message;}};
    }
    content.querySelector("#coachTeam").onchange=()=>{refreshOpponent();draw();};
    ["coachVenue","coachOpponent","coachRole","coachMinutes"].forEach(id=>content.querySelector("#"+id).onchange=draw);
    refreshOpponent();draw();drawOps();
  }
  window.CourtIQCoach={install,open,csvRecords,sampleGames,average,sourceKey};
})();
