// NBA official box score adapter. Per-40 fields retain their explicit existing units.
const r1=n=>Math.round(n*10)/10, r2=n=>Math.round(n*100)/100;
const pct=(a,b)=>b?Math.round(a/b*1000)/10:0;
const estimate=(t,o)=>{const fga=t.two_pa+t.three_pa,fgm=t.two_pm+t.three_pm;return fga+.4*t.fta-(t.oreb+o.dreb?1.07*t.oreb/(t.oreb+o.dreb)*(fga-fgm):0)+t.tov;};
function validateTeam(t     , label        ) {
  const keys = ["points","two_pm","two_pa","three_pm","three_pa","ftm","fta","oreb","dreb","ast","tov"];
  for (const k of keys) if (!Number.isFinite(Number(t[k])) || Number(t[k]) < 0) throw new Error(label + " has invalid " + k + ".");
  if (t.two_pm > t.two_pa || t.three_pm > t.three_pa || t.ftm > t.fta) throw new Error(label + " has makes greater than attempts.");
  const expected = 2 * t.two_pm + 3 * t.three_pm + t.ftm;
  if (expected !== t.points) throw new Error(label + " scoring totals do not reconcile: " + t.points + " vs " + expected + ".");
  return { status: "passed", expected_points: expected, box_score_points: t.points, fga: t.two_pa + t.three_pa };
}

function calc(t     , opp     ) {
  const fgm = t.two_pm + t.three_pm, fga = t.two_pa + t.three_pa;
  const poss = estimate(t, opp);
  const oppFga = opp.two_pa + opp.three_pa, oppPoss = estimate(opp, t);
  const ortg = r1(t.points / Math.max(poss, 1) * 100), drtg = r1(opp.points / Math.max(oppPoss, 1) * 100);
  const trb = t.oreb + t.dreb, oppTrb = opp.oreb + opp.dreb;
  return {
    possessions: r2(poss), pace: r1((poss + oppPoss) / 2), ortg, drtg, net_rating: r1(ortg - drtg),
    fg_pct: pct(fgm, fga), two_pct: pct(t.two_pm, t.two_pa), three_pct: pct(t.three_pm, t.three_pa), ft_pct: pct(t.ftm, t.fta),
    efg: pct(fgm + .5 * t.three_pm, fga), ts: pct(t.points, 2 * (fga + .44 * t.fta)), pps: fga ? r2(t.points / fga) : 0,
    three_pa_rate: pct(t.three_pa, fga), tov: pct(t.tov, fga + .44 * t.fta + t.tov), orb: pct(t.oreb, t.oreb + opp.dreb),
    drb: pct(t.dreb, t.dreb + opp.oreb), trb: pct(trb, trb + oppTrb), ftr: pct(t.fta, fga), ast_to: t.tov ? r2(t.ast / t.tov) : (t.ast ? "∞" : 0),
    assisted_fg_pct: pct(t.ast, fgm), margin: t.points - opp.points
  };
}

function advancedPlayer(p     , team     , opp     ) {
  const fgm = p.two_pm + p.three_pm, fga = p.two_pa + p.three_pa, rebounds = p.oreb + p.dreb;
  const missed = fga - fgm + p.fta - p.ftm;
  const simpleTeamPoss = estimate(team, opp);
  const per40 = (v        ) => p.minutes ? r1(v * 40 / p.minutes) : 0;
  return { ...p, fgm, fga, rebounds,
    fg_pct: pct(fgm, fga), two_pct: pct(p.two_pm, p.two_pa), three_pct: pct(p.three_pm, p.three_pa), ft_pct: pct(p.ftm, p.fta),
    efg: pct(fgm + .5 * p.three_pm, fga), ts: pct(p.points, 2 * (fga + .44 * p.fta)), pps: fga ? r2(p.points / fga) : 0, three_pa_rate: pct(p.three_pa, fga),
    ast_to: p.tov ? r2(p.ast / p.tov) : (p.ast ? "∞" : 0), points_per_40: per40(p.points), rebounds_per_40: per40(rebounds), assists_per_40: per40(p.ast),
    play_end_share: pct(fga + .44 * p.fta + p.tov, simpleTeamPoss),
    oreb_pct: p.minutes ? pct(p.oreb * (team.minutes / 5), p.minutes * (team.oreb + opp.dreb)) : 0,
    dreb_pct: p.minutes ? pct(p.dreb * (team.minutes / 5), p.minutes * (team.dreb + opp.oreb)) : 0,
    box_impact_per_40: per40(p.points + rebounds + p.ast + p.steals + p.blocks - missed - p.tov)
  };
}

