const games={
g1:{
id:"001",comp:"Athena Winner Cup",date:"September 17, 2026",home:"Hapoel Lev Jerusalem",away:"Maccabi Karmiel",hs:90,as:66,
quarters:[[24,11],[27,17],[31,11],[8,27]],
metrics:[["Offensive Rating","113.4","83.2"],["eFG%","56.4%","52.6%"],["TS%","59.4%","53.3%"],["TOV%","11.7%","31.9%"],["AST/TO","3.00","0.69"]],
findings:[["Turnover Dominance","29 opponent turnovers<br>20 steals<br>41 points off turnovers","+19 turnover differential"],["Interior Efficiency","59.1% on 2PT (26/44)<br>46 paint points","Controlled the game inside"],["Ball Movement","30 assists<br>10 turnovers<br>3.00 AST/TO","Excellent possession control"],["Bench Impact","51–18 bench scoring<br>65.1% TS (bench)","Superior depth and efficiency"],["Transition Game","24 fast-break points<br>41 points off turnovers","Defense created offense"]],
stats:[["Points",90,66],["Rebounds",30,38],["Assists",30,20],["Turnovers",10,29],["Steals",20,5],["Blocks",2,1],["Paint Points",46,26],["Fast Break",24,12],["Points off TO",41,12],["Bench Points",51,18]],
factors:[["eFG%",56.4,52.6],["TOV%",11.7,31.9],["ORB%",20.6,32.4],["FTr",18.6,15.5]],
leaders:[["Joy Osigwe","20","69.8%"],["Hadar Mor Yosef","14","87.5%"],["Emili Giat","12","56.4%"]],
awayLeaders:[["Shoval Kamisa","22","76.8%"],["Shiran Gozlan","13","46.8%"],["Annette Snow","8","44.4%"]],
videos:["Review Karmiel's 29 turnovers","Analyze transition possessions","Examine 2PT efficiency (59.1%)","Classify Karmiel turnover types","Separate meaningful lineups from late-game effects"],
ask:"Jerusalem's strongest confirmed advantage was possession control: 29 Karmiel turnovers, 20 steals and 41 points off turnovers. Tactical causation still requires video verification."
},
g2:{
id:"002",comp:"Social Super Cup",date:"New game",home:"Maccabi Tel Aviv",away:"Hapoel Tel Aviv",hs:101,as:83,
quarters:[[28,26],[26,16],[25,14],[22,27]],
metrics:[["Offensive Rating","131.24","107.85"],["eFG%","55.6%","59.0%"],["TOV%","8.9%","22.4%"],["ORB%","28.9%","26.5%"],["AST/TO","2.86","1.06"]],
findings:[["Possession Control","7 turnovers vs 17<br>25 points off turnovers","Protected +10 possessions"],["Free-Throw Pressure","21/24 FT (87.5%)<br>+10 FT makes","Created a scoring edge at the line"],["Decisive Q2–Q3","Maccabi won Q2–Q3 51–30<br>+23 entering Q4","Game control built before Q4"],["Bench Production","45 bench points<br>66.4% TS","Elite shot conversion"],["Late-clock PnR","23 points in supplied scoring clips<br>18 at ≤12 seconds","Tactical scoring sample"]],
stats:[["Points",101,83],["FG","35/72","30/61"],["2P","25/45","18/31"],["3P","10/27","12/30"],["FT","21/24","11/15"],["Assists",20,18],["Turnovers",7,17],["Offensive Rebounds",11,9],["Points off TO",25,15],["Second Chance",8,16]],
factors:[["eFG%",55.6,59.0],["TOV%",8.9,22.4],["ORB%",28.9,26.5],["FTr",33.3,24.6]],
leaders:[["Roman Sorkin","16","PTS"],["Jaylen Hoard","8","REB"],["Yam Madar","7","AST"]],
awayLeaders:[["Vasilije Micic","17","PTS"],["Dan Oturu","8","REB"],["Vasilije Micic","10","AST"]],
videos:["Review the 7–17 turnover gap","Audit Hapoel's 16 second-chance points","Review all PnR outcomes, not scoring clips only","Study late-clock PnR decisions","Verify coverage frequency with full-game video"],
ask:"Maccabi separated through possession control rather than superior raw shooting: only 7 turnovers versus Hapoel's 17, 25 points off turnovers, and a 10-point free-throw scoring advantage.",
pnr:true
}};
const menu=["▦ Dashboard","◉ Games","◉ Teams","◆ Israel Men's League D1 Teams","♟ Players","⇄ Compare Players","◎ Opponent Scouting","▤ Reports","▣ Video Room","? Ask CourtIQ","⚙ Settings"];
try{
  const savedPilot=localStorage.getItem("courtiq_pilot_game");
  if(savedPilot) games.pilot=JSON.parse(savedPilot); const savedUrl=localStorage.getItem("courtiq_url_game"); if(savedUrl) games.url=JSON.parse(savedUrl);
}catch(e){console.warn("Could not restore pilot game",e)}
let active=games.url?"url":(games.pilot?"pilot":"g2");
let productSyncPromise=null;
async function syncProductData(){
  if(!window.CourtIQData?.isSignedIn()) return null;
  if(productSyncPromise) return productSyncPromise;
  productSyncPromise=(async()=>{
    const w=await window.CourtIQData.workspace();
    Object.keys(games).filter(k=>k.startsWith("db_")).forEach(k=>delete games[k]);
    for(const row of w.games||[]){const ui=row.payload?.ui;if(ui){ui._dbId=row.id;ui._provider=row.provider;ui._externalId=row.external_id;games["db_"+row.id]=ui;}}
    const intelligence=await window.CourtIQData.playerIntelligence();
    window.CourtIQPlayers?.replacePlayers?.(intelligence);
    const dbKeys=Object.keys(games).filter(k=>k.startsWith("db_"));
    if(dbKeys.length && !String(active).startsWith("db_")) active=dbKeys[0];
    return {workspace:w,playerRows:intelligence,dbKeys};
  })().finally(()=>{productSyncPromise=null;});
  return productSyncPromise;
}
window.CourtIQOpenGame=(ui)=>{
 if(!ui) return;
 const key="winner_"+(ui.id||Date.now());
 games[key]=ui; active=key; render(); window.scrollTo(0,0);
};
function productGameEntries(){
  const entries=Object.entries(games).filter(([,g])=>g&&g.home&&g.away);
  return window.CourtIQData?.isSignedIn()?entries.filter(([,g])=>g._dbId):entries;
}
function setBusy(button,busy,label){if(!button)return;if(!button.dataset.label)button.dataset.label=button.textContent;button.disabled=busy;button.textContent=busy?label:(button.dataset.label||button.textContent);}
function pnrModule(){return `<section class="pgrid"><div class="card box audit"><h3>PnR Intelligence — scoring sample</h3><div class="coverage"><div class="card cov"><b>23</b><small>PnR points</small></div><div class="card cov"><b>10</b><small>scoring clips</small></div><div class="card cov"><b>78.3%</b><small>points ≤12 sec</small></div><div class="card cov"><b>10</b><small>points final 6 sec</small></div></div><div class="insight">18 of 23 supplied PnR scoring points came with 12 seconds or fewer on the shot clock.</div><div class="insight">Switch: 8 pts · Hedge / Show: 8 · Under / Contain: 5 · Other late-clock: 2.</div><div class="insight warning">SCORING-SAMPLE LIMITATION: this does not establish coverage frequency, PPP or defensive efficiency. Full PnR outcomes are required.</div></div><div class="card box audit"><h3>PnR Coverage × Shot Clock — points</h3><table class="stats matrix"><tr><th>Coverage</th><th>18–12</th><th>12–6</th><th>6–0</th><th>Total</th></tr><tr><td>Hedge / Show</td><td>2</td><td>6</td><td>0</td><td>8</td></tr><tr><td>Switch</td><td>0</td><td>0</td><td>8</td><td>8</td></tr><tr><td>Under / Contain</td><td>3</td><td>0</td><td>2</td><td>5</td></tr><tr><td>Other late-clock</td><td>0</td><td>2</td><td>0</td><td>2</td></tr></table><div class="insight">Film read: switch scoring included two corner threes and a rim finish; Hedge / Show scoring continued the advantage into paint/rim finishes.</div></div></section>`}
function render(){
const G=games[active];
const dbGameButtons=Object.entries(games).filter(([k])=>k.startsWith("db_")).map(([k,g])=>`<button data-game="${k}" class="${active===k?"sel":""}">DB · ${g.home} ${g.hs}–${g.as} ${g.away}</button>`).join("");
document.querySelector("#app").innerHTML=`<div class="app"><aside class="side"><div class="logo">Court<span>IQ</span><small class="tagline">TURN DATA INTO WINS</small></div><div class="menu">${menu.map((x,i)=>`<div class="${i===0?"on":""}">${x[0]} <span>${x.slice(2)}</span></div>`).join("")}</div><div class="quote">“Better Analysis.<br>Better Basketball.”</div></aside><main class="main"><header class="top"><div class="search">⌕ &nbsp; Search games, teams, players...</div><button id="accountBtn" class="user accountBtn"><small>${window.CourtIQData?.isSignedIn()?"SIGNED IN":"PILOT ACCESS"}</small>${window.CourtIQData?.user()?.email||"Maccabi Bnot Ashdod"}</button></header><div class="content"><div class="v2bar"><div><b>MACCABI BNOT ASHDOD · BUILD 090</b> <span>— Women's Basketball Intelligence Workspace</span></div><div class="pills"><i class="pill">DATA CONFIRMED</i><i class="pill">TACTICAL EVIDENCE</i><i class="pill">VIDEO VERIFICATION</i><button id="playersHub" class="importBtn primaryAction">PLAYER INTELLIGENCE</button><button id="comparePlayers" class="importBtn primaryAction">COMPARE PLAYERS</button><button id="autoImport" class="importBtn primaryAction">AUTO IMPORT</button><button id="opponentScout" class="importBtn">OPPONENT SCOUT</button><button id="fullReport" class="importBtn">FULL GAME REPORT</button><button id="importUrl" class="importBtn secondaryAction">BOX SCORE LINK</button><button id="compareTeams" class="importBtn">COMPARE TEAMS</button><button id="importGame" class="importBtn secondaryAction">CSV FALLBACK</button></div></div><div class="clubbar"><div><small>PILOT WORKSPACE</small><b>Maccabi Bnot Ashdod · 2026/27</b></div><span>${G.sourceLabel||"COURTIQ DEMO DATA"}</span></div><div class="game-switch">${dbGameButtons}${dbGameButtons?"":`<button data-game="g1" class="${active==="g1"?"sel":""}">DEMO · Jerusalem 90–66 Karmiel</button><button data-game="g2" class="${active==="g2"?"sel":""}">DEMO · Maccabi 101–83 Hapoel</button>`}${!window.CourtIQData?.isSignedIn()&&games.pilot?`<button data-game="pilot" class="${active==="pilot"?"sel":""}">LOCAL · ${games.pilot.home} ${games.pilot.hs}–${games.pilot.as} ${games.pilot.away}</button>`:""}${!window.CourtIQData?.isSignedIn()&&games.url?`<button data-game="url" class="${active==="url"?"sel":""}">LOCAL · ${games.url.home} ${games.url.hs}–${games.url.as} ${games.url.away}</button>`:""}</div><div class="crumb">Games › ${G.comp} › ${G.home} vs ${G.away} · ${G.date}</div><section class="gamehead"><div class="team"><div class="badge">${active==="g1"?"JLM":"MTA"}</div><h2>${G.home}</h2></div><div class="score">${G.hs} - ${G.as}<small>FINAL</small></div><div class="team right"><h2>${G.away}</h2><div class="badge">${active==="g1"?"KAR":"HTA"}</div></div></section><div class="tabs">${["Overview","Team Stats","Player Stats","Lineups","Shot Chart","Play-by-Play","Video","AI Insights","Report"].map((x,i)=>`<span class="${i===0?"active":""}">${x}</span>`).join("")}</div><section class="kpis">${G.metrics.map(x=>`<div class="card kpi"><label>${x[0]}</label><b>${x[1]}</b><small>vs ${x[2]}</small></div>`).join("")}</section><section class="card takeaways"><div class="sectionhead"><h3><span>◆</span> KEY TAKEAWAYS</h3><small>Why ${G.home} won</small></div><div class="findings">${G.findings.map((x,i)=>`<div class="finding"><div class="num">${i+1}</div><b>${x[0]}</b><p>${x[1]}</p><em>→ ${x[2]}</em></div>`).join("")}</div></section><section class="grid"><div class="card box"><h3>Score by Quarter</h3><div class="bars">${G.quarters.map((q,i)=>`<div class="q"><div class="bar" style="height:${Math.min(q[0]*4,140)}px"><i>${q[0]}</i></div><div class="bar away" style="height:${Math.min(q[1]*4,140)}px"><i>${q[1]}</i></div><span class="qname">Q${i+1}</span></div>`).join("")}</div></div><div class="card box"><h3>Four Factors Analysis</h3><div class="factors">${G.factors.map(x=>`<div class="factor"><label>${x[0]} · ${G.home.split(" ")[0]} ${x[1]}% / ${G.away.split(" ")[0]} ${x[2]}%</label><div class="track"><div class="homefill" style="width:${x[1]}%"></div><div class="awayfill" style="width:${x[2]}%"></div></div></div>`).join("")}</div></div><div class="card box last"><h3>Key Team Stats</h3><table class="stats"><thead><tr><th>Metric</th><th>Home</th><th>Away</th></tr></thead><tbody>${G.stats.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join("")}</tbody></table></div><div class="card box"><h3>Leaders — ${G.home}</h3><table class="stats"><tr><th>Player</th><th>Value</th><th>Metric</th></tr>${G.leaders.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join("")}</table></div><div class="card box"><h3>Leaders — ${G.away}</h3><table class="stats"><tr><th>Player</th><th>Value</th><th>Metric</th></tr>${G.awayLeaders.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join("")}</table></div><div class="card box last"><h3>Next Steps: Video Investigation</h3><div class="videoList">${G.videos.map((x,i)=>`<div class="videoItem"><span>${i+1}</span>${x}</div>`).join("")}</div></div></section>${G.pnr?pnrModule():""}<section class="card ask"><div><h3>Ask CourtIQ</h3><p>Ask a basketball question about Game #${G.id}.</p><div id="answer" class="answer"></div></div><input id="q" placeholder="What decided this game?"><button id="ask">Analyze</button></section><div class="footer">CourtIQ Product V1 · Maccabi Bnot Ashdod Pilot · Game #${G.id}</div></div></main></div>`;
document.querySelectorAll("[data-game]").forEach(b=>b.onclick=()=>{active=b.dataset.game;render();window.scrollTo(0,0)});
document.querySelector("#ask").onclick=()=>{document.querySelector("#answer").textContent=G.ask};
document.querySelector("#importGame").onclick=openImport;
document.querySelector("#importUrl").onclick=openUrlImport;
document.querySelector("#compareTeams").onclick=openCompare;
document.querySelector("#autoImport").onclick=openAutoImport;
document.querySelector("#opponentScout").onclick=openOpponentScout;
document.querySelector("#fullReport").onclick=openFullReport;
document.querySelector("#accountBtn").onclick=openAccount;
document.querySelector("#playersHub").onclick=()=>window.CourtIQPlayers?.openPlayers();
document.querySelector("#comparePlayers").onclick=()=>window.CourtIQPlayers?.openPlayerCompare();
}

function csvRows(text){
  const lines=text.trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<3) throw new Error("CSV must contain a header and exactly two team rows.");
  const headers=lines[0].split(",").map(x=>x.trim());
  return lines.slice(1).map(line=>{
    const values=line.split(",").map(x=>x.trim());
    return Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));
  });
}
function n(row,...keys){
  for(const k of keys) if(row[k]!==undefined && row[k]!=="") {
    const value=Number(row[k]);
    if(!Number.isFinite(value)) throw new Error("Invalid number in "+k);
    return value;
  }
  throw new Error("Missing field: "+keys.join("/"));
}
function teamFromRow(row){
  const three=n(row,"3PM","three_pm"), threeA=n(row,"3PA","three_pa");
  const fgm=row.FGM!==undefined&&row.FGM!==""?n(row,"FGM"):n(row,"2PM","two_pm")+three;
  const fga=row.FGA!==undefined&&row.FGA!==""?n(row,"FGA"):n(row,"2PA","two_pa")+threeA;
  return {team:row.team||row.Team||"Team",pts:n(row,"PTS","points"),fgm,fga,three,threeA,ftm:n(row,"FTM","ftm"),fta:n(row,"FTA","fta"),oreb:n(row,"OREB","oreb"),dreb:n(row,"DREB","dreb"),tov:n(row,"TOV","tov")};
}
function pct(a,b){return b?Math.round(a/b*1000)/10:0}
function importedGame(home,away,meta){
  const hp=home.fga+.44*home.fta-home.oreb+home.tov, ap=away.fga+.44*away.fta-away.oreb+away.tov;
  const hf=[pct(home.fgm+.5*home.three,home.fga),pct(home.tov,home.fga+.44*home.fta+home.tov),pct(home.oreb,home.oreb+away.dreb),pct(home.fta,home.fga)];
  const af=[pct(away.fgm+.5*away.three,away.fga),pct(away.tov,away.fga+.44*away.fta+away.tov),pct(away.oreb,away.oreb+home.dreb),pct(away.fta,away.fga)];
  return {id:"PILOT",comp:meta.competition||"Pilot Import",date:meta.date||"Imported game",home:home.team,away:away.team,hs:home.pts,as:away.pts,quarters:[],sourceLabel:"OFFICIAL BOXSCORE IMPORT · DATA CONFIRMED",confidence:"DATA CONFIRMED",
    metrics:[["Estimated Possessions",hp.toFixed(1),ap.toFixed(1)],["eFG%",hf[0]+"%",af[0]+"%"],["TOV%",hf[1]+"%",af[1]+"%"],["ORB%",hf[2]+"%",af[2]+"%"],["FTr",hf[3]+"%",af[3]+"%"]],
    findings:[["Verified Import","Box score passed required-field validation","Ready for deterministic analysis"],["Possession Estimate",hp.toFixed(1)+" vs "+ap.toFixed(1),"Calculated from box score"],["Shooting",hf[0]+"% vs "+af[0]+"% eFG","Compare shot-making efficiency"],["Turnovers",home.tov+" vs "+away.tov,"Review possession protection"],["Rebounding",home.oreb+" vs "+away.oreb+" OREB","Review offensive glass"]],
    stats:[["Points",home.pts,away.pts],["FG",home.fgm+"/"+home.fga,away.fgm+"/"+away.fga],["3P",home.three+"/"+home.threeA,away.three+"/"+away.threeA],["FT",home.ftm+"/"+home.fta,away.ftm+"/"+away.fta],["Offensive Rebounds",home.oreb,away.oreb],["Defensive Rebounds",home.dreb,away.dreb],["Turnovers",home.tov,away.tov]],
    factors:[["eFG%",hf[0],af[0]],["TOV%",hf[1],af[1]],["ORB%",hf[2],af[2]],["FTr",hf[3],af[3]]],
    leaders:[],awayLeaders:[],videos:["Review turnover types","Verify transition possessions","Review offensive rebounding chances","Audit shot quality behind eFG%","Add full video/PBP for tactical conclusions"],
    ask:"This imported game has verified box-score calculations. Tactical causation requires play-by-play or video evidence."};
}
function openImport(){
  const modal=document.createElement("div"); modal.className="modal";
  modal.innerHTML='<div class="modalCard"><button class="modalX">×</button><small class="eyebrow">COURTIQ PILOT INGESTION</small><h2>Import a game</h2><p>Upload a two-team CSV export. CourtIQ validates required box-score fields and creates the game locally in this browser.</p><div class="importFields"><input id="impComp" placeholder="Competition (e.g. Winner Cup Women)"><input id="impDate" placeholder="Date (YYYY-MM-DD)"><input id="impFile" type="file" accept=".csv,text/csv"></div><div class="schema">Required: team, PTS, FGM, FGA, 3PM, 3PA, FTM, FTA, OREB, DREB, TOV</div><div id="impStatus" class="impStatus"></div><button id="runImport" class="runImport">VALIDATE & IMPORT</button></div>';
  document.body.appendChild(modal);
  modal.querySelector(".modalX").onclick=()=>modal.remove();
  modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.querySelector("#runImport").onclick=async()=>{
    const status=modal.querySelector("#impStatus"), file=modal.querySelector("#impFile").files[0];
    try{
      if(!file) throw new Error("Choose a CSV file first.");
      const rows=csvRows(await file.text());
      if(rows.length!==2) throw new Error("CourtIQ expects exactly two team-total rows.");
      const home=teamFromRow(rows[0]),away=teamFromRow(rows[1]);
      for(const t of [home,away]){
        if(t.fgm<0||t.fga<0||t.three<0||t.ftm<0||t.fta<0||t.oreb<0||t.dreb<0||t.tov<0) throw new Error("Stats cannot be negative.");
        if(t.fgm>t.fga||t.three>t.fgm||t.ftm>t.fta) throw new Error("Box score failed basketball validation.");
      }
      games.pilot=importedGame(home,away,{competition:modal.querySelector("#impComp").value,date:modal.querySelector("#impDate").value});
      localStorage.setItem("courtiq_pilot_game",JSON.stringify(games.pilot));
      active="pilot"; modal.remove(); render(); window.scrollTo(0,0);
    }catch(err){status.textContent=err.message;}
  };
}
const API_BASE=()=>localStorage.getItem("courtiq_api_base")||"";

function apiGameToUi(x){
  const h=x.home.raw,a=x.away.raw,hf=x.home.four_factors,af=x.away.four_factors,q=x.game.quarters||{};
  const qh=q.home||[],qa=q.away||[];
  const astH=h.ast,astA=a.ast;
  return {id:x.game.id||"URL",comp:"IBBA Official",date:x.game.date||"Imported from URL",home:h.team||x.game.home_team,away:a.team||x.game.away_team,hs:h.points,as:a.points,
    quarters:qh.map((v,i)=>[v,qa[i]??0]),sourceLabel:"IBBA OFFICIAL URL · DATA CONFIRMED",
    metrics:[["Estimated Possessions",x.home.possessions_est,x.away.possessions_est],["eFG%",hf["eFG%"]+"%",af["eFG%"]+"%"],["TOV%",hf["TOV%"]+"%",af["TOV%"]+"%"],["ORB%",hf["ORB%"]+"%",af["ORB%"]+"%"],["FTr",hf.FTr+"%",af.FTr+"%"]],
    findings:[["Official URL Imported","Source parsed and basketball totals validated","DATA CONFIRMED"],["Shooting Efficiency",hf["eFG%"]+"% vs "+af["eFG%"]+"% eFG","Verified from official box score"],["Turnover Control",h.tov+" vs "+a.tov+" turnovers","Review possession protection"],["Offensive Glass",h.oreb+" vs "+a.oreb+" OREB","Review second-chance opportunities"],["Video Next","Box score establishes outcomes, not tactical causation","VIDEO VERIFICATION REQUIRED"]],
    stats:[["Points",h.points,a.points],["FG",h.fgm+"/"+h.fga,a.fgm+"/"+a.fga],["3P",h.three_pm+"/"+h.three_pa,a.three_pm+"/"+a.three_pa],["FT",h.ftm+"/"+h.fta,a.ftm+"/"+a.fta],["Offensive Rebounds",h.oreb,a.oreb],["Defensive Rebounds",h.dreb,a.dreb],["Turnovers",h.tov,a.tov],["Assists",astH??"—",astA??"—"]],
    factors:[["eFG%",hf["eFG%"],af["eFG%"]],["TOV%",hf["TOV%"],af["TOV%"]],["ORB%",hf["ORB%"],af["ORB%"]],["FTr",hf.FTr,af.FTr]],
    leaders:[],awayLeaders:[],videos:["Review turnover types","Review shot quality behind eFG%","Review offensive rebounding chances","Review transition possessions if PBP/video is available","Verify tactical causes on video"],
    ask:"This game was imported from an official IBBA box-score URL. CourtIQ calculations are deterministic; tactical causation requires PBP or video."};
}

