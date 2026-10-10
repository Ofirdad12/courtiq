/* CourtIQ v233 · explicit action bridge from the legacy app to the coach-first workspace. */
(function(root){
  'use strict';

  function report(name,err){try{root.CourtIQObservability?.capture?.('action_failure',err?.message||String(err||'Action failed'),{action:String(name||'unknown')},'error','app-actions')}catch(_){}}
  function call(fn,ctx=root){
    if(typeof fn!=='function')return false;
    fn.call(ctx);
    return true;
  }
  function clickId(id){
    const el=document.getElementById(id);
    if(!el)return false;
    try{el.click();return true}catch(err){console.error('[CourtIQ v233] click failed',id,err);report(id,err);return false}
  }
  function tab(view){
    const button=document.querySelector(`[data-game-tab="${view}"]`);
    if(!button)return false;
    try{root.CourtIQUIRecovery?.activateGameTab?.(button);}catch(err){console.error('[CourtIQ v233] tab recovery failed',err);report('tab:'+view,err);}
    try{button.click();return true;}catch(err){console.error('[CourtIQ v233] tab click failed',err);report('tab:'+view,err);return false;}
  }

  function run(name){
    try{
      if(name==='dashboard'||name==='prep')return call(root.CourtIQPrepHub?.open,root.CourtIQPrepHub)||(typeof openPilotDashboard==='function'?(openPilotDashboard(),true):tab('overview'));
      if(name==='games')return call(root.CourtIQDataQuality?.open,root.CourtIQDataQuality)||(typeof openGameLibrary==='function'?(openGameLibrary(),true):false);
      if(name==='season')return clickId('seasonMemoryFlow')||(typeof openSeasonMemory==='function'?(openSeasonMemory(),true):false);
      if(name==='scouting')return call(root.CourtIQOpponentWorkspace?.open,root.CourtIQOpponentWorkspace)||clickId('scoutingReportFlow')||(typeof openOpponentScout==='function'?(openOpponentScout(),true):(typeof openTacticalWorkspace==='function'?(openTacticalWorkspace(),true):false));
      if(name==='coach-brief')return clickId('coachBriefFlow')||run('coach');
      if(name==='video-intelligence')return call(root.CourtIQVideoIntelligence?.open,root.CourtIQVideoIntelligence)||(typeof openVideoRoom==='function'?(openVideoRoom(),true):false);
      if(name==='halftime')return call(root.CourtIQHalftimeAdjustment?.open,root.CourtIQHalftimeAdjustment);
      if(name==='postgame')return call(root.CourtIQPostgameLearning?.open,root.CourtIQPostgameLearning);
      if(name==='reports')return call(root.CourtIQReportLibrary?.open,root.CourtIQReportLibrary)||(typeof openFullReport==='function'?(openFullReport(),true):false);
      if(name==='system-health')return call(root.CourtIQObservability?.open,root.CourtIQObservability);
      if(name==='connected')return typeof openConnectedIntelligence==='function'?(openConnectedIntelligence(),true):false;
      if(name==='player-memory')return call(root.CourtIQPlayerIntelligence?.open,root.CourtIQPlayerIntelligence)||(typeof openPlayerMemory==='function'?(openPlayerMemory(),true):call(root.CourtIQPlayers?.openPlayers,root.CourtIQPlayers));
      if(name==='account'||name==='login')return typeof openAccount==='function'?(openAccount(),true):false;
      if(name==='import')return typeof openAutoImport==='function'?(openAutoImport(),true):(typeof openUrlImport==='function'?(openUrlImport(),true):false);
      if(name==='players')return call(root.CourtIQPlayers?.openPlayers,root.CourtIQPlayers)||tab('player');
      if(name==='coach')return call(root.CourtIQV2?.openCoachDashboard,root.CourtIQV2)||call(root.CourtIQCoach?.open,root.CourtIQCoach)||(typeof openCoachDashboard==='function'?(openCoachDashboard(),true):tab('coach'));
      if(name==='live')return call(root.CourtIQLiveBench?.open,root.CourtIQLiveBench);
      if(name==='team-analytics')return tab('team');
      if(name==='play')return tab('play');
      if(name==='lineups')return tab('lineups');
    }catch(err){console.error('[CourtIQ v233] bridge error:',name,err);report(name,err);}
    return false;
  }

  root.CourtIQAppActions={version:'233',run,tab};
})(typeof window!=='undefined'?window:globalThis);
