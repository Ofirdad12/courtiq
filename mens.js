const MEN_D1_WINNER_CUP_2026=[
{date:"2026-09-08",home:"Maccabi Rotshtein Ashdod",away:"Hapoel Midtown Jerusalem",hs:77,as:110,status:"FINAL",gameId:"26634",source:"https://basket.co.il/game-zone.asp?GameId=26634"},
{date:"2026-09-08",home:"Ironi Lati Kiryat Ata",away:"Ironi Hai Motors Ness Ziona",hs:94,as:98,status:"FINAL",gameId:"26635",source:"https://basket.co.il/game-zone.asp?GameId=26635"},
{date:"2026-09-09",home:"Hapoel Gilat Telecom Haemek",away:"Maccabi Cnaan Group Ramat Gan",hs:77,as:75,status:"FINAL",gameId:"26636",source:"https://basket.co.il/game-zone.asp?GameId=26636"},
{date:"2026-09-09",home:"Hapoel Irony Eilat",away:"Bnei Penlink Herzliya",hs:98,as:101,status:"FINAL",gameId:"26637",source:"https://basket.co.il/game-zone.asp?GameId=26637"},
{date:"2026-09-10",home:"Ironi Hai Motors Ness Ziona",away:"Hapoel Maoz Daniel Holon",hs:77,as:72,status:"FINAL",gameId:"26638",source:"https://basket.co.il/game-zone.asp?GameId=26638"},
{date:"2026-09-14",home:"Maccabi Tapuzina Rishon LeZion",away:"Hapoel Irony Eilat",hs:85,as:87,status:"FINAL",gameId:"26639",source:"https://basket.co.il/game-zone.asp?GameId=26639"},
{date:"2026-09-15",home:"Hapoel Altshuler Shaham Beer Sheva/Dimona",away:"Maccabi Rotshtein Ashdod",hs:103,as:101,status:"FINAL",note:"OT",gameId:"26640",source:"https://basket.co.il/game-zone.asp?GameId=26640"},
{date:"2026-09-15",home:"Hapoel Maoz Daniel Holon",away:"Ironi Lati Kiryat Ata",hs:79,as:83,status:"FINAL",gameId:"26641",source:"https://basket.co.il/game-zone.asp?GameId=26641"},
{date:"2026-09-16",home:"Maccabi Cnaan Group Ramat Gan",away:"Hapoel Galil Elion",hs:82,as:99,status:"FINAL",gameId:"26642",source:"https://basket.co.il/game-zone.asp?GameId=26642"},
{date:"2026-09-17",home:"Bnei Penlink Herzliya",away:"Maccabi Tapuzina Rishon LeZion",hs:99,as:79,status:"FINAL",gameId:"26643",source:"https://basket.co.il/game-zone.asp?GameId=26643"},
{date:"2026-09-18",home:"Hapoel Midtown Jerusalem",away:"Hapoel Altshuler Shaham Beer Sheva/Dimona",hs:83,as:69,status:"FINAL",gameId:"26644",source:"https://basket.co.il/game-zone.asp?GameId=26644"},
{date:"2026-09-19",home:"Hapoel Galil Elion",away:"Hapoel Gilat Telecom Haemek",hs:83,as:61,status:"FINAL",gameId:"26645",source:"https://basket.co.il/game-zone.asp?GameId=26645"},
{date:"2026-09-22",home:"Maccabi Tapuzina Rishon LeZion",away:"Hapoel Altshuler Shaham Beer Sheva/Dimona",time:"20:55",status:"UPCOMING"},
{date:"2026-09-23",home:"Hapoel Maoz Daniel Holon",away:"Maccabi Cnaan Group Ramat Gan",time:"18:40",status:"UPCOMING"},
{date:"2026-09-23",home:"Hapoel Gilat Telecom Haemek",away:"Ironi Lati Kiryat Ata",time:"20:55",status:"UPCOMING"},
{date:"2026-09-25",home:"Hapoel Midtown Jerusalem",away:"Bnei Penlink Herzliya",time:"14:00",status:"UPCOMING"},
{date:"2026-09-27",home:"Hapoel Irony Eilat",away:"Maccabi Rotshtein Ashdod",time:"18:30",status:"UPCOMING"},
{date:"2026-09-28",home:"Ironi Hai Motors Ness Ziona",away:"Hapoel Galil Elion",time:"20:00",status:"UPCOMING"}
];
function mensTeams(){
 const m=new Map();
 for(const g of MEN_D1_WINNER_CUP_2026){for(const t of [g.home,g.away]){if(!m.has(t))m.set(t,[]);m.get(t).push(g)}}
 return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function winnerDbMap(workspace){
 const m=new Map();
 for(const row of workspace?.games||[]){if(row.provider==="WINNER_LEAGUE"&&row.external_id)m.set(String(row.external_id),row.payload?.ui||null)}
 return m;
}
function splitLine(label,x){return x?`<div class="insight"><b>${label}</b> · TS ${x.ts}% · ${x.points} PTS · ${x.ast} AST · ${x.tov} TO · AST/TO ${x.ast_to??"—"}</div>`:""}
function gameRow(g,dbMap=new Map()){
 const score=g.status==="FINAL"?`<b>${g.hs}–${g.as}</b>`:`<b>${g.time||"TBD"}</b>`,ui=g.gameId?dbMap.get(String(g.gameId)):null;
 const advanced=ui?`<div class="insight"><b>COURTIQ VERIFIED</b> · ${ui.metrics?.slice(0,3).map(x=>x[0]+": "+x[1]+" / "+x[2]).join(" · ")||""}</div>${ui.splits?`<div class="insight"><b>Starters vs Bench TS</b> · Home ${ui.splits.home.starters.ts}% / ${ui.splits.home.bench.ts}% · Away ${ui.splits.away.starters.ts}% / ${ui.splits.away.bench.ts}%</div>`:""}${ui.extra?`<div class="insight"><b>Play PTS</b> · Paint ${ui.extra.home.paint_points}–${ui.extra.away.paint_points} · ATO PTS ${ui.extra.home.points_off_turnovers}–${ui.extra.away.points_off_turnovers} · 2nd Chance ${ui.extra.home.second_chance_points}–${ui.extra.away.second_chance_points}</div>`:""}`:"";
 return `<button class="gameLibraryCard mensGameCard" data-winner-game="${g.gameId||""}"><div><span class="libraryStatus">● ${g.status}</span><small>${g.date} · Winner Cup${g.gameId?" · #"+g.gameId:""}${g.note?" · "+g.note:""}</small></div><h3>${g.home} ${score} ${g.away}</h3>${advanced}<footer><span>${ui?"OPEN ADVANCED GAME":"IMPORT & CALCULATE"}</span><b>→</b></footer></button>`
}
function bindWinnerGames(root,dbMap){
 root.querySelectorAll("[data-winner-game]").forEach(b=>b.onclick=async()=>{
  const id=b.dataset.winnerGame;if(!id)return;let ui=dbMap.get(String(id));
  try{
   if(!ui){
    if(!window.CourtIQData?.isSignedIn()) throw new Error("Sign in to import and calculate this official game.");
    const g=MEN_D1_WINNER_CUP_2026.find(x=>String(x.gameId)===String(id)); if(!g?.source) throw new Error("Official source is not loaded for this game.");
    const old=b.innerHTML;b.disabled=true;b.innerHTML=old+"<div class=\"insight\">Importing official box score and calculating…</div>";
    const result=await window.CourtIQData.importOfficialGame(g.source);ui=result.ui;dbMap.set(String(id),ui);
   }
   window.CourtIQOpenGame?.(ui);
  }catch(e){alert(e.message||String(e));}finally{b.disabled=false}
 });
}
async function loadWinnerWorkspace(){try{return window.CourtIQData?.isSignedIn()?await window.CourtIQData.workspace():null}catch(e){console.warn("Winner Cup workspace sync failed",e);return null}}
async function openWinnerCup(){
 const modal=document.createElement("div");modal.className="modal";modal.innerHTML=`<div class="modalCard compareModal gameLibrary"><button class="modalX">×</button><small class="eyebrow">ISRAEL MEN'S LEAGUE D1 · 2026/27</small><h2>Winner Cup · Games by Team</h2><p>Loading verified CourtIQ game intelligence…</p></div>`;document.body.appendChild(modal);
 modal.querySelector(".modalX").onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
 const dbMap=winnerDbMap(await loadWinnerWorkspace());
 const body=mensTeams().map(([team,gs])=>`<section><h3>${team}</h3><div class="gameLibraryGrid">${gs.map(g=>gameRow(g,dbMap)).join("")}</div></section>`).join("");
 const card=modal.querySelector(".modalCard");card.innerHTML=`<button class="modalX">×</button><small class="eyebrow">ISRAEL MEN'S LEAGUE D1 · 2026/27</small><h2>Winner Cup · Games by Team</h2><p>Every team owns its Winner Cup matchups. Advanced metrics appear after verified official box-score ingestion.</p>${body}<div class="insight"><b>DATA CONFIRMED</b> · Team grouping uses the official Winner Cup schedule. Advanced fields are shown only from saved verified imports.</div>`;
 card.querySelector(".modalX").onclick=()=>modal.remove();
 bindWinnerGames(card,dbMap);
}
async function openMensTeams(){
 const modal=document.createElement("div");modal.className="modal";
 modal.innerHTML=`<div class="modalCard compareModal gameLibrary"><button class="modalX">×</button><small class="eyebrow">COURTIQ · ISRAEL MEN'S LEAGUE D1</small><h2>Teams</h2><p>Loading team intelligence…</p></div>`;document.body.appendChild(modal);modal.querySelector(".modalX").onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
 const dbMap=winnerDbMap(await loadWinnerWorkspace());
 const card=modal.querySelector(".modalCard");
 card.innerHTML=`<button class="modalX">×</button><small class="eyebrow">COURTIQ · ISRAEL MEN'S LEAGUE D1</small><h2>Teams</h2><p>Winner Cup games and verified analytics grouped by team.</p><div class="gameLibraryGrid">${mensTeams().map(([team,gs])=>{const f=gs.filter(g=>g.status==="FINAL");const w=f.filter(g=>(g.home===team?g.hs:g.as)>(g.home===team?g.as:g.hs)).length;return `<button class="gameLibraryCard mensTeamCard" data-team="${team.replace(/"/g,"&quot;")}"><div><span class="libraryStatus">● WINNER CUP</span><small>${f.length} completed · ${w}-${f.length-w}</small></div><h3>${team}</h3><footer><span>VIEW TEAM GAMES + ANALYTICS</span><b>→</b></footer></button>`}).join("")}</div><div id="mensTeamGames"></div>`;
 card.querySelector(".modalX").onclick=()=>modal.remove();
 card.querySelectorAll("[data-team]").forEach(b=>b.onclick=()=>{const team=b.dataset.team,gs=MEN_D1_WINNER_CUP_2026.filter(g=>g.home===team||g.away===team);const target=card.querySelector("#mensTeamGames");target.innerHTML=`<h3>${team} · Winner Cup Matchups</h3><div class="gameLibraryGrid">${gs.map(g=>gameRow(g,dbMap)).join("")}</div>`;bindWinnerGames(target,dbMap);});
}
window.CourtIQMens={games:MEN_D1_WINNER_CUP_2026,openWinnerCup,openTeams:openMensTeams};
