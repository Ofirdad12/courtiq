/* CourtIQ Team Possessions v258
 * One possession model across CourtIQ:
 * Team Possessions = FGA + 0.4*FTA
 *   - 1.07*(ORB/(ORB + OppDRB))*(FGA - FGM) + TOV.
 * Each team is estimated independently at 2dp.
 * Pace is one shared game metric: average team possessions normalized to 40 minutes.
 */
(()=>{
'use strict';

const METHOD='FULL_TEAM_BOX_SCORE_ESTIMATE';
const VERSION='258';
const round1=value=>Math.round(value*10)/10;
const round2=value=>Math.round(value*100)/100;
const pct=(a,b)=>b>0?Math.round((a/b*100)*10)/10:null;
const number=value=>{
  const n=Number(value);
  return Number.isFinite(n)&&n>=0?n:null;
};

function readTeam(team){
  if(!team||typeof team!=='object')return null;
  const directFgm=number(team.fgm),directFga=number(team.fga);
  const twoPm=number(team.two_pm),twoPa=number(team.two_pa),threePm=number(team.three_pm),threePa=number(team.three_pa);
  const fgm=directFgm??(twoPm!=null&&threePm!=null?twoPm+threePm:null);
  const fga=directFga??(twoPa!=null&&threePa!=null?twoPa+threePa:null);
  const fta=number(team.fta),oreb=number(team.oreb),dreb=number(team.dreb),tov=number(team.tov),points=number(team.points);
  if([fgm,fga,fta,oreb,dreb,tov,points].some(v=>v==null)||fgm>fga)return null;
  return {fgm,fga,fta,oreb,dreb,tov,points};
}

function parseMadeAttempted(value){
  const match=String(value??'').match(/(\d+(?:\.\d+)?)\s*[\/-]\s*(\d+(?:\.\d+)?)/);
  return match?[Number(match[1]),Number(match[2])]:null;
}

function statRow(game,label){
  const rows=Array.isArray(game?.stats)?game.stats:[];
  const wanted=String(label).trim().toLowerCase();
  return rows.find(r=>Array.isArray(r)&&String(r[0]||'').trim().toLowerCase()===wanted)||null;
}

function rawFromStats(game,side){
  const index=side==='home'?1:2;
  const points=number(statRow(game,'Points')?.[index]);
  const fg=parseMadeAttempted(statRow(game,'FG')?.[index]);
  const ft=parseMadeAttempted(statRow(game,'FT')?.[index]);
  const oreb=number(statRow(game,'Offensive Rebounds')?.[index]);
  const dreb=number(statRow(game,'Defensive Rebounds')?.[index]);
  const tov=number(statRow(game,'Turnovers')?.[index]);
  if(points==null||!fg||!ft||oreb==null||dreb==null||tov==null)return null;
  return {points,fgm:fg[0],fga:fg[1],ftm:ft[0],fta:ft[1],oreb,dreb,tov};
}

function sideRaw(game,side){
  return game?.raw?.[side]||rawFromStats(game,side);
}

function estimateSide(team,opponent){
  const t=readTeam(team),o=readTeam(opponent);
  if(!t||!o)return null;
  const reboundOpportunities=t.oreb+o.dreb;
  if(!(reboundOpportunities>0))return null;
  const offensiveReboundAdjustment=1.07*(t.oreb/reboundOpportunities)*(t.fga-t.fgm);
  const estimate=t.fga+(0.4*t.fta)-offensiveReboundAdjustment+t.tov;
  return Number.isFinite(estimate)&&estimate>0?estimate:null;
}

function calculate(team,opponent,periodCount=4){
  const t=readTeam(team),o=readTeam(opponent);
  const teamEstimate=estimateSide(team,opponent),opponentEstimate=estimateSide(opponent,team);
  if(!t||!o||teamEstimate==null||opponentEstimate==null)return null;
  const periods=Math.max(4,Number.isFinite(Number(periodCount))?Number(periodCount):4);
  const gameMinutes=40+Math.max(0,periods-4)*5;
  const gamePossessions=(teamEstimate+opponentEstimate)/2;
  const pace=gamePossessions*(40/gameMinutes);
  const ortg=100*t.points/teamEstimate;
  const drtg=100*o.points/opponentEstimate;
  return {
    method:METHOD,
    version:VERSION,
    possessions:teamEstimate,
    pace,
    ortg,
    drtg,
    netRating:ortg-drtg,
    teamEstimate,
    opponentEstimate,
    gamePossessions,
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
  const homeRaw=sideRaw(game,'home'),awayRaw=sideRaw(game,'away');
  if(!homeRaw||!awayRaw)return null;
  const periods=Array.isArray(game.quarters)&&game.quarters.length?game.quarters.length:4;
  const home=calculate(homeRaw,awayRaw,periods),away=calculate(awayRaw,homeRaw,periods);
  if(!home||!away)return null;

  const homePossessions=round2(home.possessions),awayPossessions=round2(away.possessions);
  const gamePace=round1(home.pace);
  const homeOrtg=round1(home.ortg),awayOrtg=round1(away.ortg);
  const homeDrtg=round1(home.drtg),awayDrtg=round1(away.drtg);
  const homeNet=round1(homeOrtg-homeDrtg),awayNet=round1(awayOrtg-awayDrtg);
  const gamePossessions=round2(home.gamePossessions);

  game.calculated=game.calculated||{};
  game.calculated.home={...(game.calculated.home||{}),possessions:homePossessions,pace:gamePace,ortg:homeOrtg,drtg:homeDrtg,net_rating:homeNet,possession_method:METHOD,possession_formula_version:VERSION,team_possession_estimate:round2(home.teamEstimate),opponent_possession_estimate:round2(home.opponentEstimate),game_possessions:gamePossessions};
  game.calculated.away={...(game.calculated.away||{}),possessions:awayPossessions,pace:gamePace,ortg:awayOrtg,drtg:awayDrtg,net_rating:awayNet,possession_method:METHOD,possession_formula_version:VERSION,team_possession_estimate:round2(away.teamEstimate),opponent_possession_estimate:round2(away.opponentEstimate),game_possessions:gamePossessions};
  game.possessionMethod=METHOD;
  game.possessionFormulaVersion=VERSION;
  game.gamePace=gamePace;

  game.formulaCatalog=game.formulaCatalog||{};
  game.formulaCatalog.version=VERSION;
  game.formulaCatalog.box_score={...(game.formulaCatalog.box_score||{}),
    possessions:'FGA + 0.4 × FTA - 1.07 × [ORB / (ORB + OppDRB)] × (FGA - FGM) + TOV',
    ortg:'Team PTS / Team Possessions × 100',
    drtg:'Opponent PTS / Opponent Possessions × 100',
    pace:'[(Home Team Possessions + Away Team Possessions) / 2] × 40 / Game Minutes'};

  patchRow(game.metrics,'Offensive Rating',homeOrtg,awayOrtg,v=>v.toFixed(1));
  patchRow(game.metrics,'Defensive Rating',homeDrtg,awayDrtg,v=>v.toFixed(1));
  patchRow(game.metrics,'Net Rating',homeNet,awayNet,v=>v.toFixed(1));
  patchRow(game.metrics,'Pace',gamePace,gamePace,v=>v.toFixed(1));
  patchRow(game.metrics,'Estimated Pace',gamePace,gamePace,v=>v.toFixed(1));

  patchRow(game.stats,'Possessions',homePossessions,awayPossessions,v=>Number(v).toFixed(2));
  patchRow(game.stats,'Estimated Possessions',homePossessions,awayPossessions,v=>Number(v).toFixed(2));
  patchRow(game.metrics,'Estimated Possessions',homePossessions,awayPossessions,v=>Number(v).toFixed(2));
  patchRow(game.metrics,'Possessions',homePossessions,awayPossessions,v=>Number(v).toFixed(2));
  patchRow(game.stats,'Pace',gamePace,gamePace);
  patchRow(game.stats,'Estimated Pace',gamePace,gamePace);
  patchRow(game.stats,'ORtg',homeOrtg,awayOrtg);
  patchRow(game.stats,'DRtg',homeDrtg,awayDrtg);
  patchRow(game.stats,'Net Rating',homeNet,awayNet);

  patchPlayerShares(game,'home',home.possessions);
  patchPlayerShares(game,'away',away.possessions);
  return {home,away,possessions:homePossessions,opponentPossessions:awayPossessions,gamePace,homePace:gamePace,awayPace:gamePace};
}

function applyKnownGames(){
  try{
    if(typeof games!=='undefined'&&games&&typeof games==='object')Object.values(games).forEach(applyToGame);
  }catch(_){}
}

function refreshCurrentView(){
  try{if(typeof render==='function')render();}catch(_){}
}

function wrapHydrator(){
  try{
    if(typeof hydrateOfficialDemoGame!=='function'||hydrateOfficialDemoGame.__teamPossessionsV258)return;
    const original=hydrateOfficialDemoGame;
    const wrapped=function(game,rows){
      const result=original(game,rows);
      applyToGame(game);
      return result;
    };
    wrapped.__teamPossessionsV258=true;
    hydrateOfficialDemoGame=wrapped;
  }catch(_){}
}

function wrapImporter(){
  const data=window.CourtIQData;
  const current=data?.importOfficialGame;
  if(typeof current!=='function'||current.__teamPossessionsV258)return;
  const wrapped=async function(...args){
    const body=await current.apply(this,args);
    if(body?.ui)applyToGame(body.ui);
    return body;
  };
  wrapped.__teamPossessionsV258=true;
  wrapped.__wrappedImporter=current;
  data.importOfficialGame=wrapped;
}

window.CourtIQTeamPossessions={METHOD,VERSION,readTeam,estimateSide,calculate,applyToGame,applyKnownGames};
wrapHydrator();
applyKnownGames();
wrapImporter();
refreshCurrentView();
setTimeout(()=>{applyKnownGames();wrapImporter();},0);
setTimeout(()=>{applyKnownGames();wrapImporter();},500);
setTimeout(()=>{applyKnownGames();wrapImporter();},1500);
window.addEventListener('load',()=>{applyKnownGames();wrapImporter();},{once:true});
})();
