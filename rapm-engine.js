/* CourtIQ RAPM Engine
 * Possession-aware ridge adjusted plus-minus.
 * Publishes RAPM only from paired 5v5 lineup stints with explicit possession counts.
 */
(function(root){
  'use strict';
  const VERSION='1.0.0';
  const finite=v=>Number.isFinite(Number(v))?Number(v):null;
  const norm=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();
  const clock=v=>{const m=String(v??'').match(/^(\d{1,2}):([0-5]\d)$/);return m?Number(m[1])*60+Number(m[2]):null;};
  const pkey=(team,name)=>norm(team)+'::'+norm(name);
  const validFive=v=>Array.isArray(v)&&v.length===5&&v.every(x=>norm(x))&&new Set(v.map(norm)).size===5;

  function payload(row){
    const p=row?.payload;
    if(!p)return row||{};
    if(typeof p==='string'){try{return {...row,...JSON.parse(p)}}catch(_){return row||{}}}
    return {...row,...p};
  }

  function periodLength(period){return Number(period)<=4?600:300;}
  function intervalKey(stint){return [stint.period,stint.startClock,stint.endClock].join('|');}

  function normalizePairedStint(stint,game,gameId){
    const home=game.home||game.home_team||'Home';
    const away=game.away||game.away_team||'Away';
    const homePlayers=stint.homePlayers||stint.home_players||stint.homeLineup||stint.home_lineup;
    const awayPlayers=stint.awayPlayers||stint.away_players||stint.awayLineup||stint.away_lineup;
    const homePoints=finite(stint.homePoints??stint.home_points??stint.pointsHome??stint.points_home);
    const awayPoints=finite(stint.awayPoints??stint.away_points??stint.pointsAway??stint.points_away);
    const homePossessions=finite(stint.homePossessions??stint.home_possessions??stint.possessionsHome??stint.possessions_home);
    const awayPossessions=finite(stint.awayPossessions??stint.away_possessions??stint.possessionsAway??stint.possessions_away);
    const seconds=finite(stint.seconds??stint.durationSeconds??stint.duration_seconds);
    if(!validFive(homePlayers)||!validFive(awayPlayers)||homePoints==null||awayPoints==null||homePossessions==null||awayPossessions==null||homePossessions<=0||awayPossessions<=0)return null;
    return {
      gameId:String(gameId??game.id??''),
      period:finite(stint.period),seconds,
      homeTeam:home,awayTeam:away,
      homePlayers:homePlayers.map(name=>pkey(home,name)),awayPlayers:awayPlayers.map(name=>pkey(away,name)),
      homeLabels:homePlayers.map(norm),awayLabels:awayPlayers.map(norm),
      homePoints,awayPoints,homePossessions,awayPossessions
    };
  }

  function fromSideStints(stints,game,gameId){
    if(!Array.isArray(stints)||!stints.length)return [];
    const byKey=new Map();
    for(const s of stints){
      if(!s||!['home','away'].includes(s.side)||!validFive(s.players))continue;
      const key=intervalKey(s);if(!byKey.has(key))byKey.set(key,{});byKey.get(key)[s.side]=s;
    }
    const home=game.home||game.home_team||'Home',away=game.away||game.away_team||'Away',out=[];
    for(const pair of byKey.values()){
      const h=pair.home,a=pair.away;if(!h||!a)continue;
      const hp=finite(h.possessions),ap=finite(a.possessions);
      const hpa=finite(h.pointsAgainst),apa=finite(a.pointsAgainst);
      const consistent=finite(h.pointsFor)!=null&&finite(a.pointsFor)!=null&&hpa!=null&&apa!=null&&Math.abs(finite(h.pointsFor)-apa)<1e-9&&Math.abs(finite(a.pointsFor)-hpa)<1e-9;
      if(!consistent||hp==null||ap==null||hp<=0||ap<=0)continue;
      const seconds=Math.min(finite(h.seconds)??Infinity,finite(a.seconds)??Infinity);
      out.push({
        gameId:String(gameId??game.id??''),period:finite(h.period),seconds:Number.isFinite(seconds)?seconds:null,
        homeTeam:home,awayTeam:away,
        homePlayers:h.players.map(name=>pkey(home,name)),awayPlayers:a.players.map(name=>pkey(away,name)),
        homeLabels:h.players.map(norm),awayLabels:a.players.map(norm),
        homePoints:finite(h.pointsFor),awayPoints:finite(a.pointsFor),homePossessions:hp,awayPossessions:ap
      });
    }
    return out;
  }

  function extractGame(row){
    const game=payload(row),gameId=row?.id??game.id??game.external_id??'';
    const direct=game.rapmStints||game.rapm_stints||game.possessionStints||game.possession_stints||game.pairedLineupStints||game.paired_lineup_stints;
    if(Array.isArray(direct))return direct.map(s=>normalizePairedStint(s,game,gameId)).filter(Boolean);
    const side=game.lineupStints||game.lineup_stints||game._lineups;
    if(Array.isArray(side))return fromSideStints(side,game,gameId);
    if(root.CourtIQLineupEngine?.derive){
      try{return fromSideStints(root.CourtIQLineupEngine.derive(game)?.lineupStints||[],game,gameId);}catch(_){return [];}
    }
    return [];
  }

  function extractGames(rows){
    const stints=[],coverage={games:0,gamesWithAnyLineups:0,gamesWithPossessionStints:0,pairedStints:0,totalPossessions:0};
    for(const row of rows||[]){
      const game=payload(row);coverage.games++;
      let any=false;
      if(Array.isArray(game.rapmStints||game.rapm_stints||game.possessionStints||game.possession_stints||game.pairedLineupStints||game.paired_lineup_stints))any=true;
      else if(Array.isArray(game.lineupStints||game.lineup_stints||game._lineups)&&(game.lineupStints||game.lineup_stints||game._lineups).length)any=true;
      else if(root.CourtIQLineupEngine?.derive){try{any=(root.CourtIQLineupEngine.derive(game)?.lineupStints||[]).length>0}catch(_){}}
      if(any)coverage.gamesWithAnyLineups++;
      const rowsForGame=extractGame(row);
      if(rowsForGame.length)coverage.gamesWithPossessionStints++;
      stints.push(...rowsForGame);
    }
    coverage.pairedStints=stints.length;
    coverage.totalPossessions=stints.reduce((s,x)=>s+x.homePossessions+x.awayPossessions,0);
    return {stints,coverage};
  }

  function observations(stints){
    const obs=[],labels=new Map();
    for(const s of stints||[]){
      if(!validFive(s.homePlayers)||!validFive(s.awayPlayers))continue;
      (s.homePlayers||[]).forEach((id,i)=>labels.set(id,s.homeLabels?.[i]||id.split('::').at(-1)));
      (s.awayPlayers||[]).forEach((id,i)=>labels.set(id,s.awayLabels?.[i]||id.split('::').at(-1)));
      if(s.homePossessions>0)obs.push({gameId:s.gameId,offense:s.homePlayers,defense:s.awayPlayers,possessions:s.homePossessions,points:s.homePoints,rate:100*s.homePoints/s.homePossessions});
      if(s.awayPossessions>0)obs.push({gameId:s.gameId,offense:s.awayPlayers,defense:s.homePlayers,possessions:s.awayPossessions,points:s.awayPoints,rate:100*s.awayPoints/s.awayPossessions});
    }
    return {obs,labels};
  }

  function solve(A,b){
    const n=A.length,M=A.map((row,i)=>row.slice().concat([b[i]]));
    for(let col=0;col<n;col++){
      let pivot=col;for(let r=col+1;r<n;r++)if(Math.abs(M[r][col])>Math.abs(M[pivot][col]))pivot=r;
      if(Math.abs(M[pivot][col])<1e-10)continue;
      [M[col],M[pivot]]=[M[pivot],M[col]];
      const d=M[col][col];for(let c=col;c<=n;c++)M[col][c]/=d;
      for(let r=0;r<n;r++)if(r!==col){const f=M[r][col];if(!f)continue;for(let c=col;c<=n;c++)M[r][c]-=f*M[col][c];}
    }
    return M.map((row,i)=>Math.abs(row[i])<1e-8?0:row[n]);
  }

  function fit(stints,options={}){
    const lambda=finite(options.lambda)??250;
    const minGames=finite(options.minGames)??8,minStints=finite(options.minStints)??30,minPossessions=finite(options.minPossessions)??700;
    const {obs,labels}=observations(stints),games=new Set(obs.map(o=>o.gameId).filter(Boolean));
    const totalPossessions=obs.reduce((s,o)=>s+o.possessions,0);
    const reasons=[];
    if(games.size<minGames)reasons.push(`Need at least ${minGames} games with possession-certified lineup stints.`);
    if((stints||[]).length<minStints)reasons.push(`Need at least ${minStints} paired lineup stints.`);
    if(totalPossessions<minPossessions)reasons.push(`Need at least ${minPossessions} offensive possessions across the model sample.`);
    if(obs.length<20)reasons.push('Too few offensive/defensive observations for a stable ridge fit.');
    const players=[...new Set(obs.flatMap(o=>o.offense.concat(o.defense)))].sort();
    if(players.length<10)reasons.push('Need at least 10 distinct players in the model sample.');
    if(reasons.length&&!options.force)return {status:'NOT_READY',reasons,coverage:{games:games.size,stints:(stints||[]).length,observations:obs.length,totalPossessions,players:players.length},players:[],diagnostics:null};

    const index=new Map(players.map((p,i)=>[p,i])),N=players.length,P=1+2*N;
    const A=Array.from({length:P},()=>Array(P).fill(0)),b=Array(P).fill(0);
    const support=new Map(players.map(p=>[p,{offPoss:0,defPoss:0,stints:0,games:new Set()}]));
    for(const o of obs){
      const x=Array(P).fill(0);x[0]=1;
      for(const p of o.offense){x[1+index.get(p)]=1;const s=support.get(p);s.offPoss+=o.possessions;s.stints++;s.games.add(o.gameId);}
      for(const p of o.defense){x[1+N+index.get(p)]=1;const s=support.get(p);s.defPoss+=o.possessions;s.stints++;s.games.add(o.gameId);}
      const w=o.possessions;
      for(let i=0;i<P;i++)if(x[i]){b[i]+=w*x[i]*o.rate;for(let j=0;j<P;j++)if(x[j])A[i][j]+=w*x[i]*x[j];}
    }
    for(let i=1;i<P;i++)A[i][i]+=lambda;
    A[0][0]+=1e-8;
    const beta=solve(A,b),intercept=beta[0]||0;
    let sse=0,ws=0;
    for(const o of obs){let pred=intercept;for(const p of o.offense)pred+=beta[1+index.get(p)]||0;for(const p of o.defense)pred+=beta[1+N+index.get(p)]||0;const e=o.rate-pred;sse+=o.possessions*e*e;ws+=o.possessions;}
    const result=players.map((id,i)=>{
      const sup=support.get(id),off=beta[1+i]||0,defAllowed=beta[1+N+i]||0,def=-defAllowed,total=off+def;
      const poss=Math.min(sup.offPoss,sup.defPoss),volume=Math.min(1,poss/1200),variety=Math.min(1,sup.games.size/15),confidence=Math.round(100*Math.sqrt(volume*variety));
      const [team,...nameParts]=id.split('::');
      return {id,name:labels.get(id)||nameParts.join('::')||id,team,oRAPM:off,dRAPM:def,totalRAPM:total,offPossessions:sup.offPoss,defPossessions:sup.defPoss,stints:sup.stints,games:sup.games.size,confidence,confidenceBand:confidence>=75?'HIGH':confidence>=50?'MEDIUM':'LOW'};
    }).sort((a,b)=>b.totalRAPM-a.totalRAPM);
    return {status:'READY',reasons:[],players:result,coverage:{games:games.size,stints:(stints||[]).length,observations:obs.length,totalPossessions,players:players.length},diagnostics:{lambda,intercept,weightedRMSE:ws?Math.sqrt(sse/ws):null,scale:'points per 100 possessions',defenseSign:'positive D-RAPM = fewer points allowed',version:VERSION}};
  }

  function fitGames(rows,options={}){const extracted=extractGames(rows);const model=fit(extracted.stints,options);return {...model,sourceCoverage:extracted.coverage};}
  const api={version:VERSION,payload,extractGame,extractGames,observations,fit,fitGames};
  root.CourtIQRAPM=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);