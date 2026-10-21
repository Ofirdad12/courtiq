/* CourtIQ possession semantics v256
 * Fractional box-score estimates are never presented as exact possessions.
 * When official play-by-play is present, the existing event-level possession
 * engine is used to publish integer actual possession counts.
 */
(()=>{
'use strict';

const VERSION='256';
const EST_METHOD='TEAM_BOX_SCORE_ESTIMATE';
const ACTUAL_METHOD='OFFICIAL_PBP_RECONSTRUCTION';

function rowByLabel(rows,label){
  if(!Array.isArray(rows))return null;
  const wanted=String(label).trim().toLowerCase();
  return rows.find(r=>Array.isArray(r)&&String(r[0]||'').trim().toLowerCase()===wanted)||null;
}

function renameRow(rows,from,to){
  const row=rowByLabel(rows,from);
  if(row)row[0]=to;
  return row;
}

function hasPbp(game){
  const candidates=[game?.play_by_play,game?.playByPlay,game?.pbp];
  return candidates.some(v=>Array.isArray(v)&&v.length>0);
}

function ensureRow(game,label,home='—',away='—',afterLabel='Estimated Possessions'){
  if(!Array.isArray(game?.stats))return null;
  let row=rowByLabel(game.stats,label);
  if(row)return row;
  row=[label,home,away];
  const afterIndex=game.stats.findIndex(r=>Array.isArray(r)&&String(r[0]||'').trim().toLowerCase()===String(afterLabel).toLowerCase());
  if(afterIndex>=0)game.stats.splice(afterIndex+1,0,row);
  else game.stats.splice(Math.min(2,game.stats.length),0,row);
  return row;
}

function countActual(game){
  if(!hasPbp(game)||!window.CourtIQPossessionEngine?.derive)return null;
  try{
    const result=window.CourtIQPossessionEngine.derive(game);
    const possessions=Array.isArray(result?.possessions)?result.possessions:[];
    if(!possessions.length||result?.quality?.scoringReliable!==true)return null;

    // Lineup certification is required for RAPM, not for possession counting.
    // Any other reconstruction warning blocks publication as an exact count.
    const hasNonLineupGap=possessions.some(p=>(p?.unsafeReasons||[]).some(reason=>!String(reason).includes('5v5 lineup')));
    if(hasNonLineupGap)return null;

    const home=possessions.filter(p=>p?.offense==='home').length;
    const away=possessions.filter(p=>p?.offense==='away').length;
    if(!(home>0&&away>0)||Math.abs(home-away)>2)return null;
    return {home,away,total:possessions.length,engineVersion:result.version,quality:result.quality};
  }catch(_){return null;}
}

function apply(game){
  if(!game||typeof game!=='object')return game;

  renameRow(game.stats,'Possessions','Estimated Possessions');
  renameRow(game.metrics,'Possessions','Estimated Possessions');
  renameRow(game.stats,'Pace','Estimated Pace');
  renameRow(game.metrics,'Pace','Estimated Pace');

  const actual=countActual(game);
  const actualRow=ensureRow(game,'Actual Possessions');
  if(actualRow){
    actualRow[1]=actual?.home??'—';
    actualRow[2]=actual?.away??'—';
  }

  game.possessionSemanticsVersion=VERSION;
  game.actualPossessionsAvailable=Boolean(actual);
  game.possessionMethod=actual?ACTUAL_METHOD:EST_METHOD;
  game.formulaCatalog=game.formulaCatalog||{};
  game.formulaCatalog.possession_semantics={
    version:VERSION,
    estimated:'FGA - ORB + TOV + 0.44 × FTA',
    actual:'Integer possession count reconstructed from official play-by-play events.'
  };

  game.calculated=game.calculated||{};
  if(game.calculated.home){
    game.calculated.home.estimated_possessions=game.calculated.home.possessions;
    game.calculated.home.possessions_are_estimated=!actual;
    if(actual)game.calculated.home.actual_possessions=actual.home;
  }
  if(game.calculated.away){
    game.calculated.away.estimated_possessions=game.calculated.away.possessions;
    game.calculated.away.possessions_are_estimated=!actual;
    if(actual)game.calculated.away.actual_possessions=actual.away;
  }
  if(actual){
    game.actualPossessions={home:actual.home,away:actual.away,method:ACTUAL_METHOD,engine_version:actual.engineVersion};
  }
  return game;
}

function applyKnownGames(){
  try{
    if(typeof games!=='undefined'&&games&&typeof games==='object')Object.values(games).forEach(apply);
  }catch(_){}
}

function patchReport(report,game){
  if(!report||typeof report!=='object')return;
  if(Array.isArray(report.team_stats)){
    renameRow(report.team_stats,'Possessions','Estimated Possessions');
    renameRow(report.team_stats,'Pace','Estimated Pace');
    const uiActual=rowByLabel(game?.stats,'Actual Possessions');
    if(uiActual&&!rowByLabel(report.team_stats,'Actual Possessions')){
      const estIndex=report.team_stats.findIndex(r=>Array.isArray(r)&&String(r[0]||'').trim().toLowerCase()==='estimated possessions');
      const row=['Actual Possessions',uiActual[1],uiActual[2]];
      if(estIndex>=0)report.team_stats.splice(estIndex+1,0,row);else report.team_stats.splice(Math.min(2,report.team_stats.length),0,row);
    }
  }
  if(Array.isArray(report.metrics))renameRow(report.metrics,'Pace','Estimated Pace');
  report.possession_method=game?.actualPossessionsAvailable?ACTUAL_METHOD:EST_METHOD;
  report.possession_semantics_version=VERSION;
}

function wrapImporter(){
  const data=window.CourtIQData;
  const current=data?.importOfficialGame;
  if(typeof current!=='function'||current.__possessionSemanticsV256)return;
  const wrapped=async function(...args){
    const body=await current.apply(this,args);
    if(body?.ui)apply(body.ui);
    if(body?.report)patchReport(body.report,body.ui);
    return body;
  };
  wrapped.__possessionSemanticsV256=true;
  wrapped.__wrappedImporter=current;
  data.importOfficialGame=wrapped;
}

window.CourtIQPossessionSemantics={VERSION,apply,applyKnownGames,wrapImporter,countActual};
applyKnownGames();
wrapImporter();
setTimeout(()=>{applyKnownGames();wrapImporter();try{if(typeof render==='function')render();}catch(_){}},0);
setTimeout(()=>{applyKnownGames();wrapImporter();},500);
setTimeout(()=>{applyKnownGames();wrapImporter();try{if(typeof render==='function')render();}catch(_){}},1700);
window.addEventListener('load',()=>{applyKnownGames();wrapImporter();},{once:true});
})();
