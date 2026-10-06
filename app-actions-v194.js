/* CourtIQ v194 · explicit action bridge from the legacy app to the unified UI router. */
(function(root){
  'use strict';

  function call(fn,ctx=root){
    if(typeof fn!=='function')return false;
    fn.call(ctx);
    return true;
  }

  function tab(view){
    const button=document.querySelector(`[data-game-tab="${view}"]`);
    if(!button)return false;
    try{root.CourtIQUIRecovery?.activateGameTab?.(button);}catch(err){console.error('[CourtIQ v194] tab recovery failed',err);}
    try{button.click();return true;}catch(err){console.error('[CourtIQ v194] tab click failed',err);return false;}
  }

  function run(name){
    try{
      if(name==='dashboard')return typeof openPilotDashboard==='function'?(openPilotDashboard(),true):tab('overview');
      if(name==='games')return typeof openGameLibrary==='function'?(openGameLibrary(),true):false;
      if(name==='season')return typeof openSeasonMemory==='function'?(openSeasonMemory(),true):false;
      if(name==='scouting')return typeof openOpponentScout==='function'?(openOpponentScout(),true):(typeof openTacticalWorkspace==='function'?(openTacticalWorkspace(),true):false);
      if(name==='reports')return typeof openFullReport==='function'?(openFullReport(),true):false;
      if(name==='connected')return typeof openConnectedIntelligence==='function'?(openConnectedIntelligence(),true):false;
      if(name==='player-memory')return typeof openPlayerMemory==='function'?(openPlayerMemory(),true):call(root.CourtIQPlayers?.openPlayers,root.CourtIQPlayers);
      if(name==='account'||name==='login')return typeof openAccount==='function'?(openAccount(),true):false;
      if(name==='import')return typeof openAutoImport==='function'?(openAutoImport(),true):(typeof openUrlImport==='function'?(openUrlImport(),true):false);
      if(name==='players')return call(root.CourtIQPlayers?.openPlayers,root.CourtIQPlayers)||tab('player');
      if(name==='coach')return call(root.CourtIQV2?.openCoachDashboard,root.CourtIQV2)||call(root.CourtIQCoach?.open,root.CourtIQCoach)||(typeof openCoachDashboard==='function'?(openCoachDashboard(),true):tab('coach'));
      if(name==='live')return call(root.CourtIQLiveBench?.open,root.CourtIQLiveBench);
      if(name==='team-analytics')return tab('team');
      if(name==='play')return tab('play');
      if(name==='lineups')return tab('lineups');
    }catch(err){console.error('[CourtIQ v194] bridge error:',name,err);}
    return false;
  }

  root.CourtIQAppActions={version:'194',run,tab};
})(typeof window!=='undefined'?window:globalThis);
