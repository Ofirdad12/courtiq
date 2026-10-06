/* CourtIQ Live Coach Intelligence v178 · evidence-first in-game alerts and conclusions. */
(function(root){
  'use strict';
  const other=s=>s==='home'?'away':'home';
  const num=v=>{const n=Number(String(v??'').replace(/%$/,''));return Number.isFinite(n)?n:null;};
  const round=v=>Math.round(Number(v||0)*10)/10;
  const norm=v=>String(v??'').normalize('NFKC').replace(/[׳’'`".]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const eventList=G=>Array.isArray(G?.playByPlay)?G.playByPlay:Array.isArray(G?.play_by_play)?G.play_by_play:[];
  const clockSeconds=v=>{const m=String(v||'').match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
  const parseScore=v=>{const m=String(v||'').match(/(\d+)\s*[-:–]\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:null;};
  const factorMap=G=>Object.fromEntries((G?.factors||[]).filter(Array.isArray).map(r=>[r[0],{home:num(r[1]),away:num(r[2])}]));
  const teamRaw=(G,side)=>G?.raw?.[side]||{};
  const players=(G,side)=>Array.isArray(G?.players?.[side])?G.players[side]:[];
  const playerKey=p=>norm(p?.name||p?.player||p?.id||'');
  const fga=p=>Number(p?.fga ?? (Number(p?.two_pa||0)+Number(p?.three_pa||0)));
  const rebounds=p=>Number(p?.rebounds ?? (Number(p?.oreb||0)+Number(p?.dreb||0)));
  const playerTs=p=>num(p?.ts);
  const playerEfg=p=>num(p?.efg);
  const sideName=(G,s)=>G?.[s]||s;
  const severityRank={URGENT:3,ATTENTION:2,WATCH:1,INFO:0,OPPORTUNITY:0};

  function latestEvent(G){
    return eventList(G).map((e,i)=>({...e,_i:i,_s:clockSeconds(e.clock)})).filter(e=>Number(e.period)>0&&e._s!=null)
      .sort((a,b)=>Number(b.period)-Number(a.period)||a._s-b._s||b._i-a._i)[0]||null;
  }
  function scoreOrientation(G){
    const rows=eventList(G).map(e=>parseScore(e.score)).filter(Boolean);if(!rows.length)return null;
    const last=rows[rows.length-1],hs=num(G?.hs),as=num(G?.as);if(hs==null||as==null)return null;
    if(last[0]===hs&&last[1]===as)return 0;if(last[1]===hs&&last[0]===as)return 1;return null;
  }
  const orientScore=(pair,o)=>!pair?null:o===1?[pair[1],pair[0]]:o===0?pair:null;
  function recentRun(G,minutes=5){
    const latest=latestEvent(G),orientation=scoreOrientation(G);if(!latest||orientation==null)return null;
    const period=Number(latest.period),now=clockSeconds(latest.clock);if(now==null)return null;
    const duration=period<=4?600:300,target=Math.min(duration,now+minutes*60);
    const rows=eventList(G).filter(e=>Number(e.period)===period&&parseScore(e.score)&&clockSeconds(e.clock)!=null)
      .map(e=>({sec:clockSeconds(e.clock),score:orientScore(parseScore(e.score),orientation)}));
    if(!rows.length)return null;
    const current=orientScore(parseScore(latest.score),orientation)||[num(G.hs)||0,num(G.as)||0];
    const candidates=rows.filter(x=>x.sec>=target).sort((a,b)=>a.sec-b.sec);
    const base=(candidates[0]||[...rows].sort((a,b)=>b.sec-a.sec)[0])?.score;if(!base)return null;
    return {period,minutes:round((Math.min(target,duration)-now)/60),home:current[0]-base[0],away:current[1]-base[1],current,base};
  }
  function isTurnoverEvent(e){
    const t=norm(e?.type||e?.actionType||e?.action||'').replace(/[-_\s]/g,''),d=norm(e?.description||'');
    return ['to','tov','turnover'].includes(t)||t.includes('turnover')||/איבוד כדור|turnover/.test(d);
  }
  function rollingEvents(G,side,minutes,predicate){
    const latest=latestEvent(G);if(!latest)return [];
    const now=clockSeconds(latest.clock),period=Number(latest.period);if(now==null||!period)return [];
    const max=now+minutes*60;
    return eventList(G).filter(e=>Number(e.period)===period&&e.side===side&&clockSeconds(e.clock)!=null&&clockSeconds(e.clock)>=now&&clockSeconds(e.clock)<=max&&predicate(e));
  }
  function playerDeltas(prevG,G,side){
    const before=new Map(players(prevG,side).map(p=>[playerKey(p),p]));
    return players(G,side).map(p=>{
      const b=before.get(playerKey(p))||{};
      return {player:p,points:Number(p.points||0)-Number(b.points||0),tov:Number(p.tov||0)-Number(b.tov||0),ast:Number(p.ast||0)-Number(b.ast||0),reb:rebounds(p)-rebounds(b),minutes:round(Number(p.minutes||0)-Number(b.minutes||0))};
    });
  }
  function sampleLabel(G){const e=latestEvent(G);return e?`${Number(e.period)>4?'OT'+(Number(e.period)-4):'Q'+e.period} ${e.clock||'—'}`:'live snapshot';}
  function pushUnique(list,item){if(!list.some(x=>x.key===item.key))list.push(item);}

  function alerts(G,focus='home',prevG=null){
    const opp=other(focus),f=factorMap(G),rawO=teamRaw(G,opp),out=[];
    const run=recentRun(G,5);
    if(run){const fp=run[focus],op=run[opp],gap=op-fp;if(op>=8&&gap>=8)pushUnique(out,{key:'opponent-run',severity:gap>=10?'URGENT':'ATTENTION',scope:'team',title:`${sideName(G,opp)} run`,evidence:`${op}-${fp} over the current ~${run.minutes} min window`,coachCheck:'Stop the next dead ball from becoming a generic timeout: identify whether the run is driven by turnovers, offensive rebounds or shot quality before changing coverage.'});}
    const tos=rollingEvents(G,focus,3,isTurnoverEvent);
    if(tos.length>=2)pushUnique(out,{key:'turnover-burst',severity:tos.length>=3?'URGENT':'ATTENTION',scope:'team',title:'Turnover burst',evidence:`${tos.length} turnovers in the current ~3-minute PBP window`,coachCheck:'Classify each turnover: pressure, passing read, handle, offensive foul or spacing. Protect the next two possessions before adding tactical complexity.'});
    const oppOrb=f['ORB%']?.[opp],ourOrb=f['ORB%']?.[focus];
    if(oppOrb!=null&&ourOrb!=null&&Number(rawO.oreb||0)>=3&&oppOrb>=35&&oppOrb-ourOrb>=7)pushUnique(out,{key:'defensive-glass',severity:oppOrb>=42&&oppOrb-ourOrb>=10?'URGENT':'ATTENTION',scope:'team',title:'Defensive glass under pressure',evidence:`Opponent ORB% ${round(oppOrb)}% vs ${round(ourOrb)}% · ${Number(rawO.oreb||0)} OREB`,coachCheck:'Verify who is crashing, who is responsible for first contact, and whether long rebounds are coming from the shot profile.'});
    const oppEfg=f['eFG%']?.[opp],ourEfg=f['eFG%']?.[focus],oppFga=Number(rawO.two_pa||0)+Number(rawO.three_pa||0);
    if(oppEfg!=null&&ourEfg!=null&&oppFga>=8&&oppEfg>=60&&oppEfg-ourEfg>=8)pushUnique(out,{key:'shot-efficiency',severity:oppEfg>=68&&oppFga>=12?'ATTENTION':'WATCH',scope:'team',title:'Opponent shooting efficiency spike',evidence:`Opponent eFG% ${round(oppEfg)}% on ${oppFga} FGA`,coachCheck:'Separate rim attempts/open catch-and-shoots from difficult makes. Only the first group justifies an immediate coverage adjustment.'});
    const oppFtr=f['FTr']?.[opp],ourFtr=f['FTr']?.[focus];
    if(oppFtr!=null&&ourFtr!=null&&Number(rawO.fta||0)>=6&&oppFtr>=35&&oppFtr-ourFtr>=10)pushUnique(out,{key:'foul-pressure',severity:'WATCH',scope:'team',title:'Free-throw pressure',evidence:`Opponent FTr ${round(oppFtr)}% · ${Number(rawO.fta||0)} FTA`,coachCheck:'Check which defenders/actions are producing the attempts before changing matchups or help rules.'});
    if(prevG){
      for(const d of playerDeltas(prevG,G,focus)){
        const name=d.player?.name||'Player';
        if(d.tov>=2)pushUnique(out,{key:'player-tov-'+playerKey(d.player),severity:'URGENT',scope:'player',player:name,title:`${name}: turnover burst`,evidence:`+${d.tov} turnovers since the previous valid snapshot`,coachCheck:'Stabilize the next decision: simplify the read, change the initiator, or use a lower-risk entry until the cause is verified.'});
        else if(d.points>=5)pushUnique(out,{key:'player-score-'+playerKey(d.player),severity:'ATTENTION',scope:'player',player:name,title:`${name}: scoring burst`,evidence:`+${d.points} points since the previous valid snapshot`,coachCheck:'Identify the repeatable action behind the burst before calling it again; distinguish created advantage from difficult-shot variance.'});
      }
    }
    return out.sort((a,b)=>(severityRank[b.severity]||0)-(severityRank[a.severity]||0)).slice(0,6);
  }

  function teamConclusions(G,focus='home'){
    const opp=other(focus),f=factorMap(G),rawF=teamRaw(G,focus),rawO=teamRaw(G,opp),rows=[],run=recentRun(G,5);
    const add=(key,level,title,evidence,coachCheck)=>pushUnique(rows,{key,level,title,evidence,coachCheck,sample:sampleLabel(G)});
    if(run){const fp=run[focus],op=run[opp];if(Math.abs(fp-op)>=6)add('run','ATTENTION',fp>op?'Current run favors us':'Current run favors opponent',`${sideName(G,focus)} ${fp} · ${sideName(G,opp)} ${op} in ~${run.minutes} min`,'Use the run as a trigger to inspect possession quality, not as proof of a tactical cause.');}
    const tovF=f['TOV%']?.[focus],tovO=f['TOV%']?.[opp];
    if(tovF!=null&&tovO!=null&&tovF-tovO>=4)add('tov','ATTENTION','Possession efficiency is being lost to turnovers',`${round(tovF)}% TOV% vs ${round(tovO)}% · ${Number(rawF.tov||0)} turnovers`,'Reduce preventable live-ball mistakes first; classify the turnover types before changing spacing or ball-screen structure.');
    else if(tovF!=null&&tovO!=null&&tovO-tovF>=4)add('tov-positive','OPPORTUNITY','Ball security advantage',`${round(tovF)}% TOV% vs ${round(tovO)}%`,'Keep the decision environment simple and test whether pressure can continue creating opponent mistakes without over-gambling.');
    const orbF=f['ORB%']?.[focus],orbO=f['ORB%']?.[opp];
    if(orbF!=null&&orbO!=null&&orbO-orbF>=6&&Number(rawO.oreb||0)>=3)add('orb','ATTENTION','Opponent is extending possessions',`${round(orbO)}% ORB% vs ${round(orbF)}% · ${Number(rawO.oreb||0)} opponent OREB`,'Assign first contact and track the specific crashers. Do not infer effort from the percentage alone.');
    else if(orbF!=null&&orbO!=null&&orbF-orbO>=7&&Number(rawF.oreb||0)>=3)add('orb-positive','OPPORTUNITY','Second-possession advantage',`${round(orbF)}% ORB% vs ${round(orbO)}% · ${Number(rawF.oreb||0)} OREB`,'Check whether the advantage is repeatable by matchup/shot location before increasing crash numbers.');
    const efgF=f['eFG%']?.[focus],efgO=f['eFG%']?.[opp],fgaF=Number(rawF.two_pa||0)+Number(rawF.three_pa||0),fgaO=Number(rawO.two_pa||0)+Number(rawO.three_pa||0);
    if(efgF!=null&&efgO!=null&&fgaO>=8&&efgO-efgF>=7)add('efg','ATTENTION','Shot-value conversion favors opponent',`${round(efgF)}% vs ${round(efgO)}% eFG%`,'Verify rim/open-three frequency versus difficult makes before adjusting coverage.');
    else if(efgF!=null&&efgO!=null&&fgaF>=8&&efgF-efgO>=7)add('efg-positive','OPPORTUNITY','Shot-value conversion favors us',`${round(efgF)}% vs ${round(efgO)}% eFG%`,'Identify which shot types are sustainable and keep generating those rather than protecting the percentage.');
    const ftrF=f['FTr']?.[focus],ftrO=f['FTr']?.[opp];
    if(ftrF!=null&&ftrO!=null&&Number(rawO.fta||0)>=6&&ftrO-ftrF>=10)add('ftr','WATCH','Opponent is generating more free throws',`${round(ftrO)}% vs ${round(ftrF)}% FTr · ${Number(rawO.fta||0)} opponent FTA`,'Audit foul source by defender and action; avoid blanket instructions without the possession context.');
    if(!rows.length)add('steady','INFO','No single team signal is large enough to drive a change','Current live factors are within the alert thresholds.','Keep the current plan and use the next timeout to verify shot quality, turnover type and rebound assignments.');
    return rows.slice(0,3);
  }

  function playerConclusions(G,focus='home',prevG=null){
    const rows=[],deltas=prevG?new Map(playerDeltas(prevG,G,focus).map(d=>[playerKey(d.player),d])):new Map();
    const add=(p,key,level,title,evidence,coachCheck,score)=>rows.push({key:key+'-'+playerKey(p),player:p.name||'Player',level,title,evidence,coachCheck,score:Number(score||0),sample:`${round(Number(p.minutes||0))} min live sample`});
    for(const p of players(G,focus)){
      const mins=Number(p.minutes||0),pts=Number(p.points||0),to=Number(p.tov||0),ast=Number(p.ast||0),oreb=Number(p.oreb||0),attempts=fga(p),ts=playerTs(p),efg=playerEfg(p),d=deltas.get(playerKey(p));
      if(d?.tov>=2)add(p,'recent-tov','URGENT','Recent turnover burst',`+${d.tov} TOV since previous snapshot`,'Simplify the next read or change the initiator until the cause is verified.',95+d.tov);
      else if(d?.points>=5)add(p,'recent-score','OPPORTUNITY','Recent scoring burst',`+${d.points} PTS since previous snapshot`,'Identify the repeatable action behind the burst and test it again before the defense adjusts.',75+d.points);
      if(to>=3&&mins>=5)add(p,'turnovers','ATTENTION','Ball-security burden',`${to} TOV · ${ast} AST in ${round(mins)} min`,'Review turnover types and consider reducing high-risk creation possessions if the same error repeats.',82+to);
      if(attempts>=4&&pts>=8&&((ts!=null&&ts>=60)||(efg!=null&&efg>=60)))add(p,'efficient-score','OPPORTUNITY','Efficient scoring contribution',`${pts} PTS · ${attempts} FGA · ${ts!=null?round(ts)+'% TS':round(efg)+'% eFG'}`,'Keep feeding the repeatable shot source; do not assume every make represents good process.',65+pts/2);
      if(attempts>=5&&((ts!=null&&ts<=42)||(efg!=null&&efg<=38)))add(p,'low-efficiency','WATCH','Low conversion on current attempts',`${pts} PTS · ${attempts} FGA · ${ts!=null?round(ts)+'% TS':round(efg)+'% eFG'}`,'Check shot quality and role before reducing touches; misses alone are not enough evidence.',55+attempts);
      if(ast>=4&&to<=1&&mins>=8)add(p,'playmaking','OPPORTUNITY','Clean playmaking line',`${ast} AST · ${to} TOV`,'Keep the player in clear decision-making actions while verifying assist quality from the PBP/video.',50+ast);
      if(oreb>=3&&mins>=5)add(p,'oreb','OPPORTUNITY','Offensive-rebound impact',`${oreb} OREB in ${round(mins)} min`,'Identify where those rebounds are coming from before adding extra crash responsibility.',45+oreb);
    }
    const seen=new Set(),out=[];
    rows.sort((a,b)=>(severityRank[b.level]||0)-(severityRank[a.level]||0)||b.score-a.score);
    for(const row of rows){if(seen.has(row.player))continue;seen.add(row.player);out.push(row);if(out.length===4)break;}
    if(!out.length){
      const top=[...players(G,focus)].filter(p=>Number(p.minutes||0)>0).sort((a,b)=>Number(b.points||0)-Number(a.points||0))[0];
      if(top)out.push({key:'player-baseline-'+playerKey(top),player:top.name||'Player',level:'INFO',title:'No player alert threshold crossed',evidence:`${Number(top.points||0)} PTS · ${round(Number(top.minutes||0))} min`,coachCheck:'Use role, matchup and possession quality before making an individual adjustment.',score:0,sample:`${round(Number(top.minutes||0))} min live sample`});
    }
    return out;
  }

  function coachBrief(G,focus='home',prevG=null){return {alerts:alerts(G,focus,prevG),team:teamConclusions(G,focus),players:playerConclusions(G,focus,prevG),generated_at:new Date().toISOString(),focus,method:'LIVE DATA SIGNALS · NOT CAUSAL INFERENCE'};}

  const api={clockSeconds,parseScore,eventList,latestEvent,recentRun,isTurnoverEvent,rollingEvents,playerDeltas,alerts,teamConclusions,playerConclusions,coachBrief};
  root.CourtIQLiveCoachIntelligence=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
