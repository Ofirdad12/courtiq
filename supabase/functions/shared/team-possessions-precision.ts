// CourtIQ precision layer for team possessions.
// Imported before team-possessions-postprocess so it runs after the existing
// response correction and preserves distinct team possession estimates.

const nativeServePrecision = Deno.serve.bind(Deno);
const nativeFetchPrecision = globalThis.fetch.bind(globalThis);
const METHOD = "TEAM_FULL_BOX_SCORE";
const VERSION = "courtiq-formulas-v6";
const r1 = (n:number) => Math.round(n * 10) / 10;
const r2 = (n:number) => Math.round(n * 100) / 100;
const finite = (v:unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function teamBox(team:any){
  if(!team || typeof team !== "object") return null;
  const twoPm=finite(team.two_pm), twoPa=finite(team.two_pa), threePm=finite(team.three_pm), threePa=finite(team.three_pa);
  const fta=finite(team.fta), oreb=finite(team.oreb), dreb=finite(team.dreb), tov=finite(team.tov), points=finite(team.points);
  if([twoPm,twoPa,threePm,threePa,fta,oreb,dreb,tov,points].some(v=>v==null)) return null;
  const fgm=Number(twoPm)+Number(threePm), fga=Number(twoPa)+Number(threePa);
  if(fgm>fga) return null;
  return {fgm,fga,fta:Number(fta),oreb:Number(oreb),dreb:Number(dreb),tov:Number(tov),points:Number(points)};
}

function sideEstimate(team:any, opponent:any){
  const t=teamBox(team), o=teamBox(opponent);
  if(!t || !o) return null;
  const reboundWindow=t.oreb+o.dreb;
  if(reboundWindow<=0) return null;
  return t.fga + 0.4*t.fta - 1.07*(t.oreb/reboundWindow)*(t.fga-t.fgm) + t.tov;
}

function patchRow(rows:any,label:string,home:any,away:any,formatter:(v:any)=>any=v=>v){
  if(!Array.isArray(rows)) return;
  const row=rows.find((r:any)=>Array.isArray(r) && String(r[0]||"").trim().toLowerCase()===label.toLowerCase());
  if(!row) return;
  row[1]=formatter(home); row[2]=formatter(away);
}

function patchUiPrecision(ui:any){
  const homeRaw=ui?.raw?.home, awayRaw=ui?.raw?.away;
  const h=teamBox(homeRaw), a=teamBox(awayRaw);
  const homeEst=sideEstimate(homeRaw,awayRaw), awayEst=sideEstimate(awayRaw,homeRaw);
  if(!h || !a || homeEst==null || awayEst==null) return false;

  const periods=Array.isArray(ui.quarters) && ui.quarters.length ? Math.max(4,ui.quarters.length) : 4;
  const gameMinutes=40+Math.max(0,periods-4)*5;
  const gamePoss=(homeEst+awayEst)/2;
  const pace=gamePoss*40/gameMinutes;
  const homePoss=r2(homeEst), awayPoss=r2(awayEst), gamePoss2=r2(gamePoss), pace1=r1(pace);
  const homeOrtg=r1(100*h.points/homeEst), awayOrtg=r1(100*a.points/awayEst);
  const homeNet=r1(homeOrtg-awayOrtg), awayNet=r1(awayOrtg-homeOrtg);

  ui.calculated=ui.calculated||{};
  ui.calculated.home={...(ui.calculated.home||{}),possessions:homePoss,pace:pace1,ortg:homeOrtg,drtg:awayOrtg,net_rating:homeNet,
    possession_method:METHOD,possession_formula_version:VERSION,team_possession_estimate:homePoss,opponent_possession_estimate:awayPoss,game_possessions:gamePoss2};
  ui.calculated.away={...(ui.calculated.away||{}),possessions:awayPoss,pace:pace1,ortg:awayOrtg,drtg:homeOrtg,net_rating:awayNet,
    possession_method:METHOD,possession_formula_version:VERSION,team_possession_estimate:awayPoss,opponent_possession_estimate:homePoss,game_possessions:gamePoss2};
  ui.gamePace=pace1;
  ui.possessionMethod=METHOD;
  ui.possessionFormulaVersion=VERSION;
  ui.formulaCatalog=ui.formulaCatalog||{};
  ui.formulaCatalog.version=VERSION;
  ui.formulaCatalog.box_score={...(ui.formulaCatalog.box_score||{}),
    possessions:"TeamEst = FGA + 0.4 × FTA - 1.07 × (ORB / (ORB + Opp DRB)) × (FGA - FGM) + TOV; each team remains separate",
    ortg:"Team PTS / Team Possessions × 100",
    drtg:"Opponent PTS / Opponent Possessions × 100",
    pace:"[(Home TeamEst + Away TeamEst) / 2] × 40 / Game Minutes"};

  patchRow(ui.metrics,"Estimated Possessions",homePoss,awayPoss,v=>Number(v).toFixed(2));
  patchRow(ui.metrics,"Possessions",homePoss,awayPoss,v=>Number(v).toFixed(2));
  patchRow(ui.metrics,"Pace",pace1,pace1,v=>Number(v).toFixed(1));
  patchRow(ui.metrics,"Offensive Rating",homeOrtg,awayOrtg,v=>Number(v).toFixed(1));
  patchRow(ui.metrics,"Defensive Rating",awayOrtg,homeOrtg,v=>Number(v).toFixed(1));
  patchRow(ui.metrics,"Net Rating",homeNet,awayNet,v=>Number(v).toFixed(1));
  patchRow(ui.stats,"Possessions",homePoss,awayPoss);
  patchRow(ui.stats,"Pace",pace1,pace1);
  patchRow(ui.stats,"ORtg",homeOrtg,awayOrtg);
  patchRow(ui.stats,"DRtg",awayOrtg,homeOrtg);
  patchRow(ui.stats,"Net Rating",homeNet,awayNet);
  return true;
}

function patchReport(report:any,ui:any){
  if(!report || typeof report!=="object") return report;
  report.metrics=ui.metrics;
  report.team_stats=ui.stats;
  report.formula_catalog=ui.formulaCatalog;
  report.possession_method=METHOD;
  report.possession_formula_version=VERSION;
  return report;
}

async function adminJson(path:string,init:RequestInit={}){
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url || !key) return null;
  const headers=new Headers(init.headers||{});
  headers.set("apikey",key); headers.set("Authorization",`Bearer ${key}`); headers.set("Content-Type","application/json");
  const res=await nativeFetchPrecision(url+path,{...init,headers});
  if(!res.ok) throw new Error(`Supabase REST ${res.status}`);
  if(res.status===204) return null;
  const text=await res.text(); return text?JSON.parse(text):null;
}

async function persist(body:any){
  const gameId=Number(body?.game_id||0);
  if(!gameId || !body?.ui) return;
  try{
    const gameRows=await adminJson(`/rest/v1/games?id=eq.${gameId}&select=payload`);
    const current=gameRows?.[0]?.payload;
    if(current){
      const payload={...current,ui:body.ui,calculated:body.ui.calculated,formula_catalog:body.ui.formulaCatalog,
        possession_method:METHOD,possession_formula_version:VERSION};
      await adminJson(`/rest/v1/games?id=eq.${gameId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({payload})});
    }
    const reports=await adminJson(`/rest/v1/game_reports?game_id=eq.${gameId}&select=id,payload`);
    for(const row of reports||[]){
      const payload=patchReport({...row.payload},body.ui);
      await adminJson(`/rest/v1/game_reports?id=eq.${Number(row.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({payload,updated_at:new Date().toISOString()})});
    }
  }catch(error){ console.warn("[CourtIQ] possession precision persistence skipped:",error); }
}

async function patchResponsePrecision(response:Response){
  if(!(response instanceof Response) || !response.ok) return response;
  if(!(response.headers.get("content-type")||"").toLowerCase().includes("json")) return response;
  try{
    const text=await response.text();
    const body=text?JSON.parse(text):null;
    if(!body?.ui || !patchUiPrecision(body.ui)) return new Response(JSON.stringify(body??{}),{status:response.status,statusText:response.statusText,headers:response.headers});
    if(body.report) body.report=patchReport(body.report,body.ui);
    await persist(body);
    const headers=new Headers(response.headers);
    headers.set("Content-Type","application/json");
    headers.set("X-CourtIQ-Possession-Precision","2dp");
    return new Response(JSON.stringify(body),{status:response.status,statusText:response.statusText,headers});
  }catch(error){
    console.warn("[CourtIQ] possession precision response skipped:",error);
    return response;
  }
}

const wrappedServePrecision=(optionsOrHandler:any,maybeHandler?:any)=>{
  const wrap=(handler:any)=>async(req:Request,info:any)=>patchResponsePrecision(await handler(req,info));
  return typeof optionsOrHandler==="function"
    ? nativeServePrecision(wrap(optionsOrHandler))
    : nativeServePrecision(optionsOrHandler,wrap(maybeHandler));
};

Object.defineProperty(Deno,"serve",{value:wrappedServePrecision,configurable:true,writable:true});