function aggregate(players       ) {
  const keys = ["minutes","points","two_pm","two_pa","three_pm","three_pa","ftm","fta","oreb","dreb","ast","steals","blocks","tov"];
  const out      = {};
  for (const k of keys) out[k] = r1(players.reduce((s, p) => s + Number(p[k] || 0), 0));
  const fgm = out.two_pm + out.three_pm, fga = out.two_pa + out.three_pa;
  return { ...out, efg: pct(fgm + .5 * out.three_pm, fga), ts: pct(out.points, 2 * (fga + .44 * out.fta)), ast_to: out.tov ? r2(out.ast / out.tov) : (out.ast ? "∞" : 0) };
}

function leaders(players       ) {
  const played = players.filter(p => p.has_played);
  if (!played.length) return [];
  const top = (k        ) => [...played].sort((a, b) => Number(b[k] || 0) - Number(a[k] || 0) || b.points - a.points)[0];
  const s = top("points"), r = top("rebounds"), a = top("ast");
  return [[s.name, s.points, "PTS"], [r.name, r.rebounds, "REB"], [a.name, a.ast, "AST"]];
}

function uiGame(meta     , home     , away     , homePlayers       , awayPlayers       , quarters       ) {
  const hm = calc(home, away), am = calc(away, home);
  const hSplit = { starters: aggregate(homePlayers.filter(p => p.starter && p.has_played)), bench: aggregate(homePlayers.filter(p => !p.starter && p.has_played)) };
  const aSplit = { starters: aggregate(awayPlayers.filter(p => p.starter && p.has_played)), bench: aggregate(awayPlayers.filter(p => !p.starter && p.has_played)) };
  return {
    id: meta.id, comp: meta.competition, date: meta.date_display, home: meta.home, away: meta.away, hs: home.points, as: away.points, quarters,
    sourceLabel: "NBA OFFICIAL BOX SCORE · DATA CONFIRMED", sourceUrl: meta.source_url, playByPlay: [], playByPlayStatus: "not_published",
    metrics: [["Offensive Rating", hm.ortg.toFixed(1), am.ortg.toFixed(1)], ["Defensive Rating", hm.drtg.toFixed(1), am.drtg.toFixed(1)], ["Net Rating", hm.net_rating.toFixed(1), am.net_rating.toFixed(1)], ["eFG%", hm.efg + "%", am.efg + "%"], ["Pace", hm.pace.toFixed(1), am.pace.toFixed(1)], ["Possessions", hm.possessions, am.possessions]],
    factors: [["eFG%", hm.efg, am.efg], ["TOV%", hm.tov, am.tov], ["ORB%", hm.orb, am.orb], ["FTr", hm.ftr, am.ftr]],
    stats: [["Points", home.points, away.points], ["Point Margin", hm.margin, am.margin], ["Possessions", hm.possessions, am.possessions], ["Pace", hm.pace, am.pace], ["ORtg", hm.ortg, am.ortg], ["DRtg", hm.drtg, am.drtg], ["Net Rating", hm.net_rating, am.net_rating],
      ["FG", `${home.two_pm + home.three_pm}/${home.two_pa + home.three_pa}`, `${away.two_pm + away.three_pm}/${away.two_pa + away.three_pa}`], ["FG%", hm.fg_pct + "%", am.fg_pct + "%"], ["2P", `${home.two_pm}/${home.two_pa}`, `${away.two_pm}/${away.two_pa}`], ["2P%", hm.two_pct + "%", am.two_pct + "%"], ["3P", `${home.three_pm}/${home.three_pa}`, `${away.three_pm}/${away.three_pa}`], ["3P%", hm.three_pct + "%", am.three_pct + "%"], ["FT", `${home.ftm}/${home.fta}`, `${away.ftm}/${away.fta}`], ["FT%", hm.ft_pct + "%", am.ft_pct + "%"],
      ["eFG%", hm.efg + "%", am.efg + "%"], ["TS%", hm.ts + "%", am.ts + "%"], ["PPS", hm.pps, am.pps], ["3PA Rate", hm.three_pa_rate + "%", am.three_pa_rate + "%"], ["TOV%", hm.tov + "%", am.tov + "%"], ["FTr", hm.ftr + "%", am.ftr + "%"],
      ["Assists", home.ast, away.ast], ["AST/TO", hm.ast_to, am.ast_to], ["Turnovers", home.tov, away.tov], ["Offensive Rebounds", home.oreb, away.oreb], ["Defensive Rebounds", home.dreb, away.dreb], ["ORB%", hm.orb + "%", am.orb + "%"], ["DRB%", hm.drb + "%", am.drb + "%"], ["TRB%", hm.trb + "%", am.trb + "%"],
      ["Starters Points", hSplit.starters.points, aSplit.starters.points], ["Bench Points", hSplit.bench.points, aSplit.bench.points], ["Bench Share", pct(hSplit.bench.points, home.points) + "%", pct(aSplit.bench.points, away.points) + "%"]],
    findings: [["Possession Efficiency", hm.ortg + " ORtg vs " + am.ortg + " ORtg", "Descriptive efficiency gap from verified NBA totals"], ["Shooting Efficiency", hm.efg + "% eFG vs " + am.efg + "%", "Shot-value conversion; shot context requires video"], ["Ball Security", home.tov + " turnovers vs " + away.tov, hm.tov + "% vs " + am.tov + "% TOV rate"], ["Offensive Rebounding", hm.orb + "% ORB vs " + am.orb + "%", "Second-possession signal from box-score totals"]],
    videos: ["Classify turnovers by pressure, passing read, handle and offensive foul.", "Review shot quality behind the eFG% difference.", "Audit offensive rebounds and box-out responsibility.", "Review high-impact possessions before assigning tactical causation."],
    leaders: leaders(homePlayers), awayLeaders: leaders(awayPlayers), players: { home: homePlayers, away: awayPlayers }, splits: { home: hSplit, away: aSplit }, matchup: { home: meta.home, away: meta.away },
    calculated: { home: hm, away: am }, raw: { home, away },
    formulaCatalog: { version: "courtiq-formulas-v8", box_score: { possessions: "FGA + 0.4 × FTA - 1.07 × [ORB / (ORB + OppDRB)] × (FGA - FGM) + TOV", pace: "Shared game pace normalized to 48 minutes", efg_pct: "(FGM + 0.5 × 3PM) / FGA × 100", ts_pct: "PTS / [2 × (FGA + 0.44 × FTA)] × 100" } }
  };
}


