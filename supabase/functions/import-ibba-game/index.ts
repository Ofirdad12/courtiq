import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";

const cors = {
  "Access-Control-Allow-Origin": "https://ofirdad12.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const allowed = new Set(["ibasketball.co.il","www.ibasketball.co.il","basket.co.il","www.basket.co.il"]);
const j = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:cors});
const clean=(s:string)=>s.replace(/\s+/g," ").trim();
const num=(s:string)=>{const m=clean(s).replaceAll(",","").match(/-?\d+/); if(!m) throw new Error("Expected numeric value: "+s); return Number(m[0]);};
const ma=(s:string)=>{const m=clean(s).match(/(\d+)\s*[-/\u2013\u2014]\s*(\d+)/); if(!m) throw new Error("Expected made-attempted value: "+s); return [Number(m[1]),Number(m[2])];};
const pct=(a:number,b:number)=>b?Math.round(a/b*1000)/10:0;
const r1=(n:number)=>Math.round(n*10)/10;
const r2=(n:number)=>Math.round(n*100)/100;
const formulaCatalog={
  version:"courtiq-formulas-v2",
  box_score:{
    fg_pct:"FGM / FGA × 100",two_pct:"2PM / 2PA × 100",three_pct:"3PM / 3PA × 100",ft_pct:"FTM / FTA × 100",
    efg_pct:"(FGM + 0.5 × 3PM) / FGA × 100",ts_pct:"PTS / [2 × (FGA + 0.44 × FTA)] × 100",
    pps:"PTS / FGA",three_pa_rate:"3PA / FGA × 100",possessions:"FGA + 0.44 × FTA - ORB + TOV",
    ortg:"PTS / Poss × 100",drtg:"Opponent PTS / Opponent Poss × 100",net_rating:"ORtg - DRtg",
    tov_pct:"TOV / (FGA + 0.44 × FTA + TOV) × 100",orb_pct:"ORB / (ORB + Opp DRB) × 100",
    drb_pct:"DRB / (DRB + Opp ORB) × 100",trb_pct:"TRB / (TRB + Opp TRB) × 100",
    ast_to:"AST / TOV",assisted_fg_pct:"AST / FGM × 100",ftr:"FTA / FGA × 100",
    pace:"Poss / Game Minutes × 40",bench_share:"Bench PTS / Team PTS × 100",margin:"Points For - Points Against"
  },
  tagged_possessions_required:["Play-Type PPP","Play-Type Frequency","Transition PPP","Second-Chance PPP","Points-off-Turnover PPP","Success%"]
};

function validateUrl(raw:string){
  const u=new URL(raw);
  if(u.protocol!=="https:" || !allowed.has(u.hostname)) throw new Error("Use an official ibasketball.co.il or basket.co.il game URL.");
  const isIbba=/^(www\.)?ibasketball\.co\.il$/.test(u.hostname);
  const isBasket=/^(www\.)?basket\.co\.il$/.test(u.hostname);
  if(isIbba && !/^\/match\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/i.test(u.pathname)) throw new Error("Unsupported IBBA URL. Use an official /match/... page.");
  if(isBasket && !(u.pathname.toLowerCase().endsWith("/game-zone.asp") || u.pathname.toLowerCase()==="/game-zone.asp") || !u.searchParams.get("GameId")) throw new Error("Unsupported Winner League URL. Use basket.co.il/game-zone.asp?GameId=...");
  return {u, provider:isBasket?"WINNER_LEAGUE":"IBBA"};
}
function tableRows($:cheerio.CheerioAPI, table:any){
  // Cheerio's map() flattens arrays returned by the callback. Use a native
  // array map so every table row remains a distinct string array.
  return $(table).find("tr").toArray().map((tr:any)=>
    $(tr).find("th,td").toArray().map((c:any)=>clean($(c).text()))
  );
}
function idx(headers:string[], needles:string[]){
  const i=headers.findIndex(h=>needles.some(n=>h.includes(n)));
  if(i<0) throw new Error("Missing expected IBBA column: "+needles.join("/"));
  return i;
}
function teamTotal($:cheerio.CheerioAPI, table:any){
  const rows=tableRows($,table), headers=rows[0]||[];
  const total=rows.find((r:string[])=>r.some(c=>c.includes("סך הכל")));
  if(!total) throw new Error("IBBA player table has no total row.");
  const [two_pm,two_pa]=ma(total[idx(headers,["2 נק"])]);
  const [three_pm,three_pa]=ma(total[idx(headers,["3 נק"])]);
  const [ftm,fta]=ma(total[idx(headers,["מהקו"])]);
  return {
    points:num(total[idx(headers,["נק'","נק׳"])]),
    two_pm,two_pa,three_pm,three_pa,ftm,fta,
    oreb:num(total[idx(headers,["ריב׳ הת׳","ריב' הת'","ריב הת"])]),
    dreb:num(total[idx(headers,["ריב׳ הג׳","ריב' הג'","ריב הג"])]),
    tov:num(total[idx(headers,["איב'","איב׳","איב"])]),
    ast:num(total[idx(headers,["אס'","אס׳","אס"])])
  };
}

