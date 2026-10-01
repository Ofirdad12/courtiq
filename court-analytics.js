/* CourtIQ: measured lineup stints and canonical half-court shot locations.
 * Box-score starters are never treated as an on-court lineup sample.
 * Tagged uploads stay in this browser and do not alter official game records.
 */
(function(root){
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const num=v=>typeof v==="number"&&Number.isFinite(v);
  const count=v=>num(v)&&v>=0&&Number.isInteger(v);
  const optional=["possessions","opponentPossessions","fgm","fga","threePm","tov"];
  const five=ps=>Array.isArray(ps)&&ps.length===5&&ps.every(p=>typeof p==="string"&&p.trim())&&new Set(ps.map(p=>p.trim())).size===5;
  const key=ps=>JSON.stringify([...ps].map(p=>p.trim()).sort());
  const fmt=(v,d=1)=>v==null?"—":Number(v).toFixed(d);
  function validate(data){
    if(!data||data.version!==1||data.coordinateSystem!=="FIBA_METERS_HALF") throw Error("Expected version 1 and coordinateSystem FIBA_METERS_HALF.");
    if(!Array.isArray(data.lineupStints)||!Array.isArray(data.shots))throw Error("lineupStints and shots must be arrays.");
    if(data.lineupStints.length>10000||data.shots.length>10000)throw Error("Maximum 10,000 records per array.");
    const ids=new Set();
    const checkId=(r,type)=>{if(typeof r.id!=="string"||!r.id.trim()||ids.has(type+r.id))throw Error(type+": unique nonempty id required.");ids.add(type+r.id);};
    const stints=data.lineupStints.map(r=>{
      checkId(r,"Stint");
      if(!["home","away"].includes(r.side)||!five(r.players)||!num(r.seconds)||r.seconds<0||!count(r.pointsFor)||!count(r.pointsAgainst)||(r.seconds===0&&!r.pointsFor&&!r.pointsAgainst&&!r.fga&&!r.tov))throw Error("Stint "+r.id+": require side, five unique players, nonnegative seconds, a nonempty sample, and nonnegative integer pointsFor/pointsAgainst.");
      optional.forEach(k=>{if(r[k]!=null&&!count(r[k]))throw Error("Stint "+r.id+": invalid "+k);});
      if((r.fgm!=null&&r.fga!=null&&r.fgm>r.fga)||(r.threePm!=null&&r.fgm!=null&&r.threePm>r.fgm))throw Error("Stint "+r.id+": shooting totals do not reconcile.");
      return {id:r.id,side:r.side,players:r.players.map(p=>p.trim()),seconds:r.seconds,pointsFor:r.pointsFor,pointsAgainst:r.pointsAgainst,...Object.fromEntries(optional.map(k=>[k,r[k]??null])),...(r.period!=null?{period:r.period,startClock:String(r.startClock||""),endClock:String(r.endClock||"")}:{})};
    });
    const shots=data.shots.map(r=>{
      checkId(r,"Shot");
      if(!["home","away"].includes(r.side)||typeof r.player!=="string"||!r.player.trim()||!count(r.period)||r.period<1||typeof r.made!=="boolean"||![2,3].includes(r.value)||!num(r.x)||!num(r.y)||r.x<0||r.x>15||r.y<0||r.y>14)throw Error("Shot "+r.id+": invalid side/player/period/made/value or coordinates (x 0–15 m, y 0–14 m).");
      if(r.lineup!=null&&(!five(r.lineup)||!r.lineup.map(p=>p.trim()).includes(r.player.trim())))throw Error("Shot "+r.id+": lineup must contain five unique players including the shooter.");
      if(r.clock!=null&&!/^\d{1,2}:[0-5]\d$/.test(r.clock))throw Error("Shot "+r.id+": clock must be MM:SS.");
      return {id:r.id,side:r.side,player:r.player.trim(),period:r.period,made:r.made,value:r.value,x:r.x,y:r.y,clock:r.clock||"",lineup:r.lineup?.map(p=>p.trim())||null};
    });
    return {version:1,coordinateSystem:"FIBA_METERS_HALF",lineupStints:stints,shots};
  }
  function aggregate(stints){
    const rows=new Map();
    stints.forEach(s=>{
      const id=s.side+":"+key(s.players);
      if(!rows.has(id))rows.set(id,{id,side:s.side,players:[...s.players].sort(),seconds:0,pointsFor:0,pointsAgainst:0,stints:0,...Object.fromEntries(optional.map(k=>[k,0]))});
      const r=rows.get(id);r.seconds+=s.seconds;r.pointsFor+=s.pointsFor;r.pointsAgainst+=s.pointsAgainst;r.stints++;
      optional.forEach(k=>{r[k]=r[k]==null||s[k]==null?null:r[k]+s[k];});
    });
    return [...rows.values()].map(r=>{
      const ortg=r.possessions>0?100*r.pointsFor/r.possessions:null,drtg=r.opponentPossessions>0?100*r.pointsAgainst/r.opponentPossessions:null;
      return {...r,minutes:r.seconds/60,plusMinus:r.pointsFor-r.pointsAgainst,ortg,drtg,net:ortg!=null&&drtg!=null?ortg-drtg:null,efg:r.fga>0&&r.fgm!=null&&r.threePm!=null?100*(r.fgm+.5*r.threePm)/r.fga:null};
    }).sort((a,b)=>b.seconds-a.seconds);
  }
  function filterShots(shots,f={}){
    return shots.filter(s=>(!f.side||s.side===f.side)&&(!f.player||s.player===f.player)&&(!f.period||s.period===Number(f.period))&&(!f.result||(f.result==="made"?s.made:!s.made))&&(!f.lineup||(s.lineup&&s.side+":"+key(s.lineup)===f.lineup)));
  }
  function summary(shots){
    const fga=shots.length,fgm=shots.filter(s=>s.made).length,threePm=shots.filter(s=>s.made&&s.value===3).length;
    return {fga,fgm,points:shots.reduce((a,s)=>a+(s.made?s.value:0),0),fg:fga?100*fgm/fga:null,efg:fga?100*(fgm+.5*threePm)/fga:null};
  }
  const blank=()=>({version:1,coordinateSystem:"FIBA_METERS_HALF",lineupStints:[],shots:[]});
  function storageKey(G){return "courtiq_court_v1:"+JSON.stringify([G._dbId||"",G.sourceUrl||G.source_url||"",G.comp||"",G.id||"",G.home,G.away,G.date||""]);}
  function dataset(G){
    let tagged=null,error="";
    try{const raw=root.localStorage?.getItem(storageKey(G));if(raw)tagged=validate(JSON.parse(raw));}catch(e){error="Saved tagged data could not be loaded: "+e.message;}
    const derived=root.CourtIQLineupEngine?.derive(G);
    const candidate=G.courtAnalytics||{...blank(),coordinateSystem:G.coordinateSystem||"FIBA_METERS_HALF",lineupStints:G.lineupStints||[],shots:G.shots||[]};
    if(derived&&(!candidate.lineupStints?.length||G.courtAnalytics?.quality?.source==="PLAY_BY_PLAY"))candidate.lineupStints=derived.lineupStints;
    let official=blank();
    try{
      // Raw coordinates from a provider must carry their coordinate system.
      if(candidate.shots.length&&!G.courtAnalytics&&!G.coordinateSystem)throw Error("Source shot coordinates need an explicit FIBA_METERS_HALF coordinate system.");
      official=validate(candidate);
    }catch(e){error+=(error?" ":"")+"Source analytics unavailable: "+e.message;}
    return {data:tagged||official,tagged:!!tagged,error,quality:!tagged&&derived?derived.quality:null};
  }
  function uploadBox(){
    return '<details class="caImport"><summary>Import / export tagged analytics (JSON)</summary><p>Tagged data is stored in this browser for this game. Import replaces the previous tagged dataset. Export lets you keep a copy.</p><p>Coordinates: meters; x from the left sideline (0–15), y from the attacking baseline (0–14); basket at (7.5, 1.575). Rotate second-half/opposite-basket shots before importing. Field goals only; exclude free throws. Each stint is one measured segment without substitutions; do not upload overlapping segments for the same team.</p><pre>{"version":1,"coordinateSystem":"FIBA_METERS_HALF","lineupStints":[{"id":"s1","side":"home","players":["A","B","C","D","E"],"seconds":120,"pointsFor":5,"pointsAgainst":4,"possessions":4,"opponentPossessions":4}],"shots":[{"id":"f1","side":"home","player":"A","period":1,"clock":"08:30","x":7.5,"y":2,"made":true,"value":2,"lineup":["A","B","C","D","E"]}]}</pre><p>This is a format example, not game data. Optional stint fields: possessions, opponentPossessions, fgm, fga, threePm, tov. Shot lineup is optional.</p><input class="caFile" type="file" accept=".json,application/json" aria-label="Import tagged analytics JSON"><button class="importBtn caExport" type="button">EXPORT JSON</button> <button class="importBtn caClear" type="button">CLEAR TAGGED DATA</button><div class="caStatus" role="status"></div></details>';
  }
  function render(){
    return '<section class="gameViewPanel" data-game-view="lineups"><div class="viewTitle"><div><small>ON-COURT COMPARISON</small><h3>Lineups · השוואת הרכבים</h3></div></div><div class="card box caRoot" data-ca="lineups"></div></section><section class="gameViewPanel" data-game-view="shots"><div class="viewTitle"><div><small>SHOT LOCATIONS</small><h3>Shot Chart · מפת זריקות</h3></div></div><div class="card box caRoot" data-ca="shots"></div></section>';
  }
  function saveFile(G,data){
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");
    a.href=url;a.download="courtiq-"+String(G.id||"game").replace(/[^a-z0-9_-]/gi,"-")+"-court-analytics.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function court(shots){
    const marks=shots.map(s=>{
      const x=s.x*30,y=s.y*30,label=esc(s.player+" · Q"+s.period+" "+s.clock+" · "+(s.made?"Made":"Missed")+" "+s.value+"PT");
      return s.made?'<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="#45dfad" stroke="#071321"><title>'+label+'</title></circle>':'<path d="M '+(x-4)+' '+(y-4)+' l 8 8 m -8 0 l 8 -8" stroke="#ff7184" stroke-width="2.5"><title>'+label+'</title></path>';
    }).join("");
    return '<svg viewBox="-8 -8 466 436" role="img" aria-label="Shot chart: green circles are makes, pink crosses are misses" class="caCourt"><rect x="0" y="0" width="450" height="420" fill="#101f32" stroke="#a2b5cd" stroke-width="2"/><g fill="none" stroke="#a2b5cd" stroke-width="2"><rect x="151.5" y="0" width="147" height="174"/><circle cx="225" cy="174" r="54"/><path d="M 27 0 V 89.9 A 202.5 202.5 0 0 0 423 89.9 V 0"/><path d="M 171 420 A 54 54 0 0 1 279 420"/><path d="M 198 36 H 252"/><circle cx="225" cy="47.25" r="6.75"/></g>'+marks+'</svg>';
  }
  function mount(G){
    const lineupRoot=root.document?.querySelector('[data-ca="lineups"]'),shotRoot=root.document?.querySelector('[data-ca="shots"]');
    if(!lineupRoot||!shotRoot)return;
    const loaded=dataset(G),data=loaded.data,rows=aggregate(data.lineupStints),quality=loaded.quality;
    const name=s=>s==="home"?G.home:G.away;
    const provenance='<p class="metricNote">'+(loaded.tagged?"BROWSER TAGGED DATA · User-supplied sample":quality?.events?"PLAY-BY-PLAY · Automatic lineup reconstruction":"SOURCE DATA · Available measured sample")+' · '+data.lineupStints.length+' stints · '+data.shots.length+' located field-goal attempts. '+esc(loaded.error)+'</p>';
    const qa=quality?.events?'<div class="schema"><b>PBP LINEUPS · '+esc(quality.status)+'</b> · '+quality.events+' events<br>Coverage: '+esc(G.home)+' '+fmt(quality.coverageSeconds.home/60)+' / '+fmt(quality.expectedSeconds/60)+' min · '+esc(G.away)+' '+fmt(quality.coverageSeconds.away/60)+' / '+fmt(quality.expectedSeconds/60)+' min<br>Scoring: '+esc(quality.scoringMode||"Unavailable")+'. Unknown intervals are excluded. Possession ratings need verified possession boundaries.'+(quality.warnings.length?'<details><summary>Data gaps / review ('+quality.warnings.length+')</summary>'+quality.warnings.map(w=>'<p>'+esc(w)+'</p>').join("")+'</details>':"")+'</div>':"";
    const timeline=data.lineupStints.some(r=>r.period)?'<details class="caImport"><summary>הרכבים במהלך המשחק · PBP stint timeline</summary><div class="playerScroll"><table class="stats"><tr><th>Team / five players</th><th>Period</th><th>From</th><th>To</th><th>MIN</th><th>PF</th><th>PA</th><th>+/-</th></tr>'+data.lineupStints.map(r=>'<tr><td>'+esc(name(r.side))+'<br>'+esc(r.players.join(" · "))+'</td><td>'+esc(r.period<=4?"Q"+r.period:"OT"+(r.period-4))+'</td><td>'+esc(r.startClock)+'</td><td>'+esc(r.endClock)+'</td><td>'+fmt(r.seconds/60)+'</td><td>'+r.pointsFor+'</td><td>'+r.pointsAgainst+'</td><td>'+(r.pointsFor-r.pointsAgainst)+'</td></tr>').join("")+'</table></div></details>':"";
    const audit=quality?.playerMinutes?.length?'<details class="caImport"><summary>Player minutes · PBP vs imported box score</summary><div class="playerScroll"><table class="stats"><tr><th>Player</th><th>Team</th><th>PBP MIN</th><th>Box MIN</th><th>Difference</th></tr>'+quality.playerMinutes.map(p=>'<tr><td>'+esc(p.player)+'</td><td>'+esc(name(p.side))+'</td><td>'+fmt(p.pbp,2)+'</td><td>'+fmt(p.box,2)+'</td><td>'+fmt(p.delta,2)+'</td></tr>').join("")+'</table></div></details>':"";
    const options=list=>list.map(r=>'<option value="'+esc(r.id)+'">'+esc(name(r.side)+" · "+r.players.join(" / ")+" · "+fmt(r.minutes)+" min")+'</option>').join("");
    const controls='<div class="caControls"><label>Team<select class="caTeam"><option value="">Both teams</option><option value="home">'+esc(G.home)+'</option><option value="away">'+esc(G.away)+'</option></select></label><label>Minimum minutes<input class="caMin" type="number" min="0" step="0.5" value="0"></label><label>Lineup A<select class="caA"></select></label><label>Lineup B<select class="caB"></select></label></div>';
    lineupRoot.innerHTML=provenance+qa+controls+'<div class="caComparison"></div><div class="caLineupTable"></div><p class="metricNote">+/- = points scored minus points allowed during measured shared minutes. ORtg / DRtg use supplied offensive / defensive possessions; eFG% uses supplied field-goal totals. Missing denominators remain —. Samples are descriptive; small samples can be unstable.</p>'+timeline+audit+uploadBox();
    const drawLineups=()=>{
      const side=lineupRoot.querySelector(".caTeam").value,min=Math.max(0,Number(lineupRoot.querySelector(".caMin").value)||0),list=rows.filter(r=>(!side||r.side===side)&&r.minutes>=min);
      const a=lineupRoot.querySelector(".caA"),b=lineupRoot.querySelector(".caB"),oldA=a.value,oldB=b.value;
      a.innerHTML=options(list);b.innerHTML=options(list);if(list.some(r=>r.id===oldA))a.value=oldA;if(list.some(r=>r.id===oldB))b.value=oldB;else if(list.length>1)b.selectedIndex=1;
      const table=lineupRoot.querySelector(".caLineupTable");
      table.innerHTML=list.length?'<div class="playerScroll"><table class="stats"><thead><tr><th>Team / five players</th><th>MIN</th><th>Stints</th><th>PF</th><th>PA</th><th>+/-</th><th>Off poss.</th><th>Def poss.</th><th>ORtg</th><th>DRtg</th><th>Net</th><th>eFG%</th><th>TOV</th></tr></thead><tbody>'+list.map(r=>'<tr><td>'+esc(name(r.side))+'<br>'+esc(r.players.join(" · "))+'</td>'+[fmt(r.minutes),r.stints,r.pointsFor,r.pointsAgainst,r.plusMinus,r.possessions??"—",r.opponentPossessions??"—",fmt(r.ortg),fmt(r.drtg),fmt(r.net),fmt(r.efg),r.tov??"—"].map(v=>'<td>'+v+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>':'<div class="emptyView"><b>'+(!rows.length?"אין נתוני הרכבים משותפים · No measured lineup data":"No lineups match these filters")+'</b><span>Lineup comparison needs substitution / on-court intervals and score changes. Starting-five box-score totals do not provide shared minutes. Import tagged stints above when the source does not supply them.</span></div>';
      a.disabled=b.disabled=!list.length;
      const compare=()=>{
        const A=list.find(r=>r.id===a.value),B=list.find(r=>r.id===b.value),out=lineupRoot.querySelector(".caComparison");
        if(!A||!B){out.innerHTML="";return;}
        const metrics=[["Minutes","minutes"],["Stints","stints"],["Points for","pointsFor"],["Points against","pointsAgainst"],["+/-","plusMinus"],["ORtg","ortg"],["DRtg","drtg"],["Net Rating","net"],["eFG%","efg"]];
        out.innerHTML='<h3>Lineup A vs Lineup B</h3>'+(A.id===B.id?'<p>Select a different Lineup B to compare two lineups.</p>':'')+'<div class="playerScroll"><table class="stats"><tr><th>Metric</th><th>A · '+esc(A.players.join(" / "))+'</th><th>B · '+esc(B.players.join(" / "))+'</th><th>A − B</th></tr>'+metrics.map(([label,k])=>'<tr><td>'+label+'</td><td>'+fmt(A[k])+'</td><td>'+fmt(B[k])+'</td><td>'+fmt(A[k]!=null&&B[k]!=null?A[k]-B[k]:null)+'</td></tr>').join("")+'</table></div>';
      };a.onchange=b.onchange=compare;compare();
    };
    lineupRoot.querySelector(".caTeam").onchange=lineupRoot.querySelector(".caMin").oninput=drawLineups;drawLineups();
    const shotLineups=new Map();data.shots.filter(s=>s.lineup).forEach(s=>shotLineups.set(s.side+":"+key(s.lineup),{id:s.side+":"+key(s.lineup),side:s.side,players:[...s.lineup].sort(),minutes:0}));
    shotRoot.innerHTML=provenance+'<div class="caControls"><label>Team<select class="caShotTeam"><option value="">Both teams</option><option value="home">'+esc(G.home)+'</option><option value="away">'+esc(G.away)+'</option></select></label><label>Player<select class="caPlayer"></select></label><label>Period<select class="caPeriod"><option value="">All periods</option>'+[...new Set(data.shots.map(s=>s.period))].sort((a,b)=>a-b).map(p=>'<option value="'+p+'">'+(p<=4?"Q"+p:"OT"+(p-4))+'</option>').join("")+'</select></label><label>Result<select class="caResult"><option value="">All attempts</option><option value="made">Made</option><option value="missed">Missed</option></select></label><label>On-court lineup<select class="caShotLineup"><option value="">All / untagged lineups</option>'+options([...shotLineups.values()])+'</select></label></div><div class="caShotOutput"></div><p class="metricNote">Green ● made · Pink × missed. Percentages describe located, filtered shots only. Compare sample size with the official FGA before treating this as a full-game chart. A lineup filter requires lineup tags on individual shots.</p>'+uploadBox();
    const fillPlayers=()=>{const select=shotRoot.querySelector(".caPlayer"),old=select.value,side=shotRoot.querySelector(".caShotTeam").value,names=[...new Set(data.shots.filter(s=>!side||s.side===side).map(s=>s.player))].sort();select.innerHTML='<option value="">All players</option>'+names.map(p=>'<option>'+esc(p)+'</option>').join("");if(names.includes(old))select.value=old;};
    const drawShots=()=>{
      const f={side:shotRoot.querySelector(".caShotTeam").value,player:shotRoot.querySelector(".caPlayer").value,period:shotRoot.querySelector(".caPeriod").value,result:shotRoot.querySelector(".caResult").value,lineup:shotRoot.querySelector(".caShotLineup").value},shots=filterShots(data.shots,f),s=summary(shots);
      shotRoot.querySelector(".caShotOutput").innerHTML='<div class="caShotLayout"><div>'+court(shots)+'</div><div><h3>Located shot sample</h3><p><b>'+s.fgm+'/'+s.fga+' FG</b> · FG% '+fmt(s.fg)+' · eFG% '+fmt(s.efg)+' · '+s.points+' field-goal points</p>'+(!shots.length?'<div class="emptyView"><b>'+(!data.shots.length?"אין מיקומי זריקות · Shot locations unavailable":"No shots match these filters")+'</b><span>Shot Chart requires measured coordinates for each attempt. A box score cannot reveal shot locations. Import tagged shots to populate this court.</span></div>':'')+'<div class="playerScroll caShotList"><table class="stats"><tr><th>Team / player</th><th>Period / clock</th><th>Shot</th></tr>'+shots.map(s=>'<tr><td>'+esc(name(s.side))+' / '+esc(s.player)+'</td><td>Q'+s.period+' '+esc(s.clock)+'</td><td>'+s.value+'PT '+(s.made?"Made":"Missed")+'</td></tr>').join("")+'</table></div></div></div>';
    };fillPlayers();drawShots();
    shotRoot.querySelector(".caShotTeam").onchange=()=>{fillPlayers();drawShots();};
    [".caPlayer",".caPeriod",".caResult",".caShotLineup"].forEach(s=>shotRoot.querySelector(s).onchange=drawShots);
    [lineupRoot,shotRoot].forEach(el=>{
      el.querySelector(".caFile").onchange=async e=>{
        const file=e.target.files[0],status=el.querySelector(".caStatus");if(!file)return;
        try{if(file.size>4*1024*1024)throw Error("Choose JSON smaller than 4 MB.");const next=validate(JSON.parse(await file.text()));root.localStorage.setItem(storageKey(G),JSON.stringify(next));mount(G);}catch(err){status.textContent="Import failed: "+err.message;}
      };
      el.querySelector(".caExport").onclick=()=>saveFile(G,data);
      el.querySelector(".caClear").onclick=()=>{try{root.localStorage.removeItem(storageKey(G));mount(G);}catch(e){el.querySelector(".caStatus").textContent=e.message;}};
    });
  }
  const api={validate,aggregate,filterShots,summary,render,mount,dataset,court};
  root.CourtIQCourtAnalytics=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