export function nbaIdentity(raw) {
  let u;try {u=new URL(raw);} catch {throw new Error('Paste an NBA.com game link.');}
  if(u.protocol!=='https:' || !/^(www\.)?nba\.com$/i.test(u.hostname) || u.username || u.password || u.port)throw new Error('Use an official https://www.nba.com/game/... link.');
  const m=u.pathname.match(/^\/game\/(?:[a-z0-9]+(?:-[a-z0-9]+)*-)?(00[1245]\d{7})(?:\/(?:box-score|boxscore|summary|play-by-play|game-charts|preview))?\/?$/i);
  if(!m)throw new Error('Paste the NBA game link, not the NBA homepage: nba.com/game/.../box-score.');
  u.hostname='www.nba.com';u.pathname='/game/'+u.pathname.split('/')[2]+'/box-score';u.search='';u.hash='';
  return {u,externalId:m[1],provider:'NBA'};
}
export function minutesValue(value) {
  let m=String(value??'').match(/^(\d+):(\d{2})(?:\.(\d+))?$/);
  if(m && Number(m[2])<60)return Number(m[1])+Number(m[2]+(m[3]?'.'+m[3]:''))/60;
  m=String(value??'').match(/^PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if(m&&(m[1]||m[2]))return Number(m[1]||0)+Number(m[2]||0)/60;
  throw new Error('NBA minutes are missing or invalid.');
}
function statLine(s) {
  const map={points:'points',fgm:'fieldGoalsMade',fga:'fieldGoalsAttempted',three_pm:'threePointersMade',three_pa:'threePointersAttempted',ftm:'freeThrowsMade',fta:'freeThrowsAttempted',oreb:'reboundsOffensive',dreb:'reboundsDefensive',ast:'assists',steals:'steals',blocks:'blocks',tov:'turnovers',pf:'foulsPersonal'};
  const out={};
  for(const [key,source] of Object.entries(map)) {
    const v=s?.[source];if(typeof v!=='number'||!Number.isInteger(v)||v<0)throw new Error('NBA statistic missing or invalid: '+source);
    out[key]=v;
  }
  out.two_pm=out.fgm-out.three_pm;out.two_pa=out.fga-out.three_pa;
  out.minutes=minutesValue(s.minutes);out.rebounds=out.oreb+out.dreb;
  out.plus_minus=typeof s.plusMinusPoints==='number'?s.plusMinusPoints:null;
  validateTeam(out,'NBA');return out;
}
export function parseNbaGame(game,id,sourceUrl) {
  if(String(game?.gameId)!==id)throw new Error('NBA returned a different game.');
  if(Number(game.gameStatus)!==3)throw new Error('This NBA game is not final. Import it after the official final box score is published.');
  const count=Number(game.period);
  if(!Number.isInteger(count)||count<4||count>20)throw new Error('NBA period count is invalid.');
  const gameMinutes=48+(count-4)*5;
  const sides=[game.homeTeam,game.awayTeam].map(team=>{
    if(!team?.teamCity||!team?.teamName||!Array.isArray(team.players)||!team.players.length)throw new Error('NBA team or player data is missing.');
    const total=statLine(team.statistics);
    if(total.points!==Number(team.score)||Math.abs(total.minutes-gameMinutes*5)>.2)throw new Error('NBA score or game duration does not reconcile.');
    const periods=team.periods;
    if(!Array.isArray(periods)||periods.length!==count||periods.some((p,i)=>p.period!==i+1||!Number.isInteger(p.score)||p.score<0)||periods.reduce((n,p)=>n+p.score,0)!==total.points)throw new Error('NBA quarter scores do not reconcile.');
    const players=team.players.map(p=>{
      const hasPlayed=p.played!==undefined?String(p.played)==='1':Boolean(p.statistics?.minutes && !p.comment);
      const stats=hasPlayed?statLine(p.statistics):{minutes:0,points:0,fgm:0,fga:0,two_pm:0,two_pa:0,three_pm:0,three_pa:0,ftm:0,fta:0,oreb:0,dreb:0,rebounds:0,ast:0,steals:0,blocks:0,tov:0,pf:0,plus_minus:null};
      const name=p.name||[p.firstName,p.familyName].filter(Boolean).join(' ');
      if(!p.personId||!name)throw new Error('NBA player identity is missing.');
      return {...stats,id:String(p.personId),name,number:String(p.jerseyNum||''),position:p.position||null,starter:p.starter!==undefined?String(p.starter)==='1':Boolean(p.position),has_played:hasPlayed,comment:p.comment||'',min:hasPlayed?String(p.statistics.minutes):'DNP'};
    });
    for(const key of ['points','fgm','fga','three_pm','three_pa','ftm','fta','ast','steals','blocks']) {
      if(players.reduce((s,p)=>s+p[key],0)!==total[key])throw new Error('NBA player totals do not reconcile: '+key);
    }
    if(Math.abs(players.reduce((s,p)=>s+p.minutes,0)-gameMinutes*5)>.25)throw new Error('NBA player minutes do not reconcile.');
    return {total,players,teamName:team.teamCity+' '+team.teamName,periods};
  });
  const [h,a]=sides,home=h.total,away=a.total;
  h.players=h.players.map(p=>advancedPlayer(p,home,away));a.players=a.players.map(p=>advancedPlayer(p,away,home));
  const gameDate=String(game.gameEt||game.gameTimeUTC).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(gameDate))throw new Error('NBA game date is missing.');
  const quarters=h.periods.map((p,i)=>[p.score,a.periods[i].score]);
  const ui=uiGame({id,home:h.teamName,away:a.teamName,competition:'NBA',date_display:gameDate,source_url:sourceUrl},home,away,h.players,a.players,quarters);
  ui.provider='NBA';ui.regulationMinutes=48;ui.gameMinutes=gameMinutes;ui.status='Final';ui.gameStatus='final';ui.confidence='DATA CONFIRMED';
  const pace=r1((estimate(home,away)+estimate(away,home))/2*48/gameMinutes);
  for(const side of ['home','away']){ui.calculated[side].pace=pace;ui.calculated[side].game_minutes=gameMinutes;}
  for(const rows of [ui.metrics,ui.stats])for(const row of rows){if(row[0]==='Pace'){row[0]='Estimated Pace';row[1]=pace;row[2]=pace;}if(row[0]==='Possessions')row[0]='Estimated Possessions';}
  ui.gamePace=pace;ui.playByPlayStatus='not_imported';
  return {home,away,homeName:h.teamName,awayName:a.teamName,sides,gameDate,ui};
}
export async function fetchNba(identity,fetcher=fetch) {
  // The official game page contains the same structured box score as the CDN.
  // Prefer it because CDN access can be unavailable in some server regions.
  const urls=[identity.u.toString(),`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${identity.externalId}.json`];
  let last='';
  for(const [i,url] of urls.entries()) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetcher(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':i?'application/json':'text/html'},signal:controller.signal,redirect:'error'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      let game;
      if(i)game=(await response.json()).game;
      else {
        const html=await response.text();
        const match=html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
        if(!match)throw new Error('NBA structured box score is unavailable.');
        game=JSON.parse(match[1])?.props?.pageProps?.game;
      }
      if(String(game?.gameId)!==identity.externalId)throw new Error('NBA returned a different game.');
      return {game,route:i?'nba_live_json':'nba_game_page'};
    } catch(e){last=e.message;} finally{clearTimeout(timer);}
  }
  throw new Error('NBA did not return its official box score ('+last+'). Retry the game link shortly.');
}
