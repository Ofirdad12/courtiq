/* CourtIQ Team Possessions v248
 * Full box-score team possession estimate.
 * Exact play-by-play possessions remain owned by possession-engine.js.
 */
(()=>{
'use strict';

const METHOD='TEAM_FULL_BOX_SCORE';
const VERSION='248';
const round1=value=>Math.round(value*10)/10;
const pct=(a,b)=>b>0?Math.round((a/b*100)*10)/10:null;
const number=value=>{
  const n=Number(value);
  return Number.isFinite(n)&&n>=0?n:null;
};

function readTeam(team){
  if(!team||typeof team!=='object')return null;
  const twoPm=number(team.two_pm),twoPa=number(team.two_pa),threePm=number(team.three_pm),threePa=number(team.three_pa),fta=number(team.fta),oreb=number(team.oreb),dreb=number(team.dreb),tov=number(team.tov),points=number(team.points);
  if([twoPm,twoPa,threePm,threePa,fta,oreb,dreb,tov,points].some(v=>v==null))return null;
  const fgm=twoPm+threePm,fga=twoPa+threePa;
  if(fgm>fga)return null;
  return {fgm,fga,fta,oreb,dreb,tov,points};
}

function estimateSide(team,opponent){
  const t=readTeam(team),o=readTeam(opponent);
  if(!t||!o)return null;
  const reboundDenominator=t.oreb+o.dreb;
  if(reboundDenominator<=0)return null;
  const missedFieldGoals=t.fga-t.fgm;
  const offensiveReboundAdjustment=1.07*(t.oreb/reboundDenominator)*missedFieldGoals;
  const estimate=t.fga+(0.4*t.fta)-offensiveReboundAdjustment+t.tov;
  return Number.isFinite(estimate)&&estimate>0?estimate:null;
}

function calculate(team,opponent,periodCount=4){
  const t=readTeam(team),o=readTeam(opponent);
  const teamEstimate=estimateSide(team,opponent),opponentEstimate=estimateSide(opponent,team);
  if(!t||!o||teamEstimate==null||opponentEstimate==null)return null;
  const possessions=(teamEstimate+opponentEstimate)/2;
  const periods=Math.max(4,Number.isFinite(Number(periodCount))?Number(periodCount):4);
  const gameMinutes=40+Math.max(0,periods-4)*5;
  const pace=possessions*(40/gameMinutes);
  const ortg=100*t.points/possessions;
  const drtg=100*o.points/possessions;
  return {
    method:METHOD,
    version:VERSION,
    possessions,
    pace,
    ortg,
    drtg,
    netRating:ortg-drtg,
    teamEstimate,
    opponentEstimate,
    gameMinutes
  };
}

function patchRow(rows,label,homeValue,awayValue,formatter=value=>value){
  if(!Array.isArray(rows))return;
  const row=rows.find(r=>Array.isArray(r)&&String(r[0]).trim().toLowerCase()===String(label).trim().toLowerCase());
  if(!row)return;
  row[1]=formatter(homeValue);
  row[2]=formatter(awayValue);
}

function patchPlayerShares(game,side,possessions){
  const players=game?.players?.[side];
  if(!Array.isArray(players)||!(possessions>0))return;
  for(const player of players){
    const fga=number(player?.fga)??((number(player?.two_pa)??0)+(number(player?.three_pa)??0));
    const fta=number(player?.fta),tov=number(player?.tov);
    if(fga==null||fta==null||tov==null)continue;
    const playEnds=fga+0.44*fta+tov;
    const share=pct(playEnds,possessions);
    if(share!=null)player.play_end_share=share;
  }
}

function applyToGame(game){
  const homeRaw=game?.raw?.home,awayRaw=game?.raw?.away;
  if(!homeRaw||!awayRaw)return null;
  const periods=Array.isArray(game.quarters)&&game.quarters.length?game.quarters.length:4;
  const home=calculate(homeRaw,awayRaw,periods),away=calculate(awayRaw,homeRaw,periods);
  if(!home||!away)return null;

  const possessions=round1(home.possessions),pace=round1(home.pace);
  const homeOrtg=round1(home.ortg),awayOrtg=round1(away.ortg);
  const homeNet=round1(homeOrtg-awayOrtg),awayNet=round1(awayOrtg-homeOrtg);

  game.calculated=game.calculated||{};
  game.calculated.home={...(game.calculated.home||{}),possessions,pace,ortg:homeOrtg,drtg:awayOrtg,net_rating:homeNet,possession_method:METHOD,possession_formula_version:VERSION,team_possession_estimate:round1(home.teamEstimate),opponent_possession_estimate:round1(home.opponentEstimate)};
  game.calculated.away={...(game.calculated.away||{}),possessions,pace,ortg:awayOrtg,drtg:homeOrtg,net_rating:awayNet,possession_method:METHOD,possession_formula_version:VERSION,team_possession_estimate:round1(away.teamEstimate),opponent_possession_estimate:round1(away.opponentEstimate)};
  game.possessionMethod=METHOD;
  game.possessionFormulaVersion=VERSION;

  patchRow(game.metrics,'Offensive Rating',homeOrtg,awayOrtg,v=>v.toFixed(1));
  patchRow(game.metrics,'Defensive Rating',awayOrtg,homeOrtg,v=>v.toFixed(1));
  patchRow(game.metrics,'Net Rating',homeNet,awayNet,v=>v.toFixed(1));
  patchRow(game.metrics,'Pace',pace,pace,v=>v.toFixed(1));

  patchRow(game.stats,'Possessions',possessions,possessions);
  patchRow(game.stats,'Pace',pace,pace);
  patchRow(game.stats,'ORtg',homeOrtg,awayOrtg);
  patchRow(game.stats,'DRtg',awayOrtg,homeOrtg);
  patchRow(game.stats,'Net Rating',homeNet,awayNet);

  patchPlayerShares(game,'home',home.possessions);
  patchPlayerShares(game,'away',home.possessions);
  return {home,away,possessions,pace};
}

function applyKnownGames(){
  try{
    if(typeof games!=='undefined'&&games&&typeof games==='object'){
      Object.values(games).forEach(applyToGame);
    }
  }catch(_){}
}

function wrapHydrator(){
  try{
    if(typeof hydrateOfficialDemoGame!=='function'||hydrateOfficialDemoGame.__teamPossessionsV248)return;
    const original=hydrateOfficialDemoGame;
    const wrapped=function(game,rows){
      const result=original(game,rows);
      applyToGame(game);
      return result;
    };
    wrapped.__teamPossessionsV248=true;
    hydrateOfficialDemoGame=wrapped;
  }catch(_){}
}

function wrapImporter(){
  const data=window.CourtIQData;
  const current=data?.importOfficialGame;
  if(typeof current!=='function'||current.__teamPossessionsV248)return;
  const wrapped=async function(...args){
    const body=await current.apply(this,args);
    if(body?.ui)applyToGame(body.ui);
    return body;
  };
  wrapped.__teamPossessionsV248=true;
  wrapped.__wrappedImporter=current;
  data.importOfficialGame=wrapped;
}

window.CourtIQTeamPossessions={METHOD,VERSION,estimateSide,calculate,applyToGame,applyKnownGames};
wrapHydrator();
applyKnownGames();
wrapImporter();
setTimeout(()=>{applyKnownGames();wrapImporter();},0);
setTimeout(()=>{applyKnownGames();wrapImporter();},500);
window.addEventListener('load',()=>{applyKnownGames();wrapImporter();},{once:true});
})();
