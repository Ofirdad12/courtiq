const games={
g1:{
id:"001",comp:"Athena Winner Cup",date:"September 17, 2026",home:"Hapoel Lev Jerusalem",away:"Maccabi Karmiel",hs:90,as:66,
sourceUrl:"https://ibasketball.co.il/match/x99002-1/",sourceLabel:"IBBA OFFICIAL BOX SCORE · DATA CONFIRMED",
raw:{home:{points:90,two_pm:26,two_pa:44,three_pm:9,three_pa:26,ftm:11,fta:13,oreb:7,dreb:23,tov:10,ast:30},away:{points:66,two_pm:14,two_pa:32,three_pm:11,three_pa:26,ftm:5,fta:9,oreb:11,dreb:27,tov:29,ast:20}},
quarters:[[24,11],[27,17],[31,11],[8,27]],
metrics:[],
findings:[["Turnover Dominance","29 opponent turnovers<br>20 steals<br>41 points off turnovers","+19 turnover differential"],["Interior Efficiency","59.1% on 2PT (26/44)<br>46 paint points","Controlled the game inside"],["Ball Movement","30 assists<br>10 turnovers<br>3.00 AST/TO","Excellent possession control"],["Bench Impact","51–18 bench scoring<br>65.1% TS (bench)","Superior depth and efficiency"],["Transition Game","24 fast-break points<br>41 points off turnovers","Defense created offense"]],
stats:[],
factors:[],
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
const officialDemoRows={
  home:[
    ["אמילי גיאת",1,"26:03",12,"3-5","0-3","6-6",1,0,4,1,7,0,33],["פייתון וויליאמס",1,"21:21",10,"5-7","0-1","0-0",4,0,0,1,1,0,17],
    ["ירדן דנן",1,"21:02",6,"3-5","0-4","0-0",4,0,1,2,5,0,31],["נוגה הרן",1,"20:20",8,"4-7","0-0","0-0",3,3,3,1,5,1,32],
    ["דומוניק דייויס",1,"18:31",3,"1-1","0-0","1-2",3,2,2,3,2,0,9],["ג'וי אוסיגוואי",0,"22:77",20,"6-10","2-3","2-3",3,1,4,1,2,0,20],
    ["הדר מור יוסף",0,"19:80",14,"1-1","4-7","0-0",2,0,4,1,3,1,29],["אלה במנולקר",0,"18:34",8,"3-4","0-3","2-2",0,1,0,0,2,0,-10],
    ["מירנא אל סאיח",0,"15:02",6,"0-2","2-3","0-0",0,0,1,0,2,0,-3],["ליזה ברקני",0,"09:54",3,"0-1","1-2","0-0",1,0,1,0,1,0,-20],
    ["נטע מישר",0,"07:70",0,"0-1","0-0","0-0",0,0,0,0,0,0,-18],["תמר גרינבוים",0,"00:00",0,"0-0","0-0","0-0",0,0,0,0,0,0,0]
  ],
  away:[
    ["שובל כמיסה",1,"29:45",22,"3-7","5-6","1-3",2,3,3,3,3,0,-31],["נינה בוגיצביץ",1,"29:26",6,"2-2","0-1","2-2",3,0,1,2,2,1,-12],
    ["בריה שאנטי הולמס",1,"27:13",7,"2-5","1-2","0-0",7,2,0,2,0,0,-13],["שירן גוזלן",1,"25:04",13,"4-9","1-4","2-2",3,1,0,6,6,0,-9],
    ["סופיה גומז",1,"21:02",0,"0-1","0-4","0-0",1,0,0,4,3,0,-31],["נויה אלטמן",0,"18:57",2,"1-5","0-0","0-0",1,1,0,3,1,0,-34],
    ["אנט סנואו",0,"18:22",8,"1-2","2-7","0-0",0,2,0,2,0,0,11],["מריה בליץ",0,"18:14",5,"1-1","1-1","0-2",4,0,1,1,4,0,3],
    ["דוניא חדיד",0,"09:02",3,"0-0","1-1","0-0",0,0,0,3,1,0,-6],["אריאל הירן",0,"02:00",0,"0-0","0-0","0-0",0,0,0,0,0,0,2],
    ["שהד עבוד",0,"00:00",0,"0-0","0-0","0-0",0,0,0,0,0,0,0]
  ]
};
function hydrateOfficialDemoGame(game,rows){
  const pct=(a,b)=>b?Math.round(a/b*1000)/10:0, r1=n=>Math.round(n*10)/10, r2=n=>Math.round(n*100)/100;
  const madeAttempted=value=>String(value).split("-").map(Number);
  // IBBA exports minutes as decimal hundredths separated by a colon (22:77 = 22.77).
  const ibbaMinutes=value=>{const [whole,fraction]=String(value).split(":").map(Number);return r1(whole+(fraction||0)/100);};
  const parse=row=>{const [name,starter,minutes,points,two,three,ft,dreb,oreb,steals,tov,ast,blocks,plus_minus]=row;
    const [two_pm,two_pa]=madeAttempted(two),[three_pm,three_pa]=madeAttempted(three),[ftm,fta]=madeAttempted(ft);
    return {name,starter:Boolean(starter),minutes:ibbaMinutes(minutes),points,two_pm,two_pa,three_pm,three_pa,ftm,fta,dreb,oreb,steals,tov,ast,blocks,plus_minus};};
  const calcTeam=(team,opp)=>{const fgm=team.two_pm+team.three_pm,fga=team.two_pa+team.three_pa,oppFga=opp.two_pa+opp.three_pa;
    const possessions=fga+.44*team.fta-team.oreb+team.tov,oppPossessions=oppFga+.44*opp.fta-opp.oreb+opp.tov;
    const pace=r1((possessions+oppPossessions)/2),ortg=r1(team.points/possessions*100),drtg=r1(opp.points/oppPossessions*100),trb=team.oreb+team.dreb,oppTrb=opp.oreb+opp.dreb;
    return {possessions:r1(possessions),pace,ortg,drtg,net_rating:r1(ortg-drtg),fg_pct:pct(fgm,fga),two_pct:pct(team.two_pm,team.two_pa),three_pct:pct(team.three_pm,team.three_pa),ft_pct:pct(team.ftm,team.fta),efg:pct(fgm+.5*team.three_pm,fga),ts:pct(team.points,2*(fga+.44*team.fta)),pps:r2(team.points/fga),three_pa_rate:pct(team.three_pa,fga),tov:pct(team.tov,fga+.44*team.fta+team.tov),orb:pct(team.oreb,team.oreb+opp.dreb),drb:pct(team.dreb,team.dreb+opp.oreb),trb:pct(trb,trb+oppTrb),ftr:pct(team.fta,fga),ast_to:r2(team.ast/team.tov),assisted_fg_pct:pct(team.ast,fgm),margin:team.points-opp.points};};
  const advancedPlayer=(player,team,opp)=>{const fgm=player.two_pm+player.three_pm,fga=player.two_pa+player.three_pa,missed=fga-fgm+player.fta-player.ftm;
    const playEnds=fga+.44*player.fta+player.tov,teamPoss=team.two_pa+team.three_pa+.44*team.fta-team.oreb+team.tov,per40=value=>player.minutes?r1(value*40/player.minutes):0;
    return {...player,fgm,fga,rebounds:player.oreb+player.dreb,fg_pct:pct(fgm,fga),two_pct:pct(player.two_pm,player.two_pa),three_pct:pct(player.three_pm,player.three_pa),ft_pct:pct(player.ftm,player.fta),efg:pct(fgm+.5*player.three_pm,fga),ts:pct(player.points,2*(fga+.44*player.fta)),pps:fga?r2(player.points/fga):0,three_pa_rate:pct(player.three_pa,fga),ast_to:player.tov?r2(player.ast/player.tov):(player.ast?"∞":0),points_per_40:per40(player.points),rebounds_per_40:per40(player.oreb+player.dreb),assists_per_40:per40(player.ast),play_end_share:pct(playEnds,teamPoss),oreb_pct:player.minutes?pct(player.oreb*40,player.minutes*(team.oreb+opp.dreb)):0,dreb_pct:player.minutes?pct(player.dreb*40,player.minutes*(team.dreb+opp.oreb)):0,box_impact_per_40:per40(player.points+player.oreb+player.dreb+player.ast+player.steals+player.blocks-missed-player.tov)};};
  const aggregate=players=>{const keys=["minutes","points","two_pm","two_pa","three_pm","three_pa","ftm","fta","oreb","dreb","tov","ast","steals","blocks"],out={};
    keys.forEach(key=>out[key]=r1(players.reduce((sum,p)=>sum+Number(p[key]||0),0)));const fga=out.two_pa+out.three_pa,fgm=out.two_pm+out.three_pm;
    return {...out,efg:pct(fgm+.5*out.three_pm,fga),ts:pct(out.points,2*(fga+.44*out.fta)),ast_to:out.tov?r2(out.ast/out.tov):(out.ast?"∞":0)};};
  const home=game.raw.home,away=game.raw.away,hm=calcTeam(home,away),am=calcTeam(away,home);
  game.calculated={home:{...hm,bench_share:pct(51,home.points)},away:{...am,bench_share:pct(18,away.points)}};
  game.players={home:rows.home.map(parse).map(p=>advancedPlayer(p,home,away)),away:rows.away.map(parse).map(p=>advancedPlayer(p,away,home))};
  game.splits={home:{starters:aggregate(game.players.home.filter(p=>p.starter)),bench:aggregate(game.players.home.filter(p=>!p.starter))},away:{starters:aggregate(game.players.away.filter(p=>p.starter)),bench:aggregate(game.players.away.filter(p=>!p.starter))}};
  game.metrics=[["Offensive Rating",hm.ortg.toFixed(1),am.ortg.toFixed(1)],["Defensive Rating",hm.drtg.toFixed(1),am.drtg.toFixed(1)],["Net Rating",hm.net_rating.toFixed(1),am.net_rating.toFixed(1)],["eFG%",hm.efg+"%",am.efg+"%"],["Pace",hm.pace.toFixed(1),am.pace.toFixed(1)]];
  game.factors=[["eFG%",hm.efg,am.efg],["TOV%",hm.tov,am.tov],["ORB%",hm.orb,am.orb],["FTr",hm.ftr,am.ftr]];
  game.stats=[["Points",90,66],["Point Margin",hm.margin,am.margin],["Possessions",hm.possessions,am.possessions],["Pace",hm.pace,am.pace],["ORtg",hm.ortg,am.ortg],["DRtg",hm.drtg,am.drtg],["Net Rating",hm.net_rating,am.net_rating],["FG","35/70","25/58"],["FG%",hm.fg_pct+"%",am.fg_pct+"%"],["2P","26/44","14/32"],["2P%",hm.two_pct+"%",am.two_pct+"%"],["3P","9/26","11/26"],["3P%",hm.three_pct+"%",am.three_pct+"%"],["FT","11/13","5/9"],["FT%",hm.ft_pct+"%",am.ft_pct+"%"],["eFG%",hm.efg+"%",am.efg+"%"],["TS%",hm.ts+"%",am.ts+"%"],["PPS",hm.pps,am.pps],["3PA Rate",hm.three_pa_rate+"%",am.three_pa_rate+"%"],["TOV%",hm.tov+"%",am.tov+"%"],["FTr",hm.ftr+"%",am.ftr+"%"],["Assists",30,20],["AST/TO",hm.ast_to,am.ast_to],["Assisted FG%",hm.assisted_fg_pct+"%",am.assisted_fg_pct+"%"],["Turnovers",10,29],["Offensive Rebounds",7,11],["Defensive Rebounds",23,27],["ORB%",hm.orb+"%",am.orb+"%"],["DRB%",hm.drb+"%",am.drb+"%"],["TRB%",hm.trb+"%",am.trb+"%"],["Steals",20,5],["Blocks",2,1],["Paint Points",46,26],["Fast Break",24,12],["Points off TO",41,12],["Starters Points",39,48],["Bench Points",51,18],["Bench Share","56.7%","27.3%"],["Starters TS%",game.splits.home.starters.ts+"%",game.splits.away.starters.ts+"%"],["Bench TS%",game.splits.home.bench.ts+"%",game.splits.away.bench.ts+"%"]];
  game.leaders=[["ג'וי אוסיגוואי",20,"PTS"],["נוגה הרן",6,"REB"],["אמילי גיאת",7,"AST"]];game.awayLeaders=[["שובל כמיסה",22,"PTS"],["בריה שאנטי הולמס",9,"REB"],["שירן גוזלן",6,"AST"]];
}
hydrateOfficialDemoGame(games.g1,officialDemoRows);
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
function teamBadge(name){
  const n=String(name||"");
  if(/ירושלים|י-ם/.test(n))return "JLM";
  if(/באר שבע|ב\"ש|ב״ש/.test(n))return "B7";
  if(/אשדוד/.test(n))return "ASH";
  if(/הרצליה/.test(n))return "HER";
  if(/אילת/.test(n))return "EIL";
  if(/ראשון/.test(n))return "RLS";
  const words=n.replace(/[^\p{L}\p{N}\s]/gu," ").trim().split(/\s+/).filter(Boolean);
  return (words.length>1?words.slice(-2).map(x=>x[0]).join(""):words[0]?.slice(0,3)||"TEAM").toUpperCase();
}
function gameWinner(G){return Number(G.hs)===Number(G.as)?"Tied game":(Number(G.hs)>Number(G.as)?G.home:G.away)+" won";}
function quarterLabel(index){return index<4?"Q"+(index+1):"OT"+(index===4?"":index-3);}
function htmlEsc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function playerAnalyticsModule(G){
  if(!G.players?.home?.length&&!G.players?.away?.length)return "";
  const table=(team,players)=>`<div class="card box playerBox"><h3>${htmlEsc(team)} · Advanced Player Analytics</h3><div class="playerScroll"><table class="stats playerStats"><thead><tr><th>Player</th><th>Role</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG%</th><th>2P%</th><th>3P%</th><th>FT%</th><th>eFG%</th><th>TS%</th><th>PPS</th><th>3PA Rate</th><th>AST/TO</th><th>PTS/40</th><th>REB/40</th><th>AST/40</th><th>Play-end%</th><th>OREB%</th><th>DREB%</th><th>Box Impact/40</th><th>+/-</th></tr></thead><tbody>${players.map(p=>`<tr><td>${htmlEsc(p.name)}</td><td>${p.starter?"Starter":"Bench"}</td><td>${p.minutes??"—"}</td><td>${p.points??"—"}</td><td>${p.rebounds??"—"}</td><td>${p.ast??"—"}</td><td>${p.fg_pct??"—"}</td><td>${p.two_pct??"—"}</td><td>${p.three_pct??"—"}</td><td>${p.ft_pct??"—"}</td><td>${p.efg??"—"}</td><td>${p.ts??"—"}</td><td>${p.pps??"—"}</td><td>${p.three_pa_rate??"—"}</td><td>${p.ast_to??"—"}</td><td>${p.points_per_40??"—"}</td><td>${p.rebounds_per_40??"—"}</td><td>${p.assists_per_40??"—"}</td><td>${p.play_end_share??"—"}</td><td>${p.oreb_pct??"—"}</td><td>${p.dreb_pct??"—"}</td><td>${p.box_impact_per_40??"—"}</td><td>${p.plus_minus??"—"}</td></tr>`).join("")}</tbody></table></div></div>`;
  return `<section class="playerGrid">${table(G.home,G.players.home||[])}${table(G.away,G.players.away||[])}</section><div class="metricNote">Player metrics are deterministic box-score calculations. Play-end% is an estimated share of team possessions ending in a shot, free throws or turnover; Box Impact/40 is a transparent box-score index, not PER. Tactical impact still requires video.</div>`;
}
function splitModule(G){
  if(!G.splits?.home||!G.splits?.away)return "";
  const row=(label,key,format=x=>x)=>`<tr><td>${label}</td><td>${format(G.splits.home.starters?.[key])}</td><td>${format(G.splits.home.bench?.[key])}</td><td>${format(G.splits.away.starters?.[key])}</td><td>${format(G.splits.away.bench?.[key])}</td></tr>`;
  return `<section class="card box splitBox"><h3>Starters vs Bench</h3><div class="playerScroll"><table class="stats"><thead><tr><th>Metric</th><th>${htmlEsc(G.home)} · 5</th><th>${htmlEsc(G.home)} · Bench</th><th>${htmlEsc(G.away)} · 5</th><th>${htmlEsc(G.away)} · Bench</th></tr></thead><tbody>${row("Points","points")}${row("Minutes","minutes")}${row("eFG%","efg",x=>(x??"—")+"%")} ${row("TS%","ts",x=>(x??"—")+"%")} ${row("AST/TO","ast_to")}${row("OREB","oreb")}${row("DREB","dreb")}</tbody></table></div></section>`;
}
function teamStatsModule(G){
  const rows=(G.stats||[]).map(x=>`<tr><td>${htmlEsc(x[0])}</td><td>${htmlEsc(x[1])}</td><td>${htmlEsc(x[2])}</td></tr>`).join("");
  const factors=(G.factors||[]).map(x=>`<div class="teamFactor"><small>${htmlEsc(x[0])}</small><b>${htmlEsc(x[1])}%</b><span>${htmlEsc(G.home)}</span><b>${htmlEsc(x[2])}%</b><span>${htmlEsc(G.away)}</span></div>`).join("");
  return `<section class="gameViewPanel" data-game-view="team"><div class="viewTitle"><div><small>TEAM ANALYTICS</small><h3>Team Stats</h3></div><span>Official box score + calculated efficiency</span></div><div class="teamStatsLayout"><div class="card box teamStatsCard"><h3>${htmlEsc(G.home)} vs ${htmlEsc(G.away)}</h3><div class="playerScroll"><table class="stats teamStatsTable"><thead><tr><th>Metric</th><th>${htmlEsc(G.home)}</th><th>${htmlEsc(G.away)}</th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="card box teamFactorsCard"><h3>Four Factors</h3><div class="teamFactors">${factors}</div></div></div>${splitModule(G)}</section>`;
}
function playerStatsView(G){
  const analytics=playerAnalyticsModule(G);
  return `<section class="gameViewPanel" data-game-view="player"><div class="viewTitle"><div><small>PLAYER INTELLIGENCE</small><h3>Player Stats</h3></div><span>Advanced analytics per player</span></div>${analytics||'<div class="card emptyView"><b>Player Stats will appear after the official final box score is published.</b><span>No player values are estimated before the source data is available.</span></div>'}</section>`;
}
function playByPlayModule(G){
  const events=Array.isArray(G.playByPlay)?G.playByPlay:[];
  const source=G.sourceUrl||G.source_url||"https://ibasketball.co.il/match/x99002-2/";
  const rows=events.map(e=>`<tr><td>${htmlEsc(e.period_label||("Q"+(e.period||"—")))}</td><td>${htmlEsc(e.clock||"—")}</td><td>${htmlEsc(e.score||"—")}</td><td>${htmlEsc(e.team||"—")}</td><td>${htmlEsc(e.player||"—")}</td><td>${htmlEsc(e.description||e.action||"—")}</td></tr>`).join("");
  const content=events.length?`<div class="pbpMeta"><b>${events.length} official events</b><span>Chronological order · earliest to latest</span></div><div class="card pbpCard"><div class="playerScroll"><table class="stats pbpTable"><thead><tr><th>Period</th><th>Clock</th><th>Score</th><th>Team</th><th>Player</th><th>Play</th></tr></thead><tbody>${rows}</tbody></table></div></div>`:`<div class="card emptyView"><b>Play-by-Play is not published yet.</b><span>After the game, re-import the official IBBA link. CourtIQ will load the official event timeline automatically and will not invent possessions from the box score.</span><a href="${htmlEsc(source)}" target="_blank" rel="noopener">Open official game page</a></div>`;
  return `<section class="gameViewPanel" data-game-view="play"><div class="viewTitle"><div><small>OFFICIAL EVENT FEED</small><h3>Play-by-Play</h3></div><span>${events.length?"DATA CONFIRMED":"WAITING FOR IBBA"}</span></div>${content}</section>`;
}
function installGameViews(G){
  const tabs=document.querySelector(".tabs");
  const overview=document.querySelector(".kpis");
  if(!tabs||!overview)return;
  tabs.innerHTML=[["overview","Overview"],["team","Team Stats"],["player","Player Stats"],["play","Play-by-Play"]].map(([key,label],i)=>`<button type="button" data-game-tab="${key}" class="${i===0?"active":""}">${label}</button>`).join("");
  overview.insertAdjacentHTML("beforebegin",teamStatsModule(G)+playerStatsView(G)+playByPlayModule(G));
  [".kpis",".takeaways",".grid",".pgrid",".ask"].forEach(selector=>document.querySelectorAll(selector).forEach(el=>el.dataset.gameView="overview"));
  const activate=view=>{
    document.querySelectorAll("[data-game-view]").forEach(el=>{el.hidden=el.dataset.gameView!==view;});
    tabs.querySelectorAll("[data-game-tab]").forEach(el=>el.classList.toggle("active",el.dataset.gameTab===view));
  };
  tabs.querySelectorAll("[data-game-tab]").forEach(button=>button.onclick=()=>activate(button.dataset.gameTab));
  activate("overview");
}
function downloadBlob(name,type,content){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function exportCurrentGame(G,format){
  const safe=String(G.id||"game").replace(/[^a-z0-9_-]/gi,"-");
  if(format==="json") return downloadBlob(`courtiq-${safe}.json`,"application/json",JSON.stringify(G,null,2));
  const quote=v=>'"'+String(v??"").replaceAll('"','""')+'"';
  const header=["team","player","role","minutes","points","rebounds","assists","turnovers","fg_pct","two_pct","three_pct","ft_pct","efg_pct","ts_pct","pps","three_pa_rate_pct","ast_to","pts_per_40","reb_per_40","ast_per_40","play_end_share_pct","oreb_pct","dreb_pct","box_impact_per_40","plus_minus"];
  const rows=[header,...[[G.home,G.players?.home||[]],[G.away,G.players?.away||[]]].flatMap(([team,players])=>players.map(p=>[team,p.name,p.starter?"starter":"bench",p.minutes,p.points,p.rebounds,p.ast,p.tov,p.fg_pct,p.two_pct,p.three_pct,p.ft_pct,p.efg,p.ts,p.pps,p.three_pa_rate,p.ast_to,p.points_per_40,p.rebounds_per_40,p.assists_per_40,p.play_end_share,p.oreb_pct,p.dreb_pct,p.box_impact_per_40,p.plus_minus]))];
  downloadBlob(`courtiq-${safe}-players.csv`,"text/csv;charset=utf-8","\ufeff"+rows.map(r=>r.map(quote).join(",")).join("\n"));
}
function pnrModule(){return `<section class="pgrid"><div class="card box audit"><h3>PnR Intelligence — scoring sample</h3><div class="coverage"><div class="card cov"><b>23</b><small>PnR points</small></div><div class="card cov"><b>10</b><small>scoring clips</small></div><div class="card cov"><b>78.3%</b><small>points ≤12 sec</small></div><div class="card cov"><b>10</b><small>points final 6 sec</small></div></div><div class="insight">18 of 23 supplied PnR scoring points came with 12 seconds or fewer on the shot clock.</div><div class="insight">Switch: 8 pts · Hedge / Show: 8 · Under / Contain: 5 · Other late-clock: 2.</div><div class="insight warning">SCORING-SAMPLE LIMITATION: this does not establish coverage frequency, PPP or defensive efficiency. Full PnR outcomes are required.</div></div><div class="card box audit"><h3>PnR Coverage × Shot Clock — points</h3><table class="stats matrix"><tr><th>Coverage</th><th>18–12</th><th>12–6</th><th>6–0</th><th>Total</th></tr><tr><td>Hedge / Show</td><td>2</td><td>6</td><td>0</td><td>8</td></tr><tr><td>Switch</td><td>0</td><td>0</td><td>8</td><td>8</td></tr><tr><td>Under / Contain</td><td>3</td><td>0</td><td>2</td><td>5</td></tr><tr><td>Other late-clock</td><td>0</td><td>2</td><td>0</td><td>2</td></tr></table><div class="insight">Film read: switch scoring included two corner threes and a rim finish; Hedge / Show scoring continued the advantage into paint/rim finishes.</div></div></section>`}
function render(){
const G=games[active];
const dbGameButtons=Object.entries(games).filter(([k])=>k.startsWith("db_")).map(([k,g])=>`<button data-game="${k}" class="${active===k?"sel":""}">DB · ${g.home} ${g.hs}–${g.as} ${g.away}</button>`).join("");
document.querySelector("#app").innerHTML=`<div class="app"><aside class="side"><div class="logo">Court<span>IQ</span><small class="tagline">TURN DATA INTO WINS</small></div><div class="menu">${menu.map((x,i)=>`<div class="${i===0?"on":""}">${x[0]} <span>${x.slice(2)}</span></div>`).join("")}</div><div class="quote">“Better Analysis.<br>Better Basketball.”</div></aside><main class="main"><header class="top"><div class="search">⌕ &nbsp; Search games, teams, players...</div><button id="accountBtn" class="user accountBtn"><small>${window.CourtIQData?.isSignedIn()?"SIGNED IN":"PILOT ACCESS"}</small>${window.CourtIQData?.user()?.email||"Maccabi Bnot Ashdod"}</button></header><div class="content"><div class="v2bar"><div><b>MACCABI BNOT ASHDOD · BUILD 091</b> <span>— Women's Basketball Intelligence Workspace</span></div><div class="pills"><i class="pill">DATA CONFIRMED</i><i class="pill">TACTICAL EVIDENCE</i><i class="pill">VIDEO VERIFICATION</i><button id="playersHub" class="importBtn primaryAction">PLAYER INTELLIGENCE</button><button id="comparePlayers" class="importBtn primaryAction">COMPARE PLAYERS</button><button id="autoImport" class="importBtn primaryAction">AUTO IMPORT</button><button id="opponentScout" class="importBtn">OPPONENT SCOUT</button><button id="fullReport" class="importBtn">FULL GAME REPORT</button><button id="importUrl" class="importBtn secondaryAction">BOX SCORE LINK</button><button id="compareTeams" class="importBtn">COMPARE TEAMS</button><button id="importGame" class="importBtn secondaryAction">CSV FALLBACK</button></div></div><div class="clubbar"><div><small>PILOT WORKSPACE</small><b>Maccabi Bnot Ashdod · 2026/27</b></div><span>${G.sourceLabel||"COURTIQ DEMO DATA"}</span></div><div class="game-switch">${dbGameButtons}${dbGameButtons?"":`<button data-game="g1" class="${active==="g1"?"sel":""}">DEMO · Jerusalem 90–66 Karmiel</button><button data-game="g2" class="${active==="g2"?"sel":""}">DEMO · Maccabi 101–83 Hapoel</button>`}${!window.CourtIQData?.isSignedIn()&&games.pilot?`<button data-game="pilot" class="${active==="pilot"?"sel":""}">LOCAL · ${games.pilot.home} ${games.pilot.hs}–${games.pilot.as} ${games.pilot.away}</button>`:""}${!window.CourtIQData?.isSignedIn()&&games.url?`<button data-game="url" class="${active==="url"?"sel":""}">LOCAL · ${games.url.home} ${games.url.hs}–${games.url.as} ${games.url.away}</button>`:""}</div><div class="crumb">Games › ${G.comp} › ${G.home} vs ${G.away} · ${G.date}</div><section class="gamehead"><div class="team"><div class="badge">${teamBadge(G.home)}</div><h2>${G.home}</h2></div><div class="score">${G.hs} - ${G.as}<small>FINAL</small></div><div class="team right"><h2>${G.away}</h2><div class="badge">${teamBadge(G.away)}</div></div></section><div class="tabs">${["Overview","Team Stats","Player Stats","Lineups","Shot Chart","Play-by-Play","Video","AI Insights","Report"].map((x,i)=>`<span class="${i===0?"active":""}">${x}</span>`).join("")}</div><section class="kpis">${G.metrics.map(x=>`<div class="card kpi"><label>${x[0]}</label><b>${x[1]}</b><small>vs ${x[2]}</small></div>`).join("")}</section><section class="card takeaways"><div class="sectionhead"><h3><span>◆</span> KEY TAKEAWAYS</h3><small>${gameWinner(G)}</small></div><div class="findings">${G.findings.map((x,i)=>`<div class="finding"><div class="num">${i+1}</div><b>${x[0]}</b><p>${x[1]}</p><em>→ ${x[2]}</em></div>`).join("")}</div></section><section class="grid"><div class="card box"><h3>Score by Quarter</h3><div class="bars">${G.quarters.map((q,i)=>`<div class="q"><div class="bar" style="height:${Math.min(q[0]*4,140)}px"><i>${q[0]}</i></div><div class="bar away" style="height:${Math.min(q[1]*4,140)}px"><i>${q[1]}</i></div><span class="qname">${quarterLabel(i)}</span></div>`).join("")}</div></div><div class="card box"><h3>Four Factors Analysis</h3><div class="factors">${G.factors.map(x=>`<div class="factor"><label>${x[0]} · ${G.home.split(" ")[0]} ${x[1]}% / ${G.away.split(" ")[0]} ${x[2]}%</label><div class="track"><div class="homefill" style="width:${x[1]}%"></div><div class="awayfill" style="width:${x[2]}%"></div></div></div>`).join("")}</div></div><div class="card box last"><h3>Key Team Stats</h3><table class="stats"><thead><tr><th>Metric</th><th>Home</th><th>Away</th></tr></thead><tbody>${G.stats.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join("")}</tbody></table></div><div class="card box"><h3>Leaders — ${G.home}</h3><table class="stats"><tr><th>Player</th><th>Value</th><th>Metric</th></tr>${G.leaders.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join("")}</table></div><div class="card box"><h3>Leaders — ${G.away}</h3><table class="stats"><tr><th>Player</th><th>Value</th><th>Metric</th></tr>${G.awayLeaders.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join("")}</table></div><div class="card box last"><h3>Next Steps: Video Investigation</h3><div class="videoList">${G.videos.map((x,i)=>`<div class="videoItem"><span>${i+1}</span>${x}</div>`).join("")}</div></div></section>${G.pnr?pnrModule():""}<section class="card ask"><div><h3>Ask CourtIQ</h3><p>Ask a basketball question about Game #${G.id}.</p><div id="answer" class="answer"></div></div><input id="q" placeholder="What decided this game?"><button id="ask">Analyze</button></section><div class="footer">CourtIQ Product V1 · Maccabi Bnot Ashdod Pilot · Game #${G.id}</div></div></main></div>`;
document.querySelector(".v2bar b").textContent="MACCABI BNOT ASHDOD · BUILD 105";
const exportActions=document.createElement("span");
exportActions.className="exportActions";
exportActions.innerHTML='<button id="exportJson" class="importBtn secondaryAction">EXPORT JSON</button><button id="exportCsv" class="importBtn secondaryAction">EXPORT PLAYERS CSV</button>';
document.querySelector(".pills").appendChild(exportActions);
installGameViews(G);\ndocument.querySelector(".tabs").insertAdjacentHTML("beforebegin",intelligenceSuite(G));\ndocument.querySelectorAll("[data-game]").forEach(b=>b.onclick=()=>{active=b.dataset.game;render();window.scrollTo(0,0)});
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
document.querySelector("#exportJson").onclick=()=>exportCurrentGame(G,"json");
document.querySelector("#exportCsv").onclick=()=>exportCurrentGame(G,"csv");
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
  const hp=home.fga+.44*home.fta-home.oreb+home.tov, ap=away.fga+.44*away.fta-away.oreb+away.tov, pace=Math.round(((hp+ap)/2)*10)/10;
  const hf=[pct(home.fgm+.5*home.three,home.fga),pct(home.tov,home.fga+.44*home.fta+home.tov),pct(home.oreb,home.oreb+away.dreb),pct(home.fta,home.fga)];
  const af=[pct(away.fgm+.5*away.three,away.fga),pct(away.tov,away.fga+.44*away.fta+away.tov),pct(away.oreb,away.oreb+home.dreb),pct(away.fta,away.fga)];
  return {id:"PILOT",comp:meta.competition||"Pilot Import",date:meta.date||"Imported game",home:home.team,away:away.team,hs:home.pts,as:away.pts,quarters:[],sourceLabel:"OFFICIAL BOXSCORE IMPORT · DATA CONFIRMED",confidence:"DATA CONFIRMED",
    metrics:[["Pace",pace.toFixed(1),pace.toFixed(1)],["Estimated Possessions",hp.toFixed(1),ap.toFixed(1)],["eFG%",hf[0]+"%",af[0]+"%"],["TOV%",hf[1]+"%",af[1]+"%"],["ORB%",hf[2]+"%",af[2]+"%"],["FTr",hf[3]+"%",af[3]+"%"]],
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
  const h=x.home.raw,a=x.away.raw,hf=x.home.four_factors,af=x.away.four_factors,q=x.game.quarters||{},pace=Math.round(((Number(x.home.possessions_est)||0)+(Number(x.away.possessions_est)||0))/2*10)/10;
  const qh=q.home||[],qa=q.away||[];
  const astH=h.ast,astA=a.ast;
  return {id:x.game.id||"URL",comp:"IBBA Official",date:x.game.date||"Imported from URL",home:h.team||x.game.home_team,away:a.team||x.game.away_team,hs:h.points,as:a.points,
    quarters:qh.map((v,i)=>[v,qa[i]??0]),sourceLabel:"IBBA OFFICIAL URL · DATA CONFIRMED",
    metrics:[["Pace",pace.toFixed(1),pace.toFixed(1)],["Estimated Possessions",x.home.possessions_est,x.away.possessions_est],["eFG%",hf["eFG%"]+"%",af["eFG%"]+"%"],["TOV%",hf["TOV%"]+"%",af["TOV%"]+"%"],["ORB%",hf["ORB%"]+"%",af["ORB%"]+"%"],["FTr",hf.FTr+"%",af.FTr+"%"]],
    findings:[["Official URL Imported","Source parsed and basketball totals validated","DATA CONFIRMED"],["Shooting Efficiency",hf["eFG%"]+"% vs "+af["eFG%"]+"% eFG","Verified from official box score"],["Turnover Control",h.tov+" vs "+a.tov+" turnovers","Review possession protection"],["Offensive Glass",h.oreb+" vs "+a.oreb+" OREB","Review second-chance opportunities"],["Video Next","Box score establishes outcomes, not tactical causation","VIDEO VERIFICATION REQUIRED"]],
    stats:[["Points",h.points,a.points],["FG",h.fgm+"/"+h.fga,a.fgm+"/"+a.fga],["3P",h.three_pm+"/"+h.three_pa,a.three_pm+"/"+a.three_pa],["FT",h.ftm+"/"+h.fta,a.ftm+"/"+a.fta],["Offensive Rebounds",h.oreb,a.oreb],["Defensive Rebounds",h.dreb,a.dreb],["Turnovers",h.tov,a.tov],["Assists",astH??"—",astA??"—"]],
    factors:[["eFG%",hf["eFG%"],af["eFG%"]],["TOV%",hf["TOV%"],af["TOV%"]],["ORB%",hf["ORB%"],af["ORB%"]],["FTr",hf.FTr,af.FTr]],
    leaders:[],awayLeaders:[],videos:["Review turnover types","Review shot quality behind eFG%","Review offensive rebounding chances","Review transition possessions if PBP/video is available","Verify tactical causes on video"],
    ask:"This game was imported from an official IBBA box-score URL. CourtIQ calculations are deterministic; tactical causation requires PBP or video."};
}

function openUrlImport(){
  const modal=document.createElement("div"); modal.className="modal"; const signed=window.CourtIQData?.isSignedIn();
  modal.innerHTML=`<div class="modalCard"><button class="modalX">×</button><small class="eyebrow">COURTIQ · VERIFIED IMPORT</small><h2>Import Official Game</h2><p>Paste an official IBBA, Winner League or FIBA EuroCup Women game URL. CourtIQ detects the source, validates the box score, calculates team and player analytics, saves the game and creates a reusable report.</p><div class="importFields"><input id="boxUrl" placeholder="ibasketball.co.il/match/... · basket.co.il/... · fiba.basketball/.../games/..."></div><div class="schema">${signed?"SECURE CLUB SESSION · Game will be saved to the Ashdod workspace.":"SIGN IN REQUIRED · Database imports are available only inside a club session."}</div><div id="urlStatus" class="impStatus"></div><button id="runUrl" class="runImport" ${signed?"":"disabled"}>IMPORT · VERIFY · SAVE</button></div>`;
  document.body.appendChild(modal); modal.querySelector(".modalX").onclick=()=>modal.remove(); modal.onclick=e=>{if(e.target===modal)modal.remove()};
  const womenReady=document.createElement("button"); womenReady.type="button"; womenReady.className="importBtn secondaryAction tomorrowSource"; womenReady.textContent="23/09 · Maccabi Haifa vs Bnei Yehuda";
  womenReady.onclick=()=>{modal.querySelector("#boxUrl").value="https://ibasketball.co.il/match/x99002-2/";modal.querySelector("#urlStatus").textContent="Official game link selected. Import after the federation publishes the final box score.";};
  modal.querySelector(".schema").insertAdjacentElement("afterend",womenReady);
  const euroCup=document.createElement("button"); euroCup.type="button"; euroCup.className="importBtn secondaryAction tomorrowSource"; euroCup.textContent="EuroCup Women 2026/27 · FIBA";
  euroCup.onclick=()=>{modal.querySelector("#boxUrl").value="https://www.fiba.basketball/en/events/eurocup-women-26-27/games/135266-ASHD-DSK";modal.querySelector("#urlStatus").textContent="EuroCup Women selected. The official FIBA Boxscore can be imported after the game is final.";};
  womenReady.insertAdjacentElement("afterend",euroCup);
  modal.querySelector("#runUrl").onclick=async()=>{const status=modal.querySelector("#urlStatus"),url=modal.querySelector("#boxUrl").value.trim(),btn=modal.querySelector("#runUrl");try{if(!url)throw new Error("Paste an official IBBA, basket.co.il or FIBA game URL.");setBusy(btn,true,"IMPORTING…");status.textContent="Fetching official source → validating totals → calculating → saving…";const body=await window.CourtIQData.importOfficialGame(url);const key="db_"+body.game_id;games[key]={...body.ui,_dbId:body.game_id};active=key;await syncProductData();modal.remove();render();window.scrollTo(0,0);}catch(e){status.textContent=e.message;setBusy(btn,false);}};
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
    <div class="productHero"><div><small class="eyebrow">COURTIQ · CLUB INTELLIGENCE</small><h2>Maccabi Bnot Ashdod</h2><p>2026–27 Pilot Workspace · Israel WBL + FIBA EuroCup Women + EuroLeague</p></div><div class="pilotBadge"><span>● PILOT ACTIVE</span><b>BUILD 105</b></div></div>
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
  const categoryFor=(g)=>{
    const provider=String(g._provider||"").toUpperCase(),comp=String(g.comp||"").toLowerCase();
    if(provider==="EUROBASKET_POLAND"||comp.includes("poland · eurobasket")) return {key:"poland",label:"Poland · Eurobasket"};
    if(provider==="EUROCUP"||(comp.includes("eurocup")&&!comp.includes("women"))) return {key:"eurocupmen",label:"EuroCup · Euroleague Basketball"};
    if(provider==="EUROLEAGUE"||comp.includes("euroleague")) return {key:"euroleague",label:"EuroLeague · Euroleague Basketball"};
    if(provider==="FIBA"||comp.includes("eurocup women")) return {key:"eurocup",label:"EuroCup Women · FIBA"};
    if(provider==="IBBA"||comp.includes("athena")||comp.includes("women")) return {key:"women",label:"Israel Women · IBBA"};
    if(provider==="WINNER_LEAGUE"||comp.includes("winner")) return {key:"men",label:"Men's Competitions"};
    return {key:"other",label:"Other Games"};
  };
  const privilegedEmail="ofirdad12345@gmail.com";
  const privilegedUserId="10fa3b29-4acd-4fcf-9784-1117b510332c";
  const currentEmail=String(window.CourtIQData?.user()?.email||window.CourtIQData?.user()?.user_metadata?.email||"").trim().toLowerCase();
  const currentUserId=String(window.CourtIQData?.user()?.id||"");
  const ownerAccess=window.CourtIQData?.isSignedIn() && (currentUserId===privilegedUserId || currentEmail===privilegedEmail);
  const grouped=new Map([
    ["women",{label:"Israel Women · IBBA",items:[]}],
    ["eurocup",{label:"EuroCup Women · FIBA",items:[]}],
    ...(ownerAccess?[["euroleague",{label:"EuroLeague · Euroleague Basketball",items:[]}],["eurocupmen",{label:"EuroCup · Euroleague Basketball",items:[]}],["poland",{label:"Poland · Eurobasket",items:[]}],["men",{label:"Winner Cup · Men's Competitions",items:[]}]]:[]),
    ["other",{label:"Other Games",items:[]}]
  ]);
  for(const entry of items){
    const cat=categoryFor(entry[1]);
    if((cat.key==="euroleague"||cat.key==="eurocupmen"||cat.key==="poland"||cat.key==="men")&&!ownerAccess) continue;
    grouped.get(cat.key)?.items.push(entry);
  }
  const card=([key,g])=>`<button class="gameLibraryCard" data-library-game="${key}">
    <div><span class="libraryStatus">${g.sourceLabel?.includes("CONFIRMED")?"● DATA CONFIRMED":"● COURTIQ DATA"}</span><small>${htmlEsc(g.comp||"Competition")} · ${htmlEsc(g.date||"")}</small></div>
    <h3>${htmlEsc(g.home)} <b>${htmlEsc(g.hs)}–${htmlEsc(g.as)}</b> ${htmlEsc(g.away)}</h3>
    <footer><span>OPEN ANALYSIS</span><b>→</b></footer>
  </button>`;
  const sections=[...grouped.values()].map(group=>`<section class="gameLibraryTopic"><h3 class="productSectionTitle">${htmlEsc(group.label)} <small>· ${group.items.length} games</small></h3>${group.items.length?`<div class="gameLibraryGrid">${group.items.map(card).join("")}</div>`:`<div class="productEmpty"><b>NO SAVED GAMES YET</b><span>Imported games for this competition will appear here automatically.</span></div>`}</section>`).join("");
  modal.innerHTML=`<div class="modalCard compareModal gameLibrary"><button class="modalX">×</button>
    <small class="eyebrow">MACCABI BNOT ASHDOD · PILOT</small><h2>Games</h2>
    <p>Saved games are restored from the club database and organized automatically by competition/source.</p>
    <div class="libraryTop"><div><small>GAMES AVAILABLE</small><b>${items.length}</b></div><div><small>WORKFLOW</small><b>Import → Verify → Save → Analyze</b></div><button id="libraryImport" class="runImport">IMPORT GAME</button></div>
    ${sections}
    ${syncError?`<div class="insight warning">DATABASE · ${htmlEsc(syncError)}</div>`:""}<div class="insight">PILOT RULE · Tactical conclusions remain separate from verified box-score findings until video evidence is available.</div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".modalX").onclick=()=>modal.remove();
  modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.querySelector("#libraryImport").onclick=()=>{modal.remove();openAutoImport();};
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
function teamSnapshot(g,team){
  const side=g.home===team?"home":g.away===team?"away":null;if(!side)return null;
  const opp=side==="home"?"away":"home",calc=g.calculated?.[side]||{};
  return {date:g.date||"—",game:g,team,opponent:g[opp],pf:Number(side==="home"?g.hs:g.as),pa:Number(side==="home"?g.as:g.hs),efg:Number(calc.efg),tov:Number(calc.tov),orb:Number(calc.orb),ftr:Number(calc.ftr),ortg:Number(calc.ortg),drtg:Number(calc.drtg),net:Number(calc.net_rating),pace:Number(calc.pace)};
}
function avgFinite(rows,key){const v=rows.map(x=>Number(x[key])).filter(Number.isFinite);return v.length?oneDecimal(v.reduce((a,b)=>a+b,0)/v.length):null;}
function seasonTrendPanel(G){
  const team=G.home,rows=localTeamGames(team).map(g=>teamSnapshot(g,team)).filter(Boolean),recent=rows.slice(-5),prev=rows.slice(-10,-5);
  const metric=(key,label,suffix="")=>{const now=avgFinite(recent,key),before=avgFinite(prev,key),delta=now!=null&&before!=null?oneDecimal(now-before):null;return `<div class="card kpi"><label>${label} · LAST ${recent.length}</label><b>${now??"—"}${now!=null?suffix:""}</b><small>${delta==null?"Need 6+ stored games":(delta>0?"+":"")+delta+" vs previous sample"}</small></div>`;};
  return `<section class="card takeaways seasonIntel"><div class="sectionhead"><h3><span>↗</span> SEASON TRENDS · ${htmlEsc(team)}</h3><small>${rows.length} OFFICIAL STORED GAME${rows.length===1?"":"S"}</small></div><div class="kpis">${metric("pf","Points","")}${metric("efg","eFG%","%")}${metric("tov","TOV%","%")}${metric("net","Net Rating","")}${metric("pace","Pace","")}</div><div class="metricNote">Trend calculations use only official games already stored in CourtIQ. Small samples are labeled; no missing games are estimated.</div></section>`;
}
function liveDataPanel(G){
  const events=Array.isArray(G.playByPlay)?G.playByPlay:[],isFinal=String(G.status||"").toLowerCase()==="final"||!events.length;
  return `<section class="card takeaways liveIntel"><div class="sectionhead"><h3><span>●</span> LIVE / OFFICIAL DATA</h3><small>${events.length?"OFFICIAL EVENT FEED":"SOURCE-AWARE"}</small></div><div class="insight ${events.length?"":"warning"}"><b>${events.length?"LIVE-CAPABLE FEED AVAILABLE":"NO LIVE FEED IN CURRENT SOURCE"}</b> · ${events.length?`CourtIQ has ${events.length} official play-by-play events for this game and can refresh the analysis when the source is re-imported.`:"CourtIQ will never label a final box score as real-time. Live analytics require an official live/play-by-play feed from the provider."}</div></section>`;
}
function aiScoutingPanel(G){
  const opponent=G.away,sample=localTeamGames(opponent).map(g=>teamSnapshot(g,opponent)).filter(Boolean),recent=sample.slice(-5);
  const facts=[["Sample",recent.length+" game"+(recent.length===1?"":"s")],["Points",avgFinite(recent,"pf")??"—"],["eFG%",(avgFinite(recent,"efg")??"—")+(avgFinite(recent,"efg")!=null?"%":"")],["TOV%",(avgFinite(recent,"tov")??"—")+(avgFinite(recent,"tov")!=null?"%":"")],["ORB%",(avgFinite(recent,"orb")??"—")+(avgFinite(recent,"orb")!=null?"%":"")],["Net Rating",avgFinite(recent,"net")??"—"]];
  return `<section class="card takeaways aiScoutIntel"><div class="sectionhead"><h3><span>◆</span> AI SCOUTING · ${htmlEsc(opponent)}</h3><small>OFFICIAL DATA → COACHING QUESTIONS</small></div><div class="reportKpis">${facts.map(x=>`<div><small>${x[0]}</small><b>${x[1]}</b></div>`).join("")}</div><div class="findings"><div class="finding"><div class="num">1</div><b>Possession pressure</b><p>Opponent TOV% sample: ${avgFinite(recent,"tov")??"—"}%</p><em>→ Verify which defensive actions create turnovers on video.</em></div><div class="finding"><div class="num">2</div><b>Shot efficiency</b><p>Opponent eFG% sample: ${avgFinite(recent,"efg")??"—"}%</p><em>→ Review shot locations and creators before choosing coverage.</em></div><div class="finding"><div class="num">3</div><b>Second possessions</b><p>Opponent ORB% sample: ${avgFinite(recent,"orb")??"—"}%</p><em>→ Audit box-outs and crash personnel on film.</em></div></div><div class="metricNote">AI Scouting is evidence-first: it turns verified statistics into scouting priorities. It does not invent tactical causes that are absent from box-score/play-by-play data.</div></section>`;
}
function intelligenceSuite(G){return `<div class="intelligenceSuite">${seasonTrendPanel(G)}${liveDataPanel(G)}${aiScoutingPanel(G)}</div>`;}
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