function openUrlImport(){
  const modal=document.createElement("div"); modal.className="modal"; const signed=window.CourtIQData?.isSignedIn();
  modal.innerHTML=`<div class="modalCard"><button class="modalX">×</button><small class="eyebrow">COURTIQ · VERIFIED IMPORT</small><h2>Import Official Game</h2><p>Paste an official IBBA or Winner League (basket.co.il) game URL. CourtIQ detects the source, validates the box score, calculates deterministic metrics, saves the game and creates a reusable V1 report.</p><div class="importFields"><input id="boxUrl" placeholder="ibasketball.co.il/match/... or basket.co.il/game-zone.asp?GameId=..."></div><div class="schema">${signed?"SECURE CLUB SESSION · Game will be saved to the Ashdod workspace.":"SIGN IN REQUIRED · Database imports are available only inside a club session."}</div><div id="urlStatus" class="impStatus"></div><button id="runUrl" class="runImport" ${signed?"":"disabled"}>IMPORT · VERIFY · SAVE</button></div>`;
  document.body.appendChild(modal); modal.querySelector(".modalX").onclick=()=>modal.remove(); modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.querySelector("#runUrl").onclick=async()=>{const status=modal.querySelector("#urlStatus"),url=modal.querySelector("#boxUrl").value.trim(),btn=modal.querySelector("#runUrl");try{if(!url)throw new Error("Paste an official IBBA or basket.co.il game URL.");setBusy(btn,true,"IMPORTING…");status.textContent="Fetching official source → validating totals → calculating → saving…";const body=await window.CourtIQData.importOfficialGame(url);const key="db_"+body.game_id;games[key]={...body.ui,_dbId:body.game_id};active=key;await syncProductData();modal.remove();render();window.scrollTo(0,0);}catch(e){status.textContent=e.message;setBusy(btn,false);}};
}

