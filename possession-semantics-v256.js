/* CourtIQ possession semantics v256
 * Never present a fractional box-score estimate as an exact possession count.
 * Exact possessions require a complete play-by-play possession parser.
 */
(()=>{
'use strict';

const VERSION='256';
const EST_METHOD='TEAM_BOX_SCORE_ESTIMATE';

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

function hasCompletePbp(game){
  const candidates=[game?.play_by_play,game?.playByPlay,game?.pbp];
  return candidates.some(v=>Array.isArray(v)&&v.length>0);
}

function ensureActualRow(game){
  if(!Array.isArray(game?.stats))return;
  const existing=rowByLabel(game.stats,'Actual Possessions');
  if(existing)return;
  const estIndex=game.stats.findIndex(r=>Array.isArray(r)&&String(r[0]||'').trim().toLowerCase()==='estimated possessions');
  const row=['Actual Possessions','—','—'];
  if(estIndex>=0)game.stats.splice(estIndex+1,0,row);
  else game.stats.splice(Math.min(2,game.stats.length),0,row);
}

function apply(game){
  if(!game||typeof game!=='object')return game;
  const pbpAvailable=hasCompletePbp(game);

  renameRow(game.stats,'Possessions','Estimated Possessions');
  renameRow(game.metrics,'Possessions','Estimated Possessions');
  renameRow(game.stats,'Pace','Estimated Pace');
  renameRow(game.metrics,'Pace','Estimated Pace');

  if(!pbpAvailable)ensureActualRow(game);

  game.possessionMethod=pbpAvailable?(game.possessionMethod||'PBP_AVAILABLE_UNCOUNTED'):EST_METHOD;
  game.possessionSemanticsVersion=VERSION;
  game.actualPossessionsAvailable=pbpAvailable;
  game.formulaCatalog=game.formulaCatalog||{};
  game.formulaCatalog.possession_semantics={
    version:VERSION,
    estimated:'FGA - ORB + TOV + 0.44 × FTA',
    actual:'Requires complete play-by-play possession counting; never inferred from a fractional box-score estimate.'
  };

  if(game.calculated?.home){
    game.calculated.home.possession_method=EST_METHOD;
    game.calculated.home.possessions_are_estimated=true;
  }
  if(game.calculated?.away){
    game.calculated.away.possession_method=EST_METHOD;
    game.calculated.away.possessions_are_estimated=true;
  }
  return game;
}

function applyKnownGames(){
  try{
    if(typeof games!=='undefined'&&games&&typeof games==='object')Object.values(games).forEach(apply);
  }catch(_){}
}

function wrapImporter(){
  const data=window.CourtIQData;
  const current=data?.importOfficialGame;
  if(typeof current!=='function'||current.__possessionSemanticsV256)return;
  const wrapped=async function(...args){
    const body=await current.apply(this,args);
    if(body?.ui)apply(body.ui);
    if(body?.report){
      if(Array.isArray(body.report.team_stats)){
        renameRow(body.report.team_stats,'Possessions','Estimated Possessions');
        renameRow(body.report.team_stats,'Pace','Estimated Pace');
      }
      if(Array.isArray(body.report.metrics))renameRow(body.report.metrics,'Pace','Estimated Pace');
      body.report.possession_method=EST_METHOD;
      body.report.possession_semantics_version=VERSION;
    }
    return body;
  };
  wrapped.__possessionSemanticsV256=true;
  wrapped.__wrappedImporter=current;
  data.importOfficialGame=wrapped;
}

window.CourtIQPossessionSemantics={VERSION,apply,applyKnownGames,wrapImporter};
applyKnownGames();
wrapImporter();
setTimeout(()=>{applyKnownGames();wrapImporter();try{if(typeof render==='function')render();}catch(_){}},0);
setTimeout(()=>{applyKnownGames();wrapImporter();},500);
window.addEventListener('load',()=>{applyKnownGames();wrapImporter();},{once:true});
})();
