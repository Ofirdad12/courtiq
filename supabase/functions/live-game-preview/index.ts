import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";

const cors={"Access-Control-Allow-Origin":"https://ofirdad12.github.io","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const j=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const clean=(v:any)=>String(v??"").replace(/\s+/g," ").trim();
const n=(v:any)=>{const m=clean(v).replaceAll(",","").match(/-?\d+/);return m?Number(m[0]):0;};
const ma=(v:any)=>{const m=clean(v).match(/(\d+)\s*[-/–—]\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:[0,0];};
const pct=(a:number,b:number)=>b>0?Math.round(a/b*1000)/10:null;
const r1=(x:number)=>Math.round(x*10)/10;
const minutes=(v:any)=>{const s=clean(v),m=s.match(/^(\d+):(\d{2})$/);return m?r1(Number(m[1])+Number(m[2])/60):(Number.isFinite(Number(s))?r1(Number(s)):0);};
const tableRows=($:cheerio.CheerioAPI,t:any)=>$(t).find("tr").toArray().map((tr:any)=>$(tr).find("th,td").toArray().map((c:any)=>clean($(c).text()))).filter((r:string[])=>r.some(Boolean));
const findCol=(h:string[],needles:string[])=>h.findIndex(x=>needles.some(k=>clean(x).toLowerCase().includes(k.toLowerCase())));

function validateUrl(raw:string){
 const u=new URL(raw);if(u.protocol!=="https:")throw new Error("Use an HTTPS official game URL.");
 const ibba=/^(www\.)?ibasketball\.co\.il$/.test(u.hostname),genius=/^(?:fiba)?livestats\.dcd\.shared\.geniussports\.com$/.test(u.hostname);
 if(ibba&&!/^\/match\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/i.test(u.pathname))throw new Error("Use an official IBBA /match/... URL.");
 if(genius&&!/^\/u\/[a-z0-9_-]+\/\d+\/(?:index\.html|p\.html|pbp\.html|bs\.html)?$/i.test(u.pathname))throw new Error("Use an official FIBA LiveStats / Genius Sports game URL.");
 if(!ibba&&!genius)throw new Error("Live Bench V1 currently supports IBBA and FIBA LiveStats / Genius Sports URLs.");
 return {u,provider:genius?"GENIUS_LIVESTATS":"IBBA"};
}
function calc(t:any,o:any){
 const fga=t.two_pa+t.three_pa,fgm=t.two_pm+t.three_pm,ofga=o.two_pa+o.three_pa,poss=fga+.44*t.fta-t.oreb+t.tov,oposs=ofga+.44*o.fta-o.oreb+o.tov;
 return {possessions:r1(poss),efg:pct(fgm+.5*t.three_pm,fga),ts:pct(t.points,2*(fga+.44*t.fta)),three_pa_rate:pct(t.three_pa,fga),tov_pct:pct(t.tov,fga+.44*t.fta+t.tov),orb_pct:pct(t.oreb,t.oreb+o.dreb),ftr:pct(t.fta,fga),ortg:poss>0?r1(t.points/poss*100):null,drtg:oposs>0?r1(o.points/oposs*100):null};
}
function validateSide(t:any,label:string){
 for(const k of ["points","two_pm","two_pa","three_pm","three_pa","ftm","fta","oreb","dreb","tov","ast"])if(!Number.isFinite(Number(t[k]))||Number(t[k])<0)throw new Error(label+" has invalid "+k+".");
 if(t.two_pm>t.two_pa||t.three_pm>t.three_pa||t.ftm>t.fta)throw new Error(label+" has makes greater than attempts.");
 const shots=2*t.two_pm+3*t.three_pm+t.ftm;if(shots!==t.points)throw new Error(label+" live totals are temporarily inconsistent. Keeping the previous valid snapshot.");
}
function advancedPlayer(p:any){const fga=p.two_pa+p.three_pa,fgm=p.two_pm+p.three_pm;return {...p,fgm,fga,rebounds:p.oreb+p.dreb,efg:pct(fgm+.5*p.three_pm,fga),ts:pct(p.points,2*(fga+.44*p.fta))};}
function leaders(players:any[]){const played=players.filter(p=>p.minutes>0||p.points>0),top=(k:string)=>[...played].sort((a,b)=>Number(b[k]||0)-Number(a[k]||0))[0];if(!played.length)return[];const a=top("points"),b=top("rebounds"),c=top("ast");return [[a.name,a.points,"PTS"],[b.name,b.rebounds,"REB"],[c.name,c.ast,"AST"]];}

function ibbaTeamTotal($:cheerio.CheerioAPI,table:any){
 const rows=tableRows($,table),hi=rows.findIndex(r=>{const x=r.join(" | ");return x.includes("2 נק")&&x.includes("3 נק")&&x.includes("מהקו");});if(hi<0)throw new Error("IBBA live box-score header was not found.");
 const h=rows[hi],total=rows.find(r=>r.some(c=>/^(?:סך\s*הכל|סה["׳']?כ)$/i.test(clean(c))));if(!total)throw new Error("IBBA live team total was not found.");
 const col=(...x:string[])=>{const i=findCol(h,x);if(i<0)throw new Error("IBBA live box score is missing "+x[0]+".");return i;};
 const [two_pm,two_pa]=ma(total[col("2 נק")]),[three_pm,three_pa]=ma(total[col("3 נק")]),[ftm,fta]=ma(total[col("מהקו")]);
 return {points:n(total[col("נק'","נק׳")]),two_pm,two_pa,three_pm,three_pa,ftm,fta,oreb:n(total[col("ריב׳ הת׳","ריב' הת'","ריב הת")]),dreb:n(total[col("ריב׳ הג׳","ריב' הג'","ריב הג")]),tov:n(total[col("איב'","איב׳","איב")]),ast:n(total[col("אס'","אס׳","אס")])};
}
function ibbaPlayers($:cheerio.CheerioAPI,table:any){
 const out=$(table).find("tbody tr, tr").toArray().filter((tr:any)=>$(tr).find("td[data-key]").length).map((tr:any)=>{const v=(k:string)=>clean($(tr).find(`[data-key="${k}"]`).text()),[two_pm,two_pa]=ma(v("fgs")),[three_pm,three_pa]=ma(v("threeps")),[ftm,fta]=ma(v("fts"));return advancedPlayer({name:clean($(tr).find(".data-name").text()),number:n($(tr).find(".data-number").text()),starter:$(tr).hasClass("lineup"),minutes:minutes(v("min")),points:n(v("pts")),two_pm,two_pa,three_pm,three_pa,ftm,fta,dreb:n(v("def")),oreb:n(v("off")),steals:n(v("stl")),tov:n(v("to")),ast:n(v("ast")),blocks:n(v("blk"))});});
 if(!out.length)throw new Error("IBBA live player rows were not found.");return out;
}
function ibbaPbp($:cheerio.CheerioAPI,home:string,away:string){
 const seen=new Set<string>(),out:any[]=[];$("[data-event-timeline] .sp-vertical-timeline-minute").each((order:number,el:any)=>{const node=$(el),cl=String(node.attr("class")||""),side=cl.includes("timeline-minute-home")?"home":cl.includes("timeline-minute-away")?"away":"",p=Number(cl.match(/(?:^|\s)quarter-(\d+)(?:\s|$)/)?.[1]||clean(node.find(".minute .quarter").first().text()).match(/\d+/)?.[0]||0),clock=clean(node.find(".minute .time").first().text()),score=clean(node.find(".minute .score").first().text()),action=node.find(".action").first(),player=clean(action.find("a").first().text()),description=clean(action.find(".description").first().text())||clean(action.text()),type=cl.match(/(?:^|\s)key-([^\s]+)/)?.[1]||"event";if(!p&&!clock&&!description)return;const key=[p,clock,score,side,player,description,type].join("|");if(seen.has(key))return;seen.add(key);out.push({period:p,period_label:"Q"+p,clock,score,side,team:side==="home"?home:side==="away"?away:"",player,description,type,_order:order});});
 const sec=(v:string)=>{const m=v.match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0;};out.sort((a,b)=>a.period-b.period||sec(b.clock)-sec(a.clock)||a._order-b._order);return out.map(({_order,...x})=>x);
}
function ibbaNames($:cheerio.CheerioAPI){const names:string[]=[];$("a[href*='/team/']").each((_:number,a:any)=>{const x=clean($(a).text());if(x&&x.length>1&&!names.includes(x))names.push(x);});if(names.length>=2)return names.slice(0,2);const title=clean($("title").text()).replace(/\s*-\s*IBBA.*$/i,"").split(/\s+[—–]\s+/).map(clean).filter(Boolean);return [title[0]||"Home",title[1]||"Away"];}
function quartersFromPbp(events:any[]){const map=new Map<number,any>();for(const e of events){const s=String(e.score||"").match(/(\d+)\s*[-:]\s*(\d+)/),c=String(e.clock||"").match(/(\d+):(\d{2})/),sec=c?Number(c[1])*60+Number(c[2]):9999;if(!e.period||!s)continue;const old=map.get(e.period);if(!old||sec<old.sec)map.set(e.period,{sec,h:Number(s[1]),a:Number(s[2])});}let h=0,a=0;return [...map.entries()].sort((x,y)=>x[0]-y[0]).map(([,x])=>{const q=[Math.max(0,x.h-h),Math.max(0,x.a-a)];h=x.h;a=x.a;return q;});}

function geniusTeam(team:any){const players=Object.entries(team?.pl||{}).map(([key,row]:any)=>{const mins=minutes(row?.sMinutes||"0:00"),name=clean([row?.firstName||row?.internationalFirstName,row?.familyName||row?.internationalFamilyName].filter(Boolean).join(" "))||clean(row?.name)||"Player "+key;return advancedPlayer({id:String(row?.personId||key),number:n(row?.shirtNumber||row?.jerseyNumber),name,starter:Number(row?.starter||row?.isStarter||0)===1||row?.starter===true||row?.isStarter===true,minutes:mins,points:Number(row?.sPoints||0),two_pm:Number(row?.sTwoPointersMade||0),two_pa:Number(row?.sTwoPointersAttempted||0),three_pm:Number(row?.sThreePointersMade||0),three_pa:Number(row?.sThreePointersAttempted||0),ftm:Number(row?.sFreeThrowsMade||0),fta:Number(row?.sFreeThrowsAttempted||0),dreb:Number(row?.sReboundsDefensive||0),oreb:Number(row?.sReboundsOffensive||0),steals:Number(row?.sSteals||0),tov:Number(row?.sTurnovers||0),ast:Number(row?.sAssists||0),blocks:Number(row?.sBlocks||0)});});
 const total={points:Number(team?.tot_sPoints??team?.score??0),two_pm:Number(team?.tot_sTwoPointersMade||0),two_pa:Number(team?.tot_sTwoPointersAttempted||0),three_pm:Number(team?.tot_sThreePointersMade||0),three_pa:Number(team?.tot_sThreePointersAttempted||0),ftm:Number(team?.tot_sFreeThrowsMade||0),fta:Number(team?.tot_sFreeThrowsAttempted||0),oreb:Number(team?.tot_sReboundsOffensive||0),dreb:Number(team?.tot_sReboundsDefensive||0),tov:Number(team?.tot_sTurnovers||0),ast:Number(team?.tot_sAssists||0)};return {total,players};}
function geniusPbp(data:any,home:string,away:string){const rosters=[data?.tm?.["1"]?.pl||{},data?.tm?.["2"]?.pl||{}],pname=(team:number,pno:any)=>{const r=rosters[team-1]?.[String(pno)]||{};return clean([r.firstName||r.internationalFirstName,r.familyName||r.internationalFamilyName].filter(Boolean).join(" "));};return (Array.isArray(data?.pbp)?data.pbp:[]).map((e:any,i:number)=>{const t=Number(e?.tno??e?.teamNumber??0),raw=Number(e?.period??e?.per??0),ot=String(e?.periodType||e?.perType||"").toUpperCase()==="OVERTIME",period=ot?4+Math.max(1,raw):raw,action=clean(e?.actionType||e?.action||e?.type||"event"),sub=clean(e?.subType||e?.subtype||""),s1=e?.s1??e?.score1??"",s2=e?.s2??e?.score2??"";return {period,period_label:ot?"OT"+Math.max(1,raw):"Q"+period,clock:String(e?.gt||e?.clock||""),score:(s1!==""||s2!=="")?String(s1||0)+"-"+String(s2||0):"",side:t===1?"home":t===2?"away":"",team:t===1?home:t===2?away:"",player:clean(e?.player)||pname(t,e?.pno),description:clean([action,sub].filter(Boolean).join(" · ")),type:action||"event",subtype:sub||null,success:e?.success??null,x:e?.x??null,y:e?.y??null,action_number:e?.actionNumber??e?.actionNo??i+1};}).filter((e:any)=>e.period||e.clock||e.description);}
function geniusQuarters(data:any,events:any[]){const h=data?.tm?.["1"]||{},a=data?.tm?.["2"]||{},out:any[]=[];for(let i=1;i<=12;i++){const k="p"+i+"_score";if(h[k]!=null||a[k]!=null)out.push([Number(h[k]||0),Number(a[k]||0)]);}return out.length>=1?out:quartersFromPbp(events);}

function clockSeconds(v:any){const m=String(v||"").match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):99999;}
function buildUi(provider:string,url:string,homeName:string,awayName:string,home:any,away:any,players:any,quarters:any[],playByPlay:any[],extra:any=null){
 validateSide(home,homeName);validateSide(away,awayName);const hm=calc(home,away),am=calc(away,home),latest=[...playByPlay].filter(e=>e.period&&e.clock).sort((a,b)=>b.period-a.period||clockSeconds(a.clock)-clockSeconds(b.clock))[0]||null;
 const factor=(label:string,a:any,b:any)=>[label,a??0,b??0];
 return {id:"LIVE",comp:provider==="IBBA"?"IBBA Live":"FIBA LiveStats",date:"LIVE",home:homeName,away:awayName,hs:home.points,as:away.points,quarters,sourceUrl:url,sourceLabel:(provider==="IBBA"?"IBBA":"FIBA LIVESTATS / GENIUS SPORTS")+" · LIVE PREVIEW · NOT SAVED",confidence:"LIVE PREVIEW · NOT FINAL",livePreview:true,raw:{home,away},calculated:{home:hm,away:am},factors:[factor("eFG%",hm.efg,am.efg),factor("TOV%",hm.tov_pct,am.tov_pct),factor("ORB%",hm.orb_pct,am.orb_pct),factor("FTr",hm.ftr,am.ftr)],stats:[["Points",home.points,away.points],["2P",home.two_pm+"/"+home.two_pa,away.two_pm+"/"+away.two_pa],["3P",home.three_pm+"/"+home.three_pa,away.three_pm+"/"+away.three_pa],["FT",home.ftm+"/"+home.fta,away.ftm+"/"+away.fta],["Assists",home.ast,away.ast],["Turnovers",home.tov,away.tov],["Offensive Rebounds",home.oreb,away.oreb]],metrics:[["eFG%",hm.efg==null?"—":hm.efg+"%",am.efg==null?"—":am.efg+"%"],["TOV%",hm.tov_pct==null?"—":hm.tov_pct+"%",am.tov_pct==null?"—":am.tov_pct+"%"],["ORB%",hm.orb_pct==null?"—":hm.orb_pct+"%",am.orb_pct==null?"—":am.orb_pct+"%"]],players:{home:players[0],away:players[1]},leaders:leaders(players[0]),awayLeaders:leaders(players[1]),playByPlay,playByPlayStatus:playByPlay.length?"published":"not_published",extra,live:{provider,latest_event:latest,event_count:playByPlay.length,refreshed_at:new Date().toISOString(),quality:"VALID_SNAPSHOT"}};
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});if(req.method!=="POST")return j({error:"Method not allowed"},405);
 try{
  const auth=req.headers.get("Authorization");if(!auth)return j({error:"Sign in is required."},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const userDb=createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}}});const {data:clubs,error:clubErr}=await userDb.from("clubs").select("id").eq("slug","maccabi-bnot-ashdod").limit(1);if(clubErr)throw clubErr;if(!clubs?.length)return j({error:"This account does not have access to the CourtIQ pilot."},403);
  const body=await req.json(),{u,provider}=validateUrl(String(body?.url||""));
  const browserHeaders={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36","Accept":"text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8","Cache-Control":"no-cache","Pragma":"no-cache"};
  let ui:any;
  if(provider==="GENIUS_LIVESTATS"){
   const m=u.pathname.match(/^\/u\/([^/]+)\/(\d+)\//i);if(!m)throw new Error("Could not read Genius game ID.");const gameId=m[2],dataUrl=`${u.protocol}//${u.host}/data/${gameId}/data.json`,res=await fetch(dataUrl,{headers:{...browserHeaders,"Accept":"application/json","X-Requested-With":"XMLHttpRequest","Referer":u.toString()}});if(!res.ok)throw new Error("LiveStats returned HTTP "+res.status);const data=await res.json(),ht=data?.tm?.["1"],at=data?.tm?.["2"];if(!ht||!at)throw new Error("LiveStats does not contain both teams yet.");const homeName=clean(ht.name||ht.nameInternational||ht.shortName),awayName=clean(at.name||at.nameInternational||at.shortName),hp=geniusTeam(ht),ap=geniusTeam(at),pbp=geniusPbp(data,homeName,awayName),q=geniusQuarters(data,pbp);ui=buildUi(provider,u.toString(),homeName,awayName,hp.total,ap.total,[hp.players,ap.players],q,pbp,{home:{points_off_turnovers:Number(ht?.tot_sPointsFromTurnovers||0),paint_points:Number(ht?.tot_sPointsInThePaint||0),second_chance_points:Number(ht?.tot_sPointsSecondChance||0),fast_break_points:Number(ht?.tot_sPointsFastBreak||0)},away:{points_off_turnovers:Number(at?.tot_sPointsFromTurnovers||0),paint_points:Number(at?.tot_sPointsInThePaint||0),second_chance_points:Number(at?.tot_sPointsSecondChance||0),fast_break_points:Number(at?.tot_sPointsFastBreak||0)}});
  }else{
   const res=await fetch(u.toString(),{headers:browserHeaders});if(!res.ok)throw new Error("IBBA returned HTTP "+res.status);const html=await res.text(),$=cheerio.load(html),tables:any[]=[];$("table").each((_:number,t:any)=>{const h=tableRows($,t).slice(0,8).flat().join(" | ");if(h.includes("2 נק")&&h.includes("3 נק")&&h.includes("איב")&&h.includes("אס"))tables.push(t);});if(tables.length<2)throw new Error("IBBA has not published both live box-score tables yet.");const [homeName,awayName]=ibbaNames($),home=ibbaTeamTotal($,tables[0]),away=ibbaTeamTotal($,tables[1]),players=[ibbaPlayers($,tables[0]),ibbaPlayers($,tables[1])],pbp=ibbaPbp($,homeName,awayName),quarters=quartersFromPbp(pbp);ui=buildUi(provider,u.toString(),homeName,awayName,home,away,players,quarters,pbp);
  }
  return j({preview:true,saved:false,ui,refreshed_at:new Date().toISOString()});
 }catch(e){return j({error:e instanceof Error?e.message:String(e)},422);}
});