async function openCompare(){
  const modal=document.createElement("div"); modal.className="modal";
  modal.innerHTML='<div class="modalCard compareModal"><button class="modalX">×</button><small class="eyebrow">COURTIQ TEAM COMPARISON</small><h2>Compare imported teams</h2><p>Comparison uses saved verified games and always shows sample size.</p><div class="importFields"><input id="apiUrl2" placeholder="CourtIQ API URL" value="'+API_BASE()+'"><select id="teamA"></select><select id="teamB"></select></div><div id="compareStatus" class="impStatus"></div><div id="compareOut"></div><button id="runCompare" class="runImport">COMPARE</button></div>';
  document.body.appendChild(modal); modal.querySelector(".modalX").onclick=()=>modal.remove();
  const base=modal.querySelector("#apiUrl2").value.trim().replace(/\/$/,"");
  try{
    if(!base) throw new Error("Connect the CourtIQ backend to load saved teams.");
    const res=await fetch(base+"/api/games"),items=await res.json(); if(!res.ok) throw new Error("Could not load game library");
    const teams=[...new Set(items.flatMap(g=>[g.home.raw.team,g.away.raw.team]))].sort();
    for(const id of ["teamA","teamB"]) modal.querySelector("#"+id).innerHTML=teams.map(t=>'<option>'+t+'</option>').join("");
    if(teams.length>1) modal.querySelector("#teamB").selectedIndex=1;
  }catch(e){modal.querySelector("#compareStatus").textContent=e.message}
  modal.querySelector("#runCompare").onclick=async()=>{
    const base=modal.querySelector("#apiUrl2").value.trim().replace(/\/$/,""),team_a=modal.querySelector("#teamA").value,team_b=modal.querySelector("#teamB").value,status=modal.querySelector("#compareStatus");
    try{
      localStorage.setItem("courtiq_api_base",base); status.textContent="Calculating verified comparison…";
      const res=await fetch(base+"/api/compare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({team_a,team_b})});
      const x=await res.json(); if(!res.ok) throw new Error(x.detail||"Comparison failed");
      const keys=Object.keys(x.differences_a_minus_b);
      modal.querySelector("#compareOut").innerHTML='<div class="compareHead"><b>'+x.team_a.team+'</b><span>'+x.team_a.games+' games</span><b>'+x.team_b.team+'</b><span>'+x.team_b.games+' games</span></div><table class="stats compareTable"><tr><th>Metric</th><th>'+x.team_a.team+'</th><th>'+x.team_b.team+'</th><th>Δ</th></tr>'+keys.map(k=>'<tr><td>'+k+'</td><td>'+x.team_a.averages[k]+'</td><td>'+x.team_b.averages[k]+'</td><td>'+x.differences_a_minus_b[k]+'</td></tr>').join("")+'</table><div class="insight">DATA CONFIRMED · Comparison is descriptive and based only on imported games.</div>'; status.textContent="";
    }catch(e){status.textContent=e.message}
  };
}

function openAccount(mode="signin"){
  const data=window.CourtIQData;
  const modal=document.createElement("div");modal.className="modal";
  const signed=data?.isSignedIn();
  const inviteFromUrl=new URLSearchParams(location.search).get("invite")||"";
  let view=inviteFromUrl?"activate":mode;

  const shell=()=>`<div class="modalCard accountModal"><button class="modalX">×</button>
    <small class="eyebrow">COURTIQ · SECURE CLUB ACCESS</small>
    <div id="accountBody"></div>
  </div>`;
  modal.innerHTML=shell();
  document.body.appendChild(modal);
  modal.querySelector(".modalX").onclick=()=>modal.remove();
  modal.onclick=e=>{if(e.target===modal)modal.remove()};

  const draw=()=>{
    const body=modal.querySelector("#accountBody");
    if(view==="reset"){
      body.innerHTML=`<h2>Set New Password</h2>
        <p>Create a new password for your CourtIQ account.</p>
        <div class="importFields">
          <input id="newPassword" type="password" autocomplete="new-password" placeholder="New password · 10+ characters">
          <input id="confirmPassword" type="password" autocomplete="new-password" placeholder="Confirm new password">
        </div>
        <div id="accountStatus" class="impStatus"></div>
        <button id="savePassword" class="runImport">UPDATE PASSWORD</button>
        <div class="schema">The recovery link is verified by Supabase Auth. CourtIQ never stores your password.</div>`;
      body.querySelector("#savePassword").onclick=async()=>{
        const status=body.querySelector("#accountStatus"),p=body.querySelector("#newPassword").value,c=body.querySelector("#confirmPassword").value;
        try{
          if(p.length<10) throw new Error("Password must contain at least 10 characters.");
          if(p!==c) throw new Error("Passwords do not match.");
          status.textContent="Updating password…";
          await data.updatePassword(p);
          status.textContent="Password updated securely.";
          setTimeout(()=>{modal.remove();render();openAccount();},500);
        }catch(e){status.textContent=e.message}
      };
      return;
    }

    if(signed){
      body.innerHTML=`<h2>Club Account</h2><p>Signed in as <b>${data.user()?.email||"club user"}</b>. Club data is protected by Supabase Row Level Security.</p><div id="accountStatus" class="impStatus"></div><button id="loadClub" class="runImport">TEST CLUB ACCESS</button><button id="signOut" class="accountSecondary">SIGN OUT</button>`;
      body.querySelector("#loadClub").onclick=async()=>{
        const status=body.querySelector("#accountStatus");status.textContent="Checking secure club workspace…";
        try{const x=await syncProductData(),w=x.workspace;status.textContent=`Connected · ${w.club.name} · ${w.clubPlayers.length} player records · ${w.games.length} saved games`;}
        catch(e){status.textContent=e.message}
      };
      body.querySelector("#signOut").onclick=()=>{data.signOut();modal.remove();render();};
      return;
    }

    if(view==="activate"){
      body.innerHTML=`<h2>Activate Pilot Account</h2>
        <p>Maccabi Bnot Ashdod · 2026–27 Pilot. Use the one-time CourtIQ invitation to create a secure club account.</p>
        <div class="importFields">
          <input id="pilotEmail" type="email" autocomplete="username" placeholder="Email">
          <input id="pilotPassword" type="password" autocomplete="new-password" placeholder="Password · 10+ characters">
          <input id="pilotInvite" type="text" autocomplete="off" placeholder="Pilot invitation code" value="${inviteFromUrl.replace(/"/g,"&quot;")}">
        </div>
        <div id="accountStatus" class="impStatus"></div>
        <button id="activatePilot" class="runImport">CREATE PILOT ACCOUNT</button>
        <button id="showSignIn" class="accountSecondary">I ALREADY HAVE AN ACCOUNT</button>
        <div class="schema">One-time activation only. The invitation is invalidated after the account is created.</div>`;
      body.querySelector("#showSignIn").onclick=()=>{view="signin";draw();};
      body.querySelector("#activatePilot").onclick=async()=>{
        const status=body.querySelector("#accountStatus");
        const email=body.querySelector("#pilotEmail").value.trim();
        const password=body.querySelector("#pilotPassword").value;
        const invite=body.querySelector("#pilotInvite").value.trim();
        try{
          if(!email||!password||!invite) throw new Error("Enter email, password and pilot invitation code.");
          status.textContent="Creating secure pilot account…";
          const created=await data.createPilotAccount(email,password,invite);
          status.textContent=`Account created for ${created.invitee_name}. Signing in…`;
          await data.signIn(email,password);
          await syncProductData();
          history.replaceState({},document.title,location.pathname);
          modal.remove();render();openPilotDashboard();
        }catch(e){status.textContent=e.message}
      };
      return;
    }

    body.innerHTML=`<h2>Sign in to CourtIQ</h2>
      <p>Use your provisioned pilot account to load Maccabi Bnot Ashdod data from the database.</p>
      <div class="importFields"><input id="loginEmail" type="email" autocomplete="username" placeholder="Email"><input id="loginPassword" type="password" autocomplete="current-password" placeholder="Password"></div>
      <div id="accountStatus" class="impStatus"></div>
      <button id="signIn" class="runImport">SIGN IN</button>
      <button id="forgotPassword" class="accountSecondary">FORGOT PASSWORD?</button>
      <button id="showActivate" class="accountSecondary">ACTIVATE PILOT INVITE</button>
      <div class="schema">Pilot access is club-scoped. Password recovery is handled securely by Supabase Auth.</div>`;
    body.querySelector("#showActivate").onclick=()=>{view="activate";draw();};
    body.querySelector("#forgotPassword").onclick=()=>{
      body.innerHTML=`<h2>Reset Password</h2><p>Enter your CourtIQ account email. If an account exists, you will receive a secure reset link.</p><div class="importFields"><input id="resetEmail" type="email" autocomplete="email" placeholder="Email"></div><div id="accountStatus" class="impStatus"></div><button id="sendReset" class="runImport">SEND RESET LINK</button><button id="backSignIn" class="accountSecondary">BACK TO SIGN IN</button><div class="schema">For security, CourtIQ does not reveal whether an email address is registered.</div>`;
      body.querySelector("#backSignIn").onclick=()=>{view="signin";draw();};
      body.querySelector("#sendReset").onclick=async()=>{
        const status=body.querySelector("#accountStatus"),email=body.querySelector("#resetEmail").value.trim();
        try{if(!email)throw new Error("Enter your email address.");status.textContent="Sending secure reset link…";await data.requestPasswordReset(email);status.textContent="If this email is registered, a password reset link has been sent.";}
        catch(e){status.textContent="Could not send the reset link. Please try again.";}
      };
    };
    body.querySelector("#signIn").onclick=async()=>{
      const status=body.querySelector("#accountStatus");
      const email=body.querySelector("#loginEmail").value.trim(),password=body.querySelector("#loginPassword").value;
      try{
        if(!email||!password) throw new Error("Enter email and password.");
        status.textContent="Signing in…";await data.signIn(email,password);
        status.textContent="Connected securely.";await syncProductData();modal.remove();render();openPilotDashboard();
      }catch(e){status.textContent=e.message}
    };
  };
  draw();
}


function openPilotDashboard(){
  const modal=document.createElement("div"); modal.className="modal";
  const stored=productGameEntries().map(([,g])=>g);
  const verified=stored.filter(g=>String(g.sourceLabel||"").includes("CONFIRMED")).length;
  const playerCount=window.CourtIQPlayers?.players?.length||0;
  const signedIn=window.CourtIQData?.isSignedIn();
  modal.innerHTML=`<div class="modalCard productHome"><button class="modalX">×</button>
    <div class="productHero"><div><small class="eyebrow">COURTIQ · CLUB INTELLIGENCE</small><h2>Maccabi Bnot Ashdod</h2><p>2026–27 Pilot Workspace</p></div><div class="pilotBadge"><span>● PILOT ACTIVE</span><b>BUILD 090</b></div></div>
    <div class="productStats">
      <div><small>GAME LIBRARY</small><b>${stored.length}</b><span>${verified} verified imports</span></div>
      <div><small>SCOUTING PLAYERS</small><b>${playerCount}</b><span>verified source samples</span></div>
      <div><small>REPORT ENGINE</small><b>ACTIVE</b><span>game → report workflow</span></div>
      <div><small>CLUB DATABASE</small><b>${signedIn?"CONNECTED":"LOCKED"}</b><span>${signedIn?"secure session active":"sign in for live data"}</span></div>
    </div>
    <h3 class="productSectionTitle">Club Workflow</h3>
    <div class="productModules">
      <button data-product-action="games"><span>01</span><div><b>Games</b><small>Game library, verified imports and analysis</small></div><i>→</i></button>
      <button data-product-action="import"><span>02</span><div><b>Import Game</b><small>Official source → validate → calculate → save</small></div><i>→</i></button>
      <button data-product-action="players"><span>03</span><div><b>Player Intelligence</b><small>Scouting profiles with deterministic metrics</small></div><i>→</i></button>
      <button data-product-action="compare"><span>04</span><div><b>Compare Players</b><small>Side-by-side samples without arbitrary scoring</small></div><i>→</i></button>
      <button data-product-action="opponent"><span>05</span><div><b>Opponent Scouting</b><small>Stored-game signals and video questions</small></div><i>→</i></button>
      <button data-product-action="report"><span>06</span><div><b>Game Report</b><small>Consistent evidence-first report for the active game</small></div><i>→</i></button>
    </div>
    <button id="dashboardAccount" class="dashboardAccount">${signedIn?"RUN PRODUCT HEALTH CHECK":"CONNECT CLUB DATABASE"}</button><div id="dashboardDataStatus" class="impStatus"></div><div class="productTrust"><b>COURTIQ ANALYSIS STANDARD</b><span>DATA → FINDING → INTERPRETATION → VIDEO VERIFICATION</span><small>Box-score evidence never becomes tactical causation without supporting video.</small></div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".modalX").onclick=()=>modal.remove();
  modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.querySelector("#dashboardAccount").onclick=async()=>{if(!window.CourtIQData?.isSignedIn()){modal.remove();openAccount();return;}const status=modal.querySelector("#dashboardDataStatus");status.textContent="Running secure product checks…";try{const h=await window.CourtIQData.productHealth();const c=h.checks;status.innerHTML=`<b>LIVE PRODUCT HEALTH</b> · ${h.counts.games} games · ${h.counts.reports} reports · roster ${h.counts.roster} · scouting ${h.counts.scouting}<br>${c.secureWorkspace?"✓":"×"} secure workspace · ${c.realGameImported?"✓":"○"} real game · ${c.importValidated?"✓":"○"} validated import · ${c.reportPersisted?"✓":"○"} saved report · ${c.rosterLoaded?"✓":"○"} roster`;await syncProductData();}catch(e){status.textContent=e.message}};
  modal.querySelectorAll("[data-product-action]").forEach(btn=>btn.onclick=()=>{
    const action=btn.dataset.productAction; modal.remove();
    if(action==="games") openGameLibrary();
    if(action==="import") openAutoImport();
    if(action==="players") window.CourtIQPlayers?.openPlayers();
    if(action==="compare") window.CourtIQPlayers?.openPlayerCompare();
    if(action==="opponent") openOpponentScout();
    if(action==="report") openFullReport();
  });
}

async function openGameLibrary(){
  let syncError="";if(window.CourtIQData?.isSignedIn()){try{await syncProductData();}catch(e){syncError=e.message;}}
  const modal=document.createElement("div");modal.className="modal";
  const items=productGameEntries();
  const cards=items.length?items.map(([key,g])=>`<button class="gameLibraryCard" data-library-game="${key}">
    <div><span class="libraryStatus">${g.sourceLabel?.includes("CONFIRMED")?"● DATA CONFIRMED":"● COURTIQ DATA"}</span><small>${g.comp||"Competition"} · ${g.date||""}</small></div>
    <h3>${g.home} <b>${g.hs}–${g.as}</b> ${g.away}</h3>
    <footer><span>OPEN ANALYSIS</span><b>→</b></footer>
  </button>`).join(""):`<div class="productEmpty"><b>NO VERIFIED CLUB GAMES YET</b><span>Import the first official IBBA game to start the persistent club library.</span></div>`;
  modal.innerHTML=`<div class="modalCard compareModal gameLibrary"><button class="modalX">×</button>
    <small class="eyebrow">MACCABI BNOT ASHDOD · PILOT</small><h2>Game Library</h2>
    <p>Persistent club games only. Demo and local browser data are excluded after sign-in.</p>
    <div class="libraryTop"><div><small>GAMES AVAILABLE</small><b>${items.length}</b></div><div><small>WORKFLOW</small><b>Import → Verify → Analyze → Report</b></div><button id="libraryImport" class="runImport">IMPORT GAME</button></div>
    <div class="gameLibraryGrid">${cards}</div><h3 class="productSectionTitle">Men\'s Competitions</h3><button id="winnerCupTab" class="runImport">WINNER CUP</button>
    ${syncError?`<div class="insight warning">DATABASE · ${syncError}</div>`:""}<div class="insight">PILOT RULE · Tactical conclusions remain separate from verified box-score findings until video evidence is available.</div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".modalX").onclick=()=>modal.remove();
  modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.querySelector("#libraryImport").onclick=()=>{modal.remove();openAutoImport();};
  modal.querySelector("#winnerCupTab").onclick=()=>{modal.remove();window.CourtIQMens?.openWinnerCup?.();};
  modal.querySelectorAll("[data-library-game]").forEach(btn=>btn.onclick=()=>{active=btn.dataset.libraryGame;modal.remove();render();window.scrollTo(0,0);});
}
function openAutoImport(){
  const modal=document.createElement("div"); modal.className="modal";
  modal.innerHTML=`<div class="modalCard"><button class="modalX">×</button><small class="eyebrow">COURTIQ · AUTOMATIC GAME IMPORT</small><h2>Automatic Import Center</h2><p>Import an official game once and CourtIQ runs the verified pipeline: source validation → deterministic metrics → game library → scouting/report outputs.</p><div class="workflowSteps"><b>1 · OFFICIAL SOURCE</b><span>IBBA box-score URL</span><b>2 · VERIFY</b><span>Basketball totals validation</span><b>3 · CALCULATE</b><span>eFG%, TS%, TOV%, ORB%, FTr, possessions</span><b>4 · SAVE</b><span>Reusable team/game intelligence</span></div><div class="insight warning">CURRENT V1: automatic after an official URL is supplied. Schedule-wide discovery/sync is not enabled yet.</div><button id="autoGo" class="runImport">IMPORT OFFICIAL GAME</button></div>`;
  document.body.appendChild(modal); modal.querySelector(".modalX").onclick=()=>modal.remove();
  modal.querySelector("#autoGo").onclick=()=>{modal.remove();openUrlImport();};
}
function localTeamGames(team){return productGameEntries().map(([,g])=>g).filter(g=>g&&(g.home===team||g.away===team));}
function oneDecimal(n){return Math.round(n*10)/10}
async function openOpponentScout(){
  let syncError="";if(window.CourtIQData?.isSignedIn()){try{await syncProductData();}catch(e){syncError=e.message;}}
  const productGames=productGameEntries().map(([,g])=>g),G=productGames.find(g=>g===games[active])||productGames[0],teams=[...new Set(productGames.flatMap(g=>g&&g.home?[g.home,g.away]:[]))].filter(Boolean).sort(),defaultOpponent=G?.away||teams[0]||"";
  const modal=document.createElement("div");modal.className="modal";
  modal.innerHTML=`<div class="modalCard compareModal"><button class="modalX">×</button><small class="eyebrow">COURTIQ · MULTI-GAME OPPONENT SCOUTING</small><h2>Opponent Scouting</h2><p>Select a team. CourtIQ aggregates only stored games and shows the exact sample size.</p><div class="importFields"><select id="oppSelect">${teams.map(t=>`<option ${t===defaultOpponent?"selected":""}>${t}</option>`).join("")}</select></div><div id="oppOut"></div>${syncError?`<div class="insight warning">DATABASE · ${syncError}</div>`:""}</div>`;
  document.body.appendChild(modal);modal.querySelector(".modalX").onclick=()=>modal.remove();
  const draw=()=>{const opponent=modal.querySelector("#oppSelect").value,sample=localTeamGames(opponent),rows=sample.map(g=>{const home=g.home===opponent;return `<tr><td>${g.date||"—"}</td><td>${g.home} ${g.hs}–${g.as} ${g.away}</td><td>${home?g.hs:g.as}</td><td>${home?g.as:g.hs}</td></tr>`}).join("");const pf=sample.length?oneDecimal(sample.reduce((n,g)=>n+(g.home===opponent?Number(g.hs):Number(g.as)),0)/sample.length):null,pa=sample.length?oneDecimal(sample.reduce((n,g)=>n+(g.home===opponent?Number(g.as):Number(g.hs)),0)/sample.length):null,calc=sample.map(g=>g.calculated?.[g.home===opponent?"home":"away"]).filter(Boolean),avg=key=>calc.length?oneDecimal(calc.reduce((n,x)=>n+Number(x[key]||0),0)/calc.length):null,video=["Classify opponent turnovers and the pressure/actions that created them.","Review shot quality behind the stored eFG% trend.","Audit offensive-rebound possessions and box-out responsibilities.","Identify actions creating free throws; do not infer causation from FTr alone.","Verify recurring actions across multiple full-game video samples before calling them a tendency."];
    modal.querySelector("#oppOut").innerHTML=`<div class="reportKpis"><div><small>SAMPLE</small><b>${sample.length} game${sample.length===1?"":"s"}</b></div><div><small>PF / PA</small><b>${pf??"—"} / ${pa??"—"}</b></div><div><small>AVG eFG%</small><b>${avg("efg")??"—"}${avg("efg")!=null?"%":""}</b></div><div><small>AVG TOV%</small><b>${avg("tov")??"—"}${avg("tov")!=null?"%":""}</b></div></div><table class="stats"><tr><th>Date</th><th>Game</th><th>PF</th><th>PA</th></tr>${rows||'<tr><td colspan="4">No stored games for this team yet.</td></tr>'}</table><h3>What Should I Watch?</h3><div class="videoList">${video.map((x,i)=>`<div class="videoItem"><span>${i+1}</span>${x}</div>`).join("")}</div><div class="insight ${sample.length<3?"warning":""}"><b>${sample.length>=3?"DATA CONFIRMED":"SMALL SAMPLE"}</b> · Trends are descriptive. Tactical causation requires video verification.</div>`;};
  modal.querySelector("#oppSelect").onchange=draw;draw();
}
async function openFullReport(){
  const G=games[active];if(!G)return;let report=null,reportError="";
  if(G._dbId&&window.CourtIQData?.isSignedIn()){try{const rows=await window.CourtIQData.gameReports(G._dbId);report=rows?.[0]?.payload||null;}catch(e){reportError=e.message;}}
  const R=report||{metrics:G.metrics||[],four_factors:G.factors||[],findings:G.findings||[],team_stats:G.stats||[],video_investigation:G.videos||[],confidence:G.confidence||"COURTIQ DATA"},stat=name=>R.team_stats.find(x=>String(x[0]).toLowerCase().includes(name.toLowerCase()));
  const modal=document.createElement("div");modal.className="modal";
  modal.innerHTML=`<div class="modalCard compareModal reportModal"><button class="modalX">×</button><small class="eyebrow">COURTIQ · FULL GAME REPORT · V1</small><h2>${G.home} ${G.hs}–${G.as} ${G.away}</h2><p>${G.comp} · ${G.date} · ${G.sourceLabel||"COURTIQ DATA"}</p><div class="reportKpis">${R.metrics.map(x=>`<div><small>${x[0]}</small><b>${x[1]}</b><span>vs ${x[2]}</span></div>`).join("")}</div>
  <h3>Game Summary</h3><div class="insight"><b>${R.confidence||"DATA CONFIRMED"}</b> · ${G.home} ${G.hs}–${G.as} ${G.away}. Statistical statements come from the stored game record.</div>
  <h3>Four Factors</h3><table class="stats"><tr><th>Metric</th><th>${G.home}</th><th>${G.away}</th></tr>${R.four_factors.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}%</td><td>${x[2]}%</td></tr>`).join("")}</table>
  <h3>Efficiency & Possessions</h3><div class="reportKpis">${R.metrics.filter(x=>/Rating|Possession|eFG|TS/i.test(x[0])).map(x=>`<div><small>${x[0]}</small><b>${x[1]}</b><span>vs ${x[2]}</span></div>`).join("")||'<div><small>STATUS</small><b>—</b><span>Not available in source</span></div>'}</div>
  <h3>Turnovers</h3><div class="insight">${stat("Turnover")?`${G.home}: ${stat("Turnover")[1]} · ${G.away}: ${stat("Turnover")[2]}`:"Turnover totals are not available in this stored source."}</div>
  <h3>Shot Profile</h3><div class="insight">${[stat("2P"),stat("3P"),stat("FT")].filter(Boolean).map(x=>`${x[0]} · ${x[1]} vs ${x[2]}`).join("<br>")||"Shot-type totals are not available. CourtIQ does not estimate them."}</div>
  <h3>Transition</h3><div class="insight warning"><b>VIDEO VERIFICATION REQUIRED</b> · Transition frequency and tactical cause are not inferred from team box-score totals.</div>
  <h3>Rebounding</h3><div class="insight">${[stat("Offensive Rebounds"),stat("Defensive Rebounds")].filter(Boolean).map(x=>`${x[0]} · ${x[1]} vs ${x[2]}`).join("<br>")||"Rebounding detail is not available in this source."}</div>
  <h3>Player Impact</h3><div class="insight warning">Player-level impact is shown only when verified player rows are stored. Team totals are not used to invent player impact.</div>
  <h3>Key Findings</h3><div class="findings">${R.findings.map((x,i)=>`<div class="finding"><div class="num">${i+1}</div><b>${x[0]}</b><p>${x[1]}</p><em>→ ${x[2]}</em></div>`).join("")}</div><h3>What Should I Watch?</h3><div class="videoList">${R.video_investigation.map((x,i)=>`<div class="videoItem"><span>${i+1}</span>${x}</div>`).join("")}</div>${reportError?`<div class="insight warning">REPORT DATABASE · ${reportError}</div>`:""}<div class="insight">DATA → FINDING → INTERPRETATION → VIDEO VERIFICATION</div></div>`;
  document.body.appendChild(modal);modal.querySelector(".modalX").onclick=()=>modal.remove();
}
function openMensD1Teams(){if(window.CourtIQMens?.openTeams)return window.CourtIQMens.openTeams();}
document.addEventListener("click",e=>{
  const item=e.target.closest(".menu div");
  if(!item) return;
  if(item.textContent.includes("Dashboard")) openPilotDashboard();
  if(item.textContent.includes("Games")) openGameLibrary();
  if(item.textContent.trim()==="◉ Teams" || item.textContent.trim()==="Teams") openMensD1Teams();
  if(item.textContent.includes("Israel Men")) openMensD1Teams();
  if(item.textContent.includes("Opponent Scouting")) openOpponentScout();
  if(item.textContent.includes("Reports")) openFullReport();
});

const recoveryMode=window.CourtIQData?.recoverySessionFromUrl?.()||false;
render();
if(recoveryMode) setTimeout(()=>openAccount("reset"),0);
else if(new URLSearchParams(location.search).get("invite")) setTimeout(()=>openAccount("activate"),0);