function minutesValue(value:string){
  const s=clean(value||"");
  const clock=s.match(/^(\d+):(\d{2})$/);
  if(clock) return r1(Number(clock[1])+Number(clock[2])/60);
  const n=Number(s);
  return Number.isFinite(n)?r1(n):0;
}
function advancedPlayer(player:any,team:any,opp:any){
  const fgm=player.two_pm+player.three_pm, fga=player.two_pa+player.three_pa;
  const missed=fga-fgm+player.fta-player.ftm;
  const playEnds=fga+.44*player.fta+player.tov;
  const teamPoss=(team.two_pa+team.three_pa)+.44*team.fta-team.oreb+team.tov;
  const per40=(value:number)=>player.minutes?r1(value*40/player.minutes):0;
  const teamMinutes=200;
  return {...player,fgm,fga,rebounds:player.oreb+player.dreb,
    fg_pct:pct(fgm,fga),two_pct:pct(player.two_pm,player.two_pa),three_pct:pct(player.three_pm,player.three_pa),ft_pct:pct(player.ftm,player.fta),
    efg:pct(fgm+.5*player.three_pm,fga),ts:pct(player.points,2*(fga+.44*player.fta)),pps:fga?r2(player.points/fga):0,three_pa_rate:pct(player.three_pa,fga),
    ast_to:player.tov?Math.round(player.ast/player.tov*100)/100:(player.ast?"∞":0),
    points_per_40:per40(player.points),rebounds_per_40:per40(player.oreb+player.dreb),assists_per_40:per40(player.ast),
    play_end_share:pct(playEnds,teamPoss),
    oreb_pct:player.minutes?pct(player.oreb*teamMinutes/5,player.minutes*(team.oreb+opp.dreb)):0,
    dreb_pct:player.minutes?pct(player.dreb*teamMinutes/5,player.minutes*(team.dreb+opp.oreb)):0,
    box_impact_per_40:per40(player.points+player.oreb+player.dreb+player.ast+player.steals+player.blocks-missed-player.tov)};
}
function playerLeaders(players:any[]){
  const played=players.filter(p=>p.minutes>0);
  const top=(key:string)=>played.slice().sort((a:any,b:any)=>Number(b[key])-Number(a[key])||b.points-a.points)[0];
  if(!played.length) return [];
  const scorer=top("points"), rebounder=top("rebounds"), passer=top("ast");
  return [[scorer.name,scorer.points,"PTS"],[rebounder.name,rebounder.rebounds,"REB"],[passer.name,passer.ast,"AST"]];
}
function aggregatePlayers(players:any[]){
  const keys=["minutes","points","two_pm","two_pa","three_pm","three_pa","ftm","fta","oreb","dreb","tov","ast","steals","blocks"];
  const out:any={}; for(const k of keys) out[k]=r1(players.reduce((sum,p)=>sum+Number(p[k]||0),0));
  const fga=out.two_pa+out.three_pa, fgm=out.two_pm+out.three_pm;
  return {...out,efg:pct(fgm+.5*out.three_pm,fga),ts:pct(out.points,2*(fga+.44*out.fta)),ast_to:out.tov?Math.round(out.ast/out.tov*100)/100:(out.ast?"∞":0)};
}
function ibbaPlayerData($:cheerio.CheerioAPI, table:any){
  const players=$(table).find("tbody tr, tr").toArray().filter((tr:any)=>$(tr).find("td[data-key]").length).map((tr:any)=>{
    const value=(key:string)=>clean($(tr).find(`[data-key="${key}"]`).text());
    const [two_pm,two_pa]=ma(value("fgs")), [three_pm,three_pa]=ma(value("threeps")), [ftm,fta]=ma(value("fts"));
    return {id:String($(tr).attr("data-player-id")||""),number:num($(tr).find(".data-number").text()),name:clean($(tr).find(".data-name").text()),
      starter:$(tr).hasClass("lineup"),minutes:minutesValue(value("min")),points:num(value("pts")),two_pm,two_pa,three_pm,three_pa,ftm,fta,
      dreb:num(value("def")),oreb:num(value("off")),steals:num(value("stl")),tov:num(value("to")),ast:num(value("ast")),blocks:num(value("blk")),
      value:num(value("rate")),plus_minus:num(value("pm"))};
  });
  if(!players.length) throw new Error("IBBA player rows were not found.");
  return {total:teamTotal($,table),players};
}
function ibbaPlayByPlay($:cheerio.CheerioAPI,homeName:string,awayName:string){
  const seen=new Set<string>();
  const events:any[]=[];
  $("[data-event-timeline] .sp-vertical-timeline-minute").each((sourceOrder:number,el:any)=>{
    const node=$(el), className=String(node.attr("class")||"");
    const side=className.includes("timeline-minute-home")?"home":className.includes("timeline-minute-away")?"away":"";
    const periodFromClass=className.match(/(?:^|\s)quarter-(\d+)(?:\s|$)/)?.[1];
    const periodLabel=clean(node.find(".minute .quarter").first().text());
    const period=Number(periodFromClass||periodLabel.match(/(\d+)/)?.[1]||0);
    const clock=clean(node.find(".minute .time").first().text());
    const score=clean(node.find(".minute .score").first().text());
    const actionNode=node.find(".action").first();
    const player=clean(actionNode.find("a").first().text());
    const description=clean(actionNode.find(".description").first().text())||clean(actionNode.text());
    const type=className.match(/(?:^|\s)key-([^\s]+)/)?.[1]||"event";
    if(!period&&!clock&&!description)return;
    const event={period,period_label:periodLabel||("Q"+period),clock,score,side,
      team:side==="home"?homeName:side==="away"?awayName:"",player,description,type,_sourceOrder:sourceOrder};
    const key=[period,clock,score,side,player,description,type].join("|");
    if(seen.has(key))return;
    seen.add(key); events.push(event);
  });
  const seconds=(clock:string)=>{const m=clock.match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0;};
  events.sort((a,b)=>a.period-b.period||seconds(b.clock)-seconds(a.clock)||b._sourceOrder-a._sourceOrder);
  return events.map(({_sourceOrder,...event})=>event);
}

