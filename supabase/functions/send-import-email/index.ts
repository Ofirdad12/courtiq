import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Cache-Control":"no-store"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const clean=(v:unknown,max=500)=>String(v??"").replace(/\s+/g," ").trim().slice(0,max);
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));
const emailOk=(v:string)=>v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const finite=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const display=(v:unknown)=>v===null||v===undefined||v===""?"—":String(v);

function filenamePart(v:unknown){return clean(v,70).replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"")||"game";}
function base64Utf8(text:string){
  const bytes=new TextEncoder().encode(text);let binary="";const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  return btoa(binary);
}
function cell(v:unknown){return `"${String(v??"").replace(/"/g,'""')}"`;}

function csv(game:any){
  const rows:any[][]=[];const add=(section:string,key:unknown,home:unknown,away:unknown)=>rows.push([section,key,home,away]);
  add("GAME","Competition",game.competition,"");add("GAME","Date",game.date,"");add("GAME","Matchup",game.home,game.away);add("GAME","Score",game.home_score,game.away_score);add("GAME","Source",game.source_label,game.source_url||"");
  for(const r of Array.isArray(game.stats)?game.stats:[])add("TEAM STATS",r?.[0],r?.[1],r?.[2]);
  for(const r of Array.isArray(game.factors)?game.factors:[])add("FOUR FACTORS",r?.[0],r?.[1],r?.[2]);
  const h=game.calculated?.home||{},a=game.calculated?.away||{};
  for(const [label,key] of [["Possessions","possessions"],["Pace","pace"],["ORtg","ortg"],["DRtg","drtg"],["Net Rating","net_rating"],["eFG%","efg"],["TOV%","tov"],["ORB%","orb"],["FTr","ftr"]])if(h[key]!=null||a[key]!=null)add("ADVANCED",label,h[key]??"",a[key]??"");
  rows.push([]);rows.push(["PLAYERS","Team","Player","MIN","PTS","REB","AST","TS%","eFG%","+/-"]);
  for(const [side,team] of [["home",game.home],["away",game.away]])for(const p of game.players?.[side]||[])rows.push(["PLAYER",team,p?.name??"",p?.minutes??"",p?.points??"",p?.rebounds??((Number(p?.oreb)||0)+(Number(p?.dreb)||0)),p?.ast??"",p?.ts??"",p?.efg??"",p?.plus_minus??""]);
  return "\uFEFF"+rows.map(r=>r.map(cell).join(",")).join("\r\n");
}

