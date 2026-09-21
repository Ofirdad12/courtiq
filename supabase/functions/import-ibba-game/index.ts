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

function validateUrl(raw:string){
  const u=new URL(raw);
  if(u.protocol!=="https:" || !allowed.has(u.hostname)) throw new Error("Use an official ibasketball.co.il or basket.co.il game URL.");
  const isIbba=/^(www\.)?ibasketball\.co\.il$/.test(u.hostname);
  const isBasket=/^(www\.)?basket\.co\.il$/.test(u.hostname);
  if(isIbba && !/^\/match\/\d+(?:-[^/]*)?\/?$/.test(u.pathname)) throw new Error("Unsupported IBBA URL. Use an official /match/... page.");
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

function idxAny(headers:string[], needles:string[]){
  const norm=(s:string)=>clean(s).toLowerCase();
  const i=headers.findIndex(h=>needles.some(n=>norm(h)===norm(n)||norm(h).includes(norm(n))));
  if(i<0) throw new Error("Missing expected box-score column: "+needles.join("/"));
  return i;
}
function basketTeamTotal($:cheerio.CheerioAPI, table:any){
  const rows=tableRows($,table).filter((r:string[])=>r.length);
  let hi=rows.findIndex((r:string[])=>r.some(h=>/2pt|2 נק/i.test(h))&&r.some(h=>/3pt|3 נק/i.test(h)));
  if(hi<0) hi=0;
  const headers=rows[hi];
  let total=rows.slice(hi+1).find((r:string[])=>r.some(c=>/^(total|totals|team|סה.?כ|סך הכל)$/i.test(clean(c))));
  if(!total) total=rows.slice(hi+1).reverse().find((r:string[])=>r.length>=headers.length-2 && r.some(c=>/\d/.test(c)));
  if(!total) throw new Error("Winner League box score has no readable team total row.");
  const [two_pm,two_pa]=ma(total[idxAny(headers,["2PT","2 נק"])]);
  const [three_pm,three_pa]=ma(total[idxAny(headers,["3PT","3 נק"])]);
  const [ftm,fta]=ma(total[idxAny(headers,["1PT","FT","עונשין","מהקו"])]);
  return {points:num(total[idxAny(headers,["Pts","Points","נק"])]),two_pm,two_pa,three_pm,three_pa,ftm,fta,
    dreb:num(total[idxAny(headers,["DR","DREB","הגנה"])]),oreb:num(total[idxAny(headers,["OR","OREB","התק"])]),
    tov:num(total[idxAny(headers,["TO","TOV","אב","איב"])]),ast:num(total[idxAny(headers,["AS","AST","אס"])])};
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
function calc(t:any, opp:any){
  const fgm=t.two_pm+t.three_pm, fga=t.two_pa+t.three_pa;
  const poss=fga+.44*t.fta-t.oreb+t.tov;
  return {
    possessions:r1(poss), ortg:r1(t.points/Math.max(poss,1)*100),
    efg:pct(fgm+.5*t.three_pm,fga), ts:pct(t.points,2*(fga+.44*t.fta)),
    tov:pct(t.tov,fga+.44*t.fta+t.tov), orb:pct(t.oreb,t.oreb+opp.dreb),
    ftr:pct(t.fta,fga), ast_to:t.tov?Math.round(t.ast/t.tov*100)/100:null
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
  const hm=calc(home,away), am=calc(away,home);
  const metrics=[["Offensive Rating",hm.ortg.toFixed(1),am.ortg.toFixed(1)],["eFG%",hm.efg+"%",am.efg+"%"],["TS%",hm.ts+"%",am.ts+"%"],["TOV%",hm.tov+"%",am.tov+"%"],["AST/TO",hm.ast_to??"—",am.ast_to??"—"]];
  const factors=[["eFG%",hm.efg,am.efg],["TOV%",hm.tov,am.tov],["ORB%",hm.orb,am.orb],["FTr",hm.ftr,am.ftr]];
  const stats=[["Points",home.points,away.points],["2P",home.two_pm+"/"+home.two_pa,away.two_pm+"/"+away.two_pa],["3P",home.three_pm+"/"+home.three_pa,away.three_pm+"/"+away.three_pa],["FT",home.ftm+"/"+home.fta,away.ftm+"/"+away.fta],["Assists",home.ast,away.ast],["Turnovers",home.tov,away.tov],["Offensive Rebounds",home.oreb,away.oreb],["Defensive Rebounds",home.dreb,away.dreb]];
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
    raw:{home,away},calculated:{home:hm,away:am}};
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

    let homeName="",awayName="",quarters:any[]=[], splitData:any=null, extraData:any=null;
    const playerTables:any[]=[];
    if(provider==="IBBA"){
      let quarter:any=null;
      $("table").each((_:number,t:any)=>{ if(quarter)return; const h=tableRows($,t)[0]?.join(" | ")||""; if(h.includes("רבע 1")&&h.includes("רבע 4")) quarter=t; });
      if(!quarter) throw new Error("Could not locate the IBBA quarter table.");
      const qrows=tableRows($,quarter).slice(1).filter((r:string[])=>r.length>=6&&r[0]);
      if(qrows.length<2) throw new Error("Could not read both teams.");
      homeName=qrows[0][0]; awayName=qrows[1][0]; quarters=[0,1,2,3].map(i=>[num(qrows[0][i+1]),num(qrows[1][i+1])]);
      $("table").each((_:number,t:any)=>{const h=(tableRows($,t)[0]||[]).join(" | ");if(h.includes("2 נק")&&h.includes("3 נק")&&h.includes("איב")&&h.includes("אס"))playerTables.push(t);});
    }else{
      [homeName,awayName]=basketNames($);
      const splitTables:any[]=[];
      $("table").each((_:number,t:any)=>{
        const h=tableRows($,t).slice(0,6).flat().join(" | ");
        if(/(חמישייה-ספסל|starters?.*bench)/i.test(h)&&/(2 נק|2PT|2P)/i.test(h)&&/(3 נק|3PT|3P)/i.test(h)) splitTables.push(t);
      });
      if(splitTables.length<2) throw new Error("Could not locate both Winner League starter/bench tables.");
      splitData=[basketSplit($,splitTables[0]),basketSplit($,splitTables[1])];
      extraData=basketExtra($);
    }
    if(!homeName||!awayName||homeName===awayName) throw new Error("Could not validate both team names.");
    if(provider==="IBBA"&&playerTables.length<2) throw new Error("Could not locate both IBBA box-score tables.");
    const home=provider==="WINNER_LEAGUE"?splitData[0].total:teamTotal($,playerTables[0]);
    const away=provider==="WINNER_LEAGUE"?splitData[1].total:teamTotal($,playerTables[1]);
    const validation={
      home:validateTeam(home,homeName),
      away:validateTeam(away,awayName),
      parser:provider==="WINNER_LEAGUE"?"basket-v2":"ibba-v2",
      validated_at:new Date().toISOString()
    };

    const allText=clean($.root().text());
    const dm=allText.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
    const gameDate=dm?dm[3]+"-"+dm[2]+"-"+dm[1]:null;
    const dateDisplay=dm?dm[1]+"/"+dm[2]+"/"+dm[3]:"Imported game";
    const id=provider==="WINNER_LEAGUE"?String(u.searchParams.get("GameId")):u.pathname.match(/\/match\/(\d+)/)![1];
    auditExternalId=id;
    const title=clean($("title").text())||"IBBA";

    const meta={id,home:homeName,away:awayName,competition:title,date_display:dateDisplay,provider};
    const ui=uiGame(meta,home,away,quarters);
    if(provider==="WINNER_LEAGUE"){
      ui.splits={home:{starters:splitData[0].starters,bench:splitData[0].bench},away:{starters:splitData[1].starters,bench:splitData[1].bench}};
      ui.matchup={home:homeName,away:awayName};
      if(extraData?.length>=2){
        ui.extra={home:extraData[0],away:extraData[1]};
        ui.stats.push(["Points off Turnovers",extraData[0].points_off_turnovers,extraData[1].points_off_turnovers],["Paint Points",extraData[0].paint_points,extraData[1].paint_points],["Second Chance Points",extraData[0].second_chance_points,extraData[1].second_chance_points]);
      }
      ui.stats.push(["Assists",home.ast,away.ast],["Starters TS%",splitData[0].starters.ts+"%",splitData[1].starters.ts+"%"],["Bench TS%",splitData[0].bench.ts+"%",splitData[1].bench.ts+"%"]);
    }
    const payload={provider,source_url:u.toString(),verified:true,imported_at:new Date().toISOString(),validation,ui,raw:{home,away},splits:ui.splits||null,extra:ui.extra||null,calculated:ui.calculated};

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
          status:"failed",error_message:message,validation:{parser:auditUrl.includes("basket.co.il")?"basket-v2":"ibba-v2"}
        });
      }catch(_){}
    }
    return j({error:message},422);
  }
});
