/* CourtIQ RAPM ↔ Possession Engine bridge.
 * Preserves explicit stored RAPM stints when present; otherwise derives certified
 * possession stints from official play-by-play at read time.
 */
(function(root){
  'use strict';
  const rapm=root.CourtIQRAPM,possession=root.CourtIQPossessionEngine;
  if(!rapm||!possession)return;
  const originalExtractGame=rapm.extractGame.bind(rapm);
  const originalFit=rapm.fit.bind(rapm);

  function directStored(game){
    return game?.rapmStints||game?.rapm_stints||game?.possessionStints||game?.possession_stints||game?.pairedLineupStints||game?.paired_lineup_stints;
  }
  function wrapForOriginal(row,game,stints){
    if(row?.payload!==undefined)return {...row,payload:{...game,possessionStints:stints}};
    return {...game,possessionStints:stints};
  }
  function deriveGame(row){
    const game=rapm.payload(row),stored=directStored(game);
    if(Array.isArray(stored)&&stored.length){
      const stints=originalExtractGame(row);
      return {stints,source:'STORED_POSSESSION_STINTS',quality:null};
    }
    const original=originalExtractGame(row);
    if(original.length)return {stints:original,source:'EXISTING_LINEUP_POSSESSIONS',quality:null};
    const derived=possession.derive(game);
    const stints=derived.rapmStints.length?originalExtractGame(wrapForOriginal(row,game,derived.rapmStints)):[];
    return {stints,source:'POSSESSION_ENGINE',quality:derived.quality};
  }
  function extractGame(row){return deriveGame(row).stints;}
  function extractGames(rows){
    const stints=[];
    const coverage={games:0,gamesWithAnyLineups:0,gamesWithPossessionStints:0,gamesFromPossessionEngine:0,pairedStints:0,totalPossessions:0,certifiedPossessions:0,excludedPossessions:0,engineStatuses:{}};
    for(const row of rows||[]){
      coverage.games++;
      const result=deriveGame(row),q=result.quality;
      if(q){
        coverage.gamesFromPossessionEngine++;
        coverage.certifiedPossessions+=Number(q.certifiedPossessions||0);
        coverage.excludedPossessions+=Number(q.uncertifiedPossessions||0);
        coverage.engineStatuses[q.status]=(coverage.engineStatuses[q.status]||0)+1;
        if(q.lineupStatus&&q.lineupStatus!=='NO_LINEUPS')coverage.gamesWithAnyLineups++;
      }else{
        const game=rapm.payload(row);
        const side=game.lineupStints||game.lineup_stints||game._lineups;
        if(result.stints.length||(Array.isArray(side)&&side.length)||Array.isArray(directStored(game)))coverage.gamesWithAnyLineups++;
      }
      if(result.stints.length)coverage.gamesWithPossessionStints++;
      stints.push(...result.stints);
    }
    coverage.pairedStints=stints.length;
    coverage.totalPossessions=stints.reduce((s,x)=>s+Number(x.homePossessions||0)+Number(x.awayPossessions||0),0);
    return {stints,coverage};
  }
  function fitGames(rows,options={}){
    const extracted=extractGames(rows),model=originalFit(extracted.stints,options);
    return {...model,sourceCoverage:extracted.coverage};
  }

  rapm.extractGame=extractGame;
  rapm.extractGames=extractGames;
  rapm.fitGames=fitGames;
  rapm.possessionBridgeVersion='1.0.0';
  root.CourtIQRAPMPossessionBridge={deriveGame,extractGame,extractGames,fitGames,version:'1.0.0'};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.CourtIQRAPMPossessionBridge;
})(typeof window!=='undefined'?window:globalThis);