function metricRows(game:any){
  const h=game.calculated?.home||{},a=game.calculated?.away||{};
  const defs:[[string,string],...[string,string][]]=[["Possessions","possessions"],["Pace","pace"],["ORtg","ortg"],["DRtg","drtg"],["Net Rating","net_rating"],["eFG%","efg"],["TOV%","tov"],["ORB%","orb"],["FTr","ftr"]];
  return defs.filter(([,k])=>h[k]!=null||a[k]!=null).map(([label,k])=>[label,h[k]??"—",a[k]??"—"]);
}
function table(rows:any[][],heads:string[]){
  if(!rows.length)return "";
  return `<table style="width:100%;border-collapse:collapse;margin:14px 0"><thead><tr>${heads.map(h=>`<th style="text-align:left;padding:8px;border-bottom:1px solid #dbe3ef;font-size:11px;color:#65758b">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td style="padding:8px;border-bottom:1px solid #eef2f7;font-size:12px">${esc(display(v))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function playerRows(game:any,side:"home"|"away"){
  return (Array.isArray(game.players?.[side])?game.players[side]:[]).slice().sort((a:any,b:any)=>Number(b?.points||0)-Number(a?.points||0)).slice(0,12).map((p:any)=>[clean(p?.name,100),p?.minutes??"—",p?.points??"—",p?.rebounds??((Number(p?.oreb)||0)+(Number(p?.dreb)||0)),p?.ast??"—",p?.ts??"—"]);
}
function html(game:any){
  const stats=(Array.isArray(game.stats)?game.stats:[]).slice(0,30).map((r:any)=>[r?.[0],r?.[1],r?.[2]]);
  const factors=(Array.isArray(game.factors)?game.factors:[]).slice(0,12).map((r:any)=>[r?.[0],r?.[1],r?.[2]]);
  const source=clean(game.source_url,1000);
  const sourceHtml=/^https:\/\//i.test(source)?`<a href="${esc(source)}" style="color:#6d28d9">Official source</a>`:esc(game.source_label||"CourtIQ data");
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#152033"><div style="max-width:760px;margin:0 auto;padding:26px"><div style="background:#07101d;color:#fff;border-radius:16px;padding:22px"><div style="font-size:12px;letter-spacing:.14em;color:#a9b9cc">COURTIQ · IMPORT EXPORT</div><h1 style="font-size:24px;margin:8px 0 2px">${esc(game.home)} ${esc(display(game.home_score))} - ${esc(display(game.away_score))} ${esc(game.away)}</h1><div style="color:#b9c6d8;font-size:13px">${esc(game.competition||"Competition")} · ${esc(game.date||"—")}</div></div><div style="background:#fff;border-radius:16px;padding:22px;margin-top:12px"><h2 style="font-size:17px">Advanced team profile</h2>${table(metricRows(game),["Metric",clean(game.home,60),clean(game.away,60)])}<h2 style="font-size:17px">Team stats</h2>${table(stats,["Metric",clean(game.home,60),clean(game.away,60)])}<h2 style="font-size:17px">Four Factors</h2>${table(factors,["Metric",clean(game.home,60),clean(game.away,60)])}<h2 style="font-size:17px">${esc(game.home)} players</h2>${table(playerRows(game,"home"),["Player","MIN","PTS","REB","AST","TS%"])}<h2 style="font-size:17px">${esc(game.away)} players</h2>${table(playerRows(game,"away"),["Player","MIN","PTS","REB","AST","TS%"])}<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e5eaf1;font-size:11px;color:#6b7788">${sourceHtml}<br>CourtIQ uses official game data. Tactical causation requires video verification.</div></div></div></body></html>`;
}

function normalizedGame(input:any){
  if(!input||typeof input!=="object")throw new Error("Missing imported game data.");
  const home=clean(input.home,120),away=clean(input.away,120);if(!home||!away)throw new Error("The imported game is missing team names.");
  return {
    id:clean(input.id,120),competition:clean(input.competition,160),date:clean(input.date,100),home,away,
    home_score:finite(input.home_score),away_score:finite(input.away_score),source_label:clean(input.source_label,240),source_url:clean(input.source_url,1000),
    raw:input.raw&&typeof input.raw==="object"?input.raw:null,calculated:input.calculated&&typeof input.calculated==="object"?input.calculated:null,
    stats:Array.isArray(input.stats)?input.stats.slice(0,60):[],factors:Array.isArray(input.factors)?input.factors.slice(0,30):[],
    players:input.players&&typeof input.players==="object"?{home:Array.isArray(input.players.home)?input.players.home.slice(0,30):[],away:Array.isArray(input.players.away)?input.players.away.slice(0,30):[]}:null,
    findings:Array.isArray(input.findings)?input.findings.slice(0,30):[]
  };
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed."},405);
  try{
    if(!req.headers.get("Authorization"))return json({error:"Sign in is required."},401);
    const text=await req.text();
    if(text.length>220000)return json({error:"The email export is too large.",code:"PAYLOAD_TOO_LARGE"},413);
    let body:any;try{body=JSON.parse(text);}catch(_){return json({error:"Invalid request body."},400);}
    const to=clean(body?.to,254).toLowerCase();if(!emailOk(to))return json({error:"Enter a valid recipient email address.",code:"INVALID_EMAIL"},422);
    const format=["summary","csv","json"].includes(body?.format)?body.format:"summary";
    const game=normalizedGame(body?.game);
    const apiKey=Deno.env.get("RESEND_API_KEY")||"";
    const from=Deno.env.get("COURTIQ_FROM_EMAIL")||"";
    if(!apiKey||!from)return json({error:"Direct email is not configured yet.",code:"EMAIL_NOT_CONFIGURED"},503);
    const stem=`CourtIQ-${filenamePart(game.home)}-vs-${filenamePart(game.away)}`;
    const attachments:any[]=[];
    if(format==="csv")attachments.push({filename:stem+".csv",content:base64Utf8(csv(game)),content_type:"text/csv; charset=utf-8"});
    if(format==="json")attachments.push({filename:stem+".json",content:base64Utf8(JSON.stringify(game,null,2)),content_type:"application/json; charset=utf-8"});
    const payload:any={from,to:[to],subject:`CourtIQ · ${clean(game.home,70)} vs ${clean(game.away,70)}`,html:html(game)};
    if(attachments.length)payload.attachments=attachments;
    const headers:Record<string,string>={Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"};
    const requestId=clean(body?.request_id,100);if(requestId)headers["Idempotency-Key"]=`courtiq-import/${requestId}`;
    const res=await fetch("https://api.resend.com/emails",{method:"POST",headers,body:JSON.stringify(payload)});
    const raw=await res.text();let result:any={};try{result=raw?JSON.parse(raw):{};}catch(_){result={};}
    if(!res.ok)return json({error:result?.message||`Email provider returned HTTP ${res.status}.`,code:"EMAIL_PROVIDER_ERROR"},502);
    return json({sent:true,id:result?.id||null,to,format});
  }catch(error){return json({error:error instanceof Error?error.message:String(error),code:"EMAIL_EXPORT_FAILED"},422);}
});
