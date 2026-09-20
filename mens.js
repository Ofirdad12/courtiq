const MEN_D1_WINNER_CUP_2026=[
{date:"2026-09-08",home:"Maccabi Rotshtein Ashdod",away:"Hapoel Midtown Jerusalem",hs:77,as:110,status:"FINAL"},
{date:"2026-09-08",home:"Ironi Lati Kiryat Ata",away:"Ironi Hai Motors Ness Ziona",hs:94,as:98,status:"FINAL"},
{date:"2026-09-09",home:"Hapoel Gilat Telecom Haemek",away:"Maccabi Cnaan Group Ramat Gan",hs:77,as:75,status:"FINAL"},
{date:"2026-09-09",home:"Hapoel Irony Eilat",away:"Bnei Penlink Herzliya",hs:98,as:101,status:"FINAL"},
{date:"2026-09-10",home:"Ironi Hai Motors Ness Ziona",away:"Hapoel Maoz Daniel Holon",hs:77,as:72,status:"FINAL"},
{date:"2026-09-14",home:"Maccabi Tapuzina Rishon LeZion",away:"Hapoel Irony Eilat",hs:85,as:87,status:"FINAL"},
{date:"2026-09-15",home:"Hapoel Altshuler Shaham Beer Sheva/Dimona",away:"Maccabi Rotshtein Ashdod",hs:103,as:101,status:"FINAL",note:"OT"},
{date:"2026-09-15",home:"Hapoel Maoz Daniel Holon",away:"Ironi Lati Kiryat Ata",hs:79,as:83,status:"FINAL"},
{date:"2026-09-16",home:"Maccabi Cnaan Group Ramat Gan",away:"Hapoel Galil Elion",hs:82,as:99,status:"FINAL"},
{date:"2026-09-17",home:"Bnei Penlink Herzliya",away:"Maccabi Tapuzina Rishon LeZion",hs:99,as:79,status:"FINAL"},
{date:"2026-09-18",home:"Hapoel Midtown Jerusalem",away:"Hapoel Altshuler Shaham Beer Sheva/Dimona",hs:83,as:69,status:"FINAL"},
{date:"2026-09-19",home:"Hapoel Galil Elion",away:"Hapoel Gilat Telecom Haemek",hs:83,as:61,status:"FINAL"},
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
function gameRow(g){const score=g.status==="FINAL"?`<b>${g.hs}–${g.as}</b>`:`<b>${g.time||"TBD"}</b>`;return `<div class="gameLibraryCard"><div><span class="libraryStatus">● ${g.status}</span><small>${g.date} · Winner Cup${g.note?" · "+g.note:""}</small></div><h3>${g.home} ${score} ${g.away}</h3></div>`}
function openWinnerCup(){
 const modal=document.createElement("div");modal.className="modal";
 const finals=MEN_D1_WINNER_CUP_2026.filter(g=>g.status==="FINAL"),upcoming=MEN_D1_WINNER_CUP_2026.filter(g=>g.status==="UPCOMING");
 modal.innerHTML=`<div class="modalCard compareModal gameLibrary"><button class="modalX">×</button><small class="eyebrow">ISRAEL MEN'S LEAGUE D1 · 2026/27</small><h2>Winner Cup</h2><p>Official schedule/results dataset. Men's competition data is isolated from the Ashdod women's pilot.</p><div class="libraryTop"><div><small>COMPLETED</small><b>${finals.length}</b></div><div><small>UPCOMING LOADED</small><b>${upcoming.length}</b></div></div><h3>Completed Games</h3><div class="gameLibraryGrid">${finals.map(gameRow).join("")}</div><h3>Upcoming Games</h3><div class="gameLibraryGrid">${upcoming.map(gameRow).join("")}</div><div class="insight"><b>DATA CONFIRMED</b> · Results and schedule sourced from the Israel Basketball Super League. Advanced CourtIQ metrics require verified box-score ingestion.</div></div>`;
 document.body.appendChild(modal);modal.querySelector(".modalX").onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
}
function openMensTeams(){
 const modal=document.createElement("div");modal.className="modal";
 modal.innerHTML=`<div class="modalCard compareModal gameLibrary"><button class="modalX">×</button><small class="eyebrow">COURTIQ · ISRAEL MEN'S LEAGUE D1</small><h2>Teams</h2><p>Winner Cup games grouped by team.</p><div class="gameLibraryGrid">${mensTeams().map(([team,gs])=>{const f=gs.filter(g=>g.status==="FINAL");const w=f.filter(g=>(g.home===team?g.hs:g.as)>(g.home===team?g.as:g.hs)).length;return `<button class="gameLibraryCard mensTeamCard" data-team="${team.replace(/"/g,"&quot;")}"><div><span class="libraryStatus">● WINNER CUP</span><small>${f.length} completed · ${w}-${f.length-w}</small></div><h3>${team}</h3><footer><span>VIEW TEAM GAMES</span><b>→</b></footer></button>`}).join("")}</div><div id="mensTeamGames"></div></div>`;
 document.body.appendChild(modal);modal.querySelector(".modalX").onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
 modal.querySelectorAll("[data-team]").forEach(b=>b.onclick=()=>{const team=b.dataset.team,gs=MEN_D1_WINNER_CUP_2026.filter(g=>g.home===team||g.away===team);modal.querySelector("#mensTeamGames").innerHTML=`<h3>${team} · Winner Cup</h3><div class="gameLibraryGrid">${gs.map(gameRow).join("")}</div>`;});
}
window.CourtIQMens={games:MEN_D1_WINNER_CUP_2026,openWinnerCup,openTeams:openMensTeams};