function idxAny(headers:string[], needles:string[]){
  const norm=(s:string)=>clean(s).toLowerCase();
  const i=headers.findIndex(h=>needles.some(n=>norm(h)===norm(n)||norm(h).includes(norm(n))));
  if(i<0) throw new Error("Missing expected box-score column: "+needles.join("/"));
  return i;
}
function basketTeamTotal($:cheerio.CheerioAPI, table:any){
  const rows=tableRows($,table).filter((r:string[])=>r.length);
  const header=rows.find((r:string[])=>r.some(c=>/^(player name|שם שחקן)$/i.test(clean(c))));
  if(!header) throw new Error("Winner League player table header was not found.");
  const playerCol=header.findIndex(c=>/^(player name|שם שחקן)$/i.test(clean(c)));
  const total=rows.find((r:string[])=>/^(total|totals|סה.?כ|סך הכל)$/i.test(clean(r[playerCol]||"")));
  if(!total) throw new Error("Winner League box score has no readable team total row.");
  const offset=playerCol-1;
  const [two_pm,two_pa]=ma(total[offset+5]);
  const [three_pm,three_pa]=ma(total[offset+7]);
  const [ftm,fta]=ma(total[offset+9]);
  return {points:num(total[offset+4]),two_pm,two_pa,three_pm,three_pa,ftm,fta,
    dreb:num(total[offset+11]),oreb:num(total[offset+12]),tov:num(total[offset+17]),ast:num(total[offset+18])};
}
function basketPlayerData($:cheerio.CheerioAPI, table:any){
  const rows=tableRows($,table).filter((r:string[])=>r.length);
  const header=rows.find((r:string[])=>r.some(c=>/^(player name|שם שחקן)$/i.test(clean(c))));
  if(!header) throw new Error("Winner League player table header was not found.");
  const playerCol=header.findIndex(c=>/^(player name|שם שחקן)$/i.test(clean(c)));
  const offset=playerCol-1;
  const players=rows.filter((r:string[])=>/^\d+$/.test(clean(r[offset]||""))&&clean(r[playerCol]||"")).map((r:string[])=>{
    const [two_pm,two_pa]=ma(r[offset+5]), [three_pm,three_pa]=ma(r[offset+7]), [ftm,fta]=ma(r[offset+9]);
    return {number:num(r[offset]),name:clean(r[playerCol]),starter:clean(r[offset+2])==="*",minutes:minutesValue(r[offset+3]),points:num(r[offset+4]),
      two_pm,two_pa,three_pm,three_pa,ftm,fta,dreb:num(r[offset+11]),oreb:num(r[offset+12]),steals:num(r[offset+16]),tov:num(r[offset+17]),ast:num(r[offset+18]),blocks:num(r[offset+19]||"0"),value:num(r[offset+21])};
  });
  if(!players.length) throw new Error("Winner League player rows were not found.");
  return {total:basketTeamTotal($,table),players};
}
function basketQuarters($:cheerio.CheerioAPI){
  let result:any[]=[];
  $("table").each((_:number,t:any)=>{
    if(result.length)return;
    const rows=tableRows($,t).filter((r:string[])=>r.length);
    if(!rows[0]?.some(c=>/^(תוצאת רבע|by quarter)$/i.test(clean(c)))) return;
    if(rows.length<3) return;
    const count=Math.min(rows[0].length-1,rows[1].length-1,rows[2].length-1);
    result=Array.from({length:count},(_,i)=>[num(rows[1][i+1]),num(rows[2][i+1])]);
  });
  return result;
}
function basketTableName($:cheerio.CheerioAPI, table:any){
  const first=tableRows($,table)[0]?.[0]||"";
  return clean(first.replace(/\s*\((?:coach|מאמן)[:：].*$/i,""));
}
function basketSplit($:cheerio.CheerioAPI, table:any){
  const rows=tableRows($,table).filter((r:string[])=>r.length);
  const parse=(r:string[])=>{
    if(r.length<17) throw new Error("Winner League starter/bench row is incomplete.");
    const [two_pm,two_pa]=ma(r[3]), [three_pm,three_pa]=ma(r[5]), [ftm,fta]=ma(r[7]);
    return {minutes:num(r[1]),points:num(r[2]),two_pm,two_pa,three_pm,three_pa,ftm,fta,dreb:num(r[9]),oreb:num(r[10]),tov:num(r[15]),ast:num(r[16])};
  };
  const starterRow=rows.find((r:string[])=>/^(חמישייה|starters?)$/i.test(clean(r[0]||"")));
  const benchRow=rows.find((r:string[])=>/^(ספסל|bench)$/i.test(clean(r[0]||"")));
  if(!starterRow||!benchRow) throw new Error("Winner League starter/bench split rows were not found.");
  const starters=parse(starterRow), bench=parse(benchRow);
  const total:any={};
  for(const k of ["points","two_pm","two_pa","three_pm","three_pa","ftm","fta","dreb","oreb","tov","ast"]) total[k]=starters[k]+bench[k];
  const splitMetrics=(x:any)=>{
    const fga=x.two_pa+x.three_pa;
    return {...x,ts:pct(x.points,2*(fga+.44*x.fta)),efg:pct(x.two_pm+x.three_pm+.5*x.three_pm,fga),ast_to:x.tov?Math.round(x.ast/x.tov*100)/100:null};
  };
  return {total,starters:splitMetrics(starters),bench:splitMetrics(bench)};
}
function basketExtra($:cheerio.CheerioAPI){
  let out:any=null;
  $("table").each((_:number,t:any)=>{
    if(out)return; const rows=tableRows($,t).filter((r:string[])=>r.length);
    const text=rows.slice(0,2).flat().join(" | ");
    if(!/(נקודות מאיבודים|points off)/i.test(text)||!/(נקודות בצבע|paint)/i.test(text)) return;
    const data=rows.slice(1).filter((r:string[])=>r.length>=4&&/\d/.test(r.join("")));
    if(data.length>=2) out=data.slice(0,2).map((r:string[])=>({team:r[0],points_off_turnovers:num(r[1]),paint_points:num(r[2]),second_chance_points:num(r[3]),lead_time:r[4]||null}));
  });
  return out;
}
function basketNames($:cheerio.CheerioAPI){
  const title=clean($("title").text());
  const m=title.match(/:\s*([^:]+?)\s+(?:Vs\.?|vs\.?|נגד)\s+([^|]+)/i);
  if(m) return [clean(m[1]),clean(m[2])];
  const h=$("h1,h2,h3,h4,h5,h6").map((_:number,e:any)=>clean($(e).text())).get().filter(Boolean);
  return [h.find((x:string)=>!/cup|league|מנהלת|ליגת/i.test(x))||"Home", h.slice().reverse().find((x:string)=>!/cup|league|מנהלת|ליגת/i.test(x))||"Away"];
}
function calc(t:any, opp:any, gameMinutes=40){
  const fgm=t.two_pm+t.three_pm, fga=t.two_pa+t.three_pa;
  const poss=fga+.44*t.fta-t.oreb+t.tov;
  const oppFga=opp.two_pa+opp.three_pa;
  const oppPoss=oppFga+.44*opp.fta-opp.oreb+opp.tov;
  const ortg=r1(t.points/Math.max(poss,1)*100), drtg=r1(opp.points/Math.max(oppPoss,1)*100);
  const trb=t.oreb+t.dreb, oppTrb=opp.oreb+opp.dreb;
  return {
    possessions:r1(poss),pace:r1(poss/Math.max(gameMinutes,1)*40),ortg,drtg,net_rating:r1(ortg-drtg),
    fg_pct:pct(fgm,fga),two_pct:pct(t.two_pm,t.two_pa),three_pct:pct(t.three_pm,t.three_pa),ft_pct:pct(t.ftm,t.fta),
    efg:pct(fgm+.5*t.three_pm,fga), ts:pct(t.points,2*(fga+.44*t.fta)),
    pps:fga?r2(t.points/fga):0,three_pa_rate:pct(t.three_pa,fga),
    tov:pct(t.tov,fga+.44*t.fta+t.tov),orb:pct(t.oreb,t.oreb+opp.dreb),drb:pct(t.dreb,t.dreb+opp.oreb),trb:pct(trb,trb+oppTrb),
    ftr:pct(t.fta,fga),ast_to:t.tov?Math.round(t.ast/t.tov*100)/100:(t.ast?"∞":0),assisted_fg_pct:pct(t.ast,fgm),margin:t.points-opp.points
  };
}
function validateTeam(t:any,label:string){
  const numeric=["points","two_pm","two_pa","three_pm","three_pa","ftm","fta","oreb","dreb","tov","ast"];
  for(const key of numeric){
    if(!Number.isFinite(t[key])||t[key]<0) throw new Error(label+" has invalid "+key+".");
  }
  if(t.two_pm>t.two_pa||t.three_pm>t.three_pa||t.ftm>t.fta) throw new Error(label+" has makes greater than attempts.");
  const expectedPoints=2*t.two_pm+3*t.three_pm+t.ftm;
  if(expectedPoints!==t.points) throw new Error(label+" scoring totals do not reconcile: box score "+t.points+", shots "+expectedPoints+".");
  const fga=t.two_pa+t.three_pa;
  if(fga===0) throw new Error(label+" has zero field-goal attempts.");
  return {status:"passed",expected_points:expectedPoints,box_score_points:t.points,fga,checks:["non_negative","makes_lte_attempts","points_reconcile","fga_positive"]};
}
function uiGame(meta:any,home:any,away:any,quarters:any[]){
  const gameMinutes=40+Math.max(0,quarters.length-4)*5;
  const hm=calc(home,away,gameMinutes), am=calc(away,home,gameMinutes);
  const metrics=[["Offensive Rating",hm.ortg.toFixed(1),am.ortg.toFixed(1)],["Defensive Rating",hm.drtg.toFixed(1),am.drtg.toFixed(1)],["Net Rating",hm.net_rating.toFixed(1),am.net_rating.toFixed(1)],["eFG%",hm.efg+"%",am.efg+"%"],["Pace",hm.pace.toFixed(1),am.pace.toFixed(1)]];
  const factors=[["eFG%",hm.efg,am.efg],["TOV%",hm.tov,am.tov],["ORB%",hm.orb,am.orb],["FTr",hm.ftr,am.ftr]];
  const stats=[["Points",home.points,away.points],["Point Margin",hm.margin,am.margin],["Possessions",hm.possessions,am.possessions],["Pace",hm.pace,am.pace],["ORtg",hm.ortg,am.ortg],["DRtg",hm.drtg,am.drtg],["Net Rating",hm.net_rating,am.net_rating],
    ["FG",(home.two_pm+home.three_pm)+"/"+(home.two_pa+home.three_pa),(away.two_pm+away.three_pm)+"/"+(away.two_pa+away.three_pa)],["FG%",hm.fg_pct+"%",am.fg_pct+"%"],["2P",home.two_pm+"/"+home.two_pa,away.two_pm+"/"+away.two_pa],["2P%",hm.two_pct+"%",am.two_pct+"%"],["3P",home.three_pm+"/"+home.three_pa,away.three_pm+"/"+away.three_pa],["3P%",hm.three_pct+"%",am.three_pct+"%"],["FT",home.ftm+"/"+home.fta,away.ftm+"/"+away.fta],["FT%",hm.ft_pct+"%",am.ft_pct+"%"],
    ["eFG%",hm.efg+"%",am.efg+"%"],["TS%",hm.ts+"%",am.ts+"%"],["PPS",hm.pps,am.pps],["3PA Rate",hm.three_pa_rate+"%",am.three_pa_rate+"%"],["TOV%",hm.tov+"%",am.tov+"%"],["FTr",hm.ftr+"%",am.ftr+"%"],
    ["Assists",home.ast,away.ast],["AST/TO",hm.ast_to,am.ast_to],["Assisted FG%",hm.assisted_fg_pct+"%",am.assisted_fg_pct+"%"],["Turnovers",home.tov,away.tov],["Offensive Rebounds",home.oreb,away.oreb],["Defensive Rebounds",home.dreb,away.dreb],["ORB%",hm.orb+"%",am.orb+"%"],["DRB%",hm.drb+"%",am.drb+"%"],["TRB%",hm.trb+"%",am.trb+"%"]];
  const findings=[
    ["Possession Efficiency",hm.ortg+" ORtg vs "+am.ortg+" ORtg","Descriptive efficiency gap from verified totals"],
    ["Shooting Efficiency",hm.efg+"% eFG vs "+am.efg+"%","Shot-value conversion; shot context requires video"],
    ["Ball Security",home.tov+" turnovers vs "+away.tov,hm.tov+"% vs "+am.tov+"% TOV rate"],
    ["Offensive Rebounding",hm.orb+"% ORB vs "+am.orb+"%","Second-possession signal from box-score totals"]
  ];
  const videos=[
    "Classify turnovers by pressure, passing read, handle and offensive foul.",
    "Review shot quality behind the eFG% difference: rim, catch-and-shoot, pull-up and late-clock attempts.",
    "Audit offensive rebounds: box-out failures, long rebounds, crash assignments and put-backs.",
    "Identify which actions created free-throw attempts rather than inferring rim pressure from FTr alone.",
    "Review the possessions that produced the largest efficiency gap before assigning tactical causation."
  ];
  return {id:meta.id,comp:meta.competition,date:meta.date_display,home:meta.home,away:meta.away,hs:home.points,as:away.points,quarters,metrics,factors,stats,findings,videos,
    leaders:[],awayLeaders:[],sourceLabel:(meta.provider==="WINNER_LEAGUE"?"WINNER LEAGUE OFFICIAL BOX SCORE":"IBBA OFFICIAL BOX SCORE")+" · DATA CONFIRMED",confidence:"DATA CONFIRMED",
    ask:meta.home+" and "+meta.away+" are compared here using verified box-score totals. Tactical causation requires video verification.",
    raw:{home,away},calculated:{home:hm,away:am},formulaCatalog};
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  if(req.method!=="POST") return j({error:"Method not allowed"},405);

  let auditClubId:number|null=null;
  let auditUrl="";
  let auditExternalId:string|null=null;

  try{
    const auth=req.headers.get("Authorization");
    if(!auth) return j({error:"Sign in is required."},401);

    const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
    const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userDb=createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}}});
    const {data:clubs,error:clubErr}=await userDb.from("clubs").select("id,name,season").eq("slug","maccabi-bnot-ashdod").limit(1);
    if(clubErr) throw clubErr;
    if(!clubs?.length) return j({error:"This account does not have access to the Ashdod pilot."},403);

    const club=clubs[0];
    auditClubId=club.id;
    const body=await req.json();
    const parsed=validateUrl(String(body.url||""));
    const u=parsed.u, provider=parsed.provider;
    auditUrl=u.toString();
    const fetchUrl=new URL(u.toString());

    const res=await fetch(fetchUrl.toString(),{headers:{"User-Agent":"CourtIQ/1.0 basketball analytics pilot"}});
    if(!res.ok) throw new Error("Official source returned HTTP "+res.status);
    const html=await res.text();
    const $=cheerio.load(html);

    let homeName="",awayName="",quarters:any[]=[], splitData:any=null, extraData:any=null, parsedPlayers:any=null, playByPlay:any[]=[];
    const playerTables:any[]=[];
    if(provider==="IBBA"){
      let quarter:any=null;
      $("table").each((_:number,t:any)=>{ if(quarter)return; const h=tableRows($,t)[0]?.join(" | ")||""; if(h.includes("רבע 1")&&h.includes("רבע 4")) quarter=t; });
      if(!quarter) throw new Error("Could not locate the IBBA quarter table.");
      const qrows=tableRows($,quarter).slice(1).filter((r:string[])=>r.length>=6&&r[0]);
      if(qrows.length<2) throw new Error("Could not read both teams.");
      homeName=qrows[0][0]; awayName=qrows[1][0];
      const quarterCount=Math.max(4,Math.min(qrows[0].length-2,qrows[1].length-2));
      quarters=Array.from({length:quarterCount},(_,i)=>[num(qrows[0][i+1]),num(qrows[1][i+1])]);
      $("table").each((_:number,t:any)=>{const h=(tableRows($,t)[0]||[]).join(" | ");if(h.includes("2 נק")&&h.includes("3 נק")&&h.includes("איב")&&h.includes("אס"))playerTables.push(t);});
    }else{
      const splitTables:any[]=[];
      $("table.stats_tbl").each((_:number,t:any)=>{
        const rows=tableRows($,t);
        if(rows.some((r:string[])=>r.some(c=>/^(player name|שם שחקן)$/i.test(clean(c))))&&rows.some((r:string[])=>r.some(c=>/2pt|2 נק/i.test(c))&&r.some(c=>/3pt|3 נק/i.test(c)))) playerTables.push(t);
        const h=tableRows($,t).slice(0,6).flat().join(" | ");
        if(/(חמישייה-ספסל|starters?.*bench)/i.test(h)&&/(2 נק|2PT|2P)/i.test(h)&&/(3 נק|3PT|3P)/i.test(h)) splitTables.push(t);
      });
      if(playerTables.length<2) throw new Error("Could not locate both Winner League player tables.");
      if(splitTables.length<2) throw new Error("Could not locate both Winner League starter/bench tables.");
      const fallbackNames=basketNames($);
      homeName=basketTableName($,playerTables[0])||fallbackNames[0];
      awayName=basketTableName($,playerTables[1])||fallbackNames[1];
      quarters=basketQuarters($);
      if(!quarters.length) throw new Error("Could not locate Winner League quarter scores.");
      parsedPlayers=[basketPlayerData($,playerTables[0]),basketPlayerData($,playerTables[1])];
      splitData=[basketSplit($,splitTables[0]),basketSplit($,splitTables[1])];
      extraData=basketExtra($);
    }
    if(!homeName||!awayName||homeName===awayName) throw new Error("Could not validate both team names.");
    if(provider==="IBBA"&&playerTables.length<2) throw new Error("Could not locate both IBBA box-score tables.");
    if(provider==="IBBA") parsedPlayers=[ibbaPlayerData($,playerTables[0]),ibbaPlayerData($,playerTables[1])];
    if(provider==="IBBA") playByPlay=ibbaPlayByPlay($,homeName,awayName);
    const home=parsedPlayers[0].total;
    const away=parsedPlayers[1].total;
    parsedPlayers[0].players=parsedPlayers[0].players.map((p:any)=>advancedPlayer(p,home,away));
    parsedPlayers[1].players=parsedPlayers[1].players.map((p:any)=>advancedPlayer(p,away,home));
    const validation={
      home:validateTeam(home,homeName),
      away:validateTeam(away,awayName),
      parser:provider==="WINNER_LEAGUE"?"basket-v4":"ibba-v4",
      validated_at:new Date().toISOString()
    };

    const allText=clean($.root().text());
    const dm=allText.match(/\b(\d{2})[-/](\d{2})[-/](\d{4})\b/);
    const gameDate=dm?dm[3]+"-"+dm[2]+"-"+dm[1]:null;
    const dateDisplay=dm?dm[1]+"/"+dm[2]+"/"+dm[3]:"Imported game";
    const id=provider==="WINNER_LEAGUE"?String(u.searchParams.get("GameId")):u.pathname.match(/\/match\/([^/]+)/)![1];
    auditExternalId=id;
    const title=clean($("title").text())||"IBBA";

    const meta={id,home:homeName,away:awayName,competition:title,date_display:dateDisplay,provider};
    const ui=uiGame(meta,home,away,quarters);
    ui.sourceUrl=u.toString();
    ui.playByPlay=playByPlay;
    ui.playByPlayStatus=playByPlay.length?"published":"not_published";
    ui.leaders=playerLeaders(parsedPlayers[0].players);
    ui.awayLeaders=playerLeaders(parsedPlayers[1].players);
    ui.players={home:parsedPlayers[0].players,away:parsedPlayers[1].players};
    if(provider==="IBBA"){
      ui.splits={home:{starters:aggregatePlayers(parsedPlayers[0].players.filter((p:any)=>p.starter)),bench:aggregatePlayers(parsedPlayers[0].players.filter((p:any)=>!p.starter))},
        away:{starters:aggregatePlayers(parsedPlayers[1].players.filter((p:any)=>p.starter)),bench:aggregatePlayers(parsedPlayers[1].players.filter((p:any)=>!p.starter))}};
      ui.matchup={home:homeName,away:awayName};
      ui.stats.push(["Starters Points",ui.splits.home.starters.points,ui.splits.away.starters.points],["Bench Points",ui.splits.home.bench.points,ui.splits.away.bench.points],
        ["Bench Share",pct(ui.splits.home.bench.points,home.points)+"%",pct(ui.splits.away.bench.points,away.points)+"%"],["Starters TS%",ui.splits.home.starters.ts+"%",ui.splits.away.starters.ts+"%"],["Bench TS%",ui.splits.home.bench.ts+"%",ui.splits.away.bench.ts+"%"]);
    }
    if(provider==="WINNER_LEAGUE"){
      ui.splits={home:{starters:splitData[0].starters,bench:splitData[0].bench},away:{starters:splitData[1].starters,bench:splitData[1].bench}};
      ui.matchup={home:homeName,away:awayName};
      if(extraData?.length>=2){
        ui.extra={home:extraData[0],away:extraData[1]};
        ui.stats.push(["Points off Turnovers",extraData[0].points_off_turnovers,extraData[1].points_off_turnovers],["Paint Points",extraData[0].paint_points,extraData[1].paint_points],["Second Chance Points",extraData[0].second_chance_points,extraData[1].second_chance_points]);
      }
      ui.stats.push(["Bench Share",pct(splitData[0].bench.points,home.points)+"%",pct(splitData[1].bench.points,away.points)+"%"],["Starters TS%",splitData[0].starters.ts+"%",splitData[1].starters.ts+"%"],["Bench TS%",splitData[0].bench.ts+"%",splitData[1].bench.ts+"%"]);
    }
    if(ui.splits){
      ui.calculated.home.bench_share=pct(ui.splits.home.bench.points,home.points);
      ui.calculated.away.bench_share=pct(ui.splits.away.bench.points,away.points);
    }
    const payload={provider,source_url:u.toString(),verified:true,imported_at:new Date().toISOString(),validation,ui,raw:{home,away},splits:ui.splits||null,extra:ui.extra||null,play_by_play:playByPlay,calculated:ui.calculated};

    const admin=createClient(supabaseUrl,serviceKey);
    const {data:game,error:gameErr}=await admin.from("games").upsert({
      external_id:id,provider,source_url:u.toString(),competition:title,game_date:gameDate,
      home_team:homeName,away_team:awayName,payload,club_id:club.id
    },{onConflict:"provider,external_id"}).select("id").single();
    if(gameErr) throw gameErr;

    const report={
      version:"v1",game_id:game.id,generated_at:new Date().toISOString(),
      summary:{score:home.points+"-"+away.points,home:homeName,away:awayName},
      metrics:ui.metrics,four_factors:ui.factors,findings:ui.findings,team_stats:ui.stats,
      player_analytics:ui.players,starter_bench:ui.splits||null,play_by_play:playByPlay,formula_catalog:formulaCatalog,
      video_investigation:ui.videos,confidence:"DATA CONFIRMED",validation
    };
    const {error:reportErr}=await admin.from("game_reports").upsert({
      game_id:game.id,report_version:"v1",payload:report,updated_at:new Date().toISOString()
    },{onConflict:"game_id,report_version"});
    if(reportErr) throw reportErr;

    const {error:auditErr}=await admin.from("import_runs").insert({
      club_id:club.id,provider,source_url:u.toString(),external_id:id,status:"success",
      validation,game_id:game.id
    });
    if(auditErr) throw auditErr;

    return j({game_id:game.id,ui,report,validation,saved:true});
  }catch(e){
    const message=e instanceof Error?e.message:String(e);
    if(auditClubId&&auditUrl){
      try{
        const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await admin.from("import_runs").insert({
          club_id:auditClubId,provider:auditUrl.includes("basket.co.il")?"WINNER_LEAGUE":"IBBA",source_url:auditUrl,external_id:auditExternalId,
          status:"failed",error_message:message,validation:{parser:auditUrl.includes("basket.co.il")?"basket-v4":"ibba-v4"}
        });
      }catch(_){}
    }
    return j({error:message},422);
  }
});
