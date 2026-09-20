/* CourtIQ Player Intelligence
   Raw player totals live here; advanced metrics are calculated deterministically in-browser.
   AI/read text is interpretation only and must not invent statistics. */
(() => {
  const players = [
    {
      id: "ashley-owusu",
      name: "Ashley Owusu",
      team: "Elitzur Holon",
      position: "Guard",
      season: "2025–26",
      source: "User-supplied Eurobasket screenshot",
      competitions: [
        {
          name: "Poland OBLK", club: "Gorzow Wlkp.", games: 24, minutes: 537, points: 361,
          two_pm: 106, two_pa: 203, three_pm: 26, three_pa: 76, ftm: 71, fta: 82,
          oreb: 14, dreb: 117, rebounds: 131, assists: 77, steals: 22, blocks: 6, turnovers: 32
        },
        {
          name: "EuroCup", club: "Gorzow Wlkp.", games: 6, minutes: 193, points: 112,
          two_pm: 30, two_pa: 62, three_pm: 8, three_pa: 26, ftm: 28, fta: 34,
          oreb: 4, dreb: 25, rebounds: 29, assists: 19, steals: 1, blocks: 0, turnovers: 16
        }
      ],
      read: [
        "Owusu profiles as a scoring guard who does most of her damage inside the three-point line rather than relying heavily on perimeter volume.",
        "Her ball-security profile changes substantially between competitions. The difference is worth investigating, but the six-game EuroCup sample does not establish the cause.",
        "Her scoring volume increased in EuroCup despite lower shooting efficiency, while free-throw generation became a larger part of the scoring profile."
      ],
      video: [
        "Paint creation — identify what produces her 2P attempts: P&R drives, isolation, transition, post-ups or cuts.",
        "EuroCup turnovers — investigate the AST/TO drop: ball pressure, P&R reads, help rotations or increased creation responsibility.",
        "Free-throw generation — identify the actions producing the higher EuroCup FT Rate.",
        "Three-point profile — separate catch-and-shoot from pull-up attempts and study how defenses guard her behind ball screens.",
        "Rebounding to transition — check whether she initiates offense immediately after defensive rebounds."
      ]
    },
    {
      id: "tanaya-atkinson",
      name: "Tanaya Atkinson",
      team: "Elitzur Holon",
      position: "Forward",
      season: "2025–26",
      source: "User-supplied Eurobasket screenshot",
      competitions: [
        {
          name: "Spain LF Endesa · Estepona", club: "Estepona", games: 15, minutes: 222, points: 56,
          two_pm: 12, two_pa: 39, three_pm: 4, three_pa: 16, ftm: 20, fta: 28,
          oreb: 3, dreb: 35, rebounds: 38, assists: 19, steals: 7, blocks: 0, turnovers: 10
        },
        {
          name: "Spain LF Endesa · Valencia", club: "Valencia", games: 4, minutes: 76, points: 28,
          two_pm: 6, two_pa: 12, three_pm: 2, three_pa: 7, ftm: 10, fta: 15,
          oreb: 6, dreb: 12, rebounds: 18, assists: 8, steals: 6, blocks: 0, turnovers: 7
        },
        {
          name: "EuroLeague Women · Valencia", club: "Valencia", games: 3, minutes: 47, points: 12,
          two_pm: 4, two_pa: 9, three_pm: 1, three_pa: 4, ftm: 1, fta: 2,
          oreb: 4, dreb: 5, rebounds: 9, assists: 1, steals: 1, blocks: 0, turnovers: 5
        }
      ],
      read: [
        "Atkinson's 2025–26 domestic profile changed after the move from Estepona to Valencia: scoring rose from 3.7 to 7.0 points per game while minutes increased from 14.8 to 19.0.",
        "Her Valencia domestic sample shows stronger shooting efficiency than the Estepona sample, alongside a very high free-throw attempt rate. The four-game sample is small, so this should be treated as a signal rather than a stable level.",
        "The three-game EuroLeague sample is smaller again and shows lower efficiency and playmaking output. CourtIQ should not use it alone to characterize her current level."
      ],
      video: [
        "Shot creation — identify why the Valencia domestic two-point conversion improved relative to the Estepona sample.",
        "Free-throw generation — review the actions behind 15 FTA on 19 FGA in the four Valencia league games.",
        "Secondary playmaking — compare her role as a passer at Estepona and Valencia.",
        "Turnover context — classify the seven domestic Valencia turnovers and five EuroLeague turnovers before assigning a tactical cause.",
        "Rebounding and defensive role — verify matchup responsibility, switching and whether rebounds trigger transition."
      ]
    },
    {
      id: "eden-rotberg",
      name: "Eden Rotberg",
      team: "Elitzur Holon",
      position: "Guard",
      season: "2025–26",
      source: "User-supplied Eurobasket screenshot",
      competitions: [
        {
          name: "Israel Division A", club: "E. Ramla", games: 26, minutes: 865, points: 376,
          two_pm: 78, two_pa: 156, three_pm: 57, three_pa: 133, ftm: 49, fta: 60,
          oreb: 35, dreb: 76, rebounds: 111, assists: 55, steals: 28, blocks: 1, turnovers: 33
        },
        {
          name: "EuroCup", club: "E. Ramla", games: 8, minutes: 245, points: 109,
          two_pm: 21, two_pa: 41, three_pm: 16, three_pa: 43, ftm: 19, fta: 24,
          oreb: 9, dreb: 19, rebounds: 28, assists: 19, steals: 9, blocks: 2, turnovers: 19
        },
        {
          name: "European Championships", club: "Israel", games: 4, minutes: 77, points: 29,
          two_pm: 5, two_pa: 12, three_pm: 3, three_pa: 10, ftm: 10, fta: 12,
          oreb: 1, dreb: 2, rebounds: 3, assists: 11, steals: 3, blocks: 0, turnovers: 3
        }
      ],
      read: [
        "Rotberg's 2025–26 domestic profile combines efficient perimeter shooting with low turnover volume: 42.9% from three on 133 attempts and 55 assists against 33 turnovers across 26 games.",
        "Her EuroCup three-point percentage fell to 37.2% while turnover volume increased to 19 in eight games. The competition split is descriptive; the box-score data alone cannot establish why the change occurred.",
        "The four-game Israel sample shows a different playmaking profile, with 11 assists against three turnovers, but the sample is too small to treat as a stable baseline."
      ],
      video: [
        "Three-point profile — separate catch-and-shoot, movement and pull-up attempts behind ball screens.",
        "Pick-and-roll creation — identify how often she creates her own shot versus a teammate advantage.",
        "EuroCup turnovers — classify the 19 turnovers by pressure, passing read, handle and offensive foul.",
        "Late-clock decision-making — compare shot creation and passing decisions when the first action is stopped.",
        "National-team role — verify whether the strong assist-to-turnover sample reflects a different usage or lineup context."
      ]
    },
    {
      id: "tal-lev",
      name: "Tal Lev",
      team: "Elitzur Holon",
      position: "Small Forward",
      season: "2025–26",
      source: "Israel Basketball Association · official player table + official playoff box scores",
      sourceUrl: "https://ibasketball.co.il/league/wbl/player.asp?PlayerId=22090",
      competitions: [
        {
          name: "Israel WBL · Regular Season", club: "Hapoel Rishon LeZion", games: 11,
          minutes: 283.8, points: 111, rebounds: 50, assists: 40, turnovers: 39,
          two_pm: 21, two_pa: 41, three_pm: 19, three_pa: 55, ftm: 13, fta: 19,
          sourceNote: "Raw shooting totals reconstructed from official IBBA game box scores; season summary remains the cross-check."
        },
        {
          name: "Israel WBL · Playoffs", club: "Hapoel Rishon LeZion", games: 5, minutes: 166.1667, points: 61,
          two_pm: 7, two_pa: 19, three_pm: 14, three_pa: 42, ftm: 5, fta: 6,
          oreb: 4, dreb: 30, rebounds: 34, assists: 31, steals: 5, blocks: 1, turnovers: 16
        }
      ],
      read: [
        "The official IBBA regular-season sample is now stored with raw shooting totals from the game box scores. CourtIQ calculates 51.6% eFG, 53.3% TS and a 19.8% FT Rate from 96 field-goal attempts and 19 free-throw attempts.",
        "CourtIQ separately aggregated five official playoff box scores: 61 points, 34 rebounds and 31 assists in 166.2 minutes. The playoff sample produces a 1.94 AST/TO ratio.",
        "Her playoff shot mix was perimeter-heavy: 42 three-point attempts versus 19 two-point attempts. CourtIQ calculates 45.9% eFG and 47.9% TS from those verified playoff totals.",
        "A later signing report describes her full 16-game run at 11.2 points, 5.0 rebounds and 4.4 assists per game. CourtIQ keeps that report separate from the official regular-season table instead of blending incompatible samples."
      ],
      video: [
        "Turnover taxonomy — classify regular-season and playoff turnovers by passing read, handle, offensive foul and pressure.",
        "Creation profile — investigate the playoff playmaking load behind 31 assists in five games.",
        "Three-point profile — the playoff sample contains 42 three-point attempts versus 19 two-point attempts; separate catch-and-shoot from pull-up volume.",
        "Rim pressure — identify why the five-game playoff sample generated only six free-throw attempts.",
        "Role translation to Holon — verify how her creation and perimeter volume fit next to Eden Rotberg and Ashley Owusu."
      ]
    },
    {
      id: "adi-levy",
      name: "Adi Levy",
      team: "Elitzur Holon",
      position: "Center / Power Forward",
      season: "2025–26",
      source: "Israel Basketball Association · official player statistics",
      sourceUrl: "https://ibasketball.co.il/player/2669d2cdc6541fd3-17063670/",
      competitions: [
        {
          name: "Israel WBL", club: "Elitzur Holon", games: 9, minutes: 163.2, points: 54,
          two_pm: 26, two_pa: 49, three_pm: 0, three_pa: 0, ftm: 2, fta: 5,
          oreb: 4, dreb: 13, rebounds: 17, assists: 9, steals: 2, blocks: 2, turnovers: 3
        },
        {
          name: "Girls A Premier", club: "Elitzur Holon", games: 18, minutes: 594.7, points: 203,
          two_pm: 76, two_pa: 206, three_pm: 0, three_pa: 1, ftm: 51, fta: 93,
          oreb: 102, dreb: 138, rebounds: 240, assists: 28, steals: 24, blocks: 25, turnovers: 42
        }
      ],
      read: [
        "Levy's senior WBL sample is 9 games and 163.2 minutes: 54 points, 17 rebounds and 9 assists with only 3 turnovers.",
        "In the senior sample she made 26 of 49 two-point attempts and did not attempt a three. CourtIQ calculates 53.1% eFG, 52.7% TS and a 10.2% FT Rate from the verified totals.",
        "Her youth workload is materially different: 18 games, 203 points and 240 rebounds. CourtIQ keeps the youth competition separate from the senior WBL sample rather than blending levels.",
        "The youth totals show 102 offensive rebounds and 25 blocks across 18 games, while the senior sample is much smaller. Role translation to senior basketball therefore requires video verification."
      ],
      video: [
        "Senior finishing profile — classify the 49 two-point attempts by rim finish, post-up, cut, roll and put-back.",
        "Rebounding translation — compare her youth offensive-rebounding impact with her positioning and physical matchups in senior WBL minutes.",
        "Decision-making — investigate the senior 9 assists against 3 turnovers and identify whether possessions come from short-roll, post or perimeter reads.",
        "Free-throw generation — determine why the senior sample produced only five free-throw attempts despite an interior shot profile.",
        "Defensive role — verify screen coverage, rim protection, mobility and foul discipline against senior lineups."
      ]
    },
    {
      id: "maya-elmalich",
      name: "Maya Elmalich",
      team: "Elitzur Holon",
      position: "Guard",
      season: "2025–26",
      source: "Israel Basketball Association · official league statistics",
      sourceUrl: "https://ibasketball.co.il/league/2025-451/",
      competitions: [
        {
          name: "Girls A Premier · Regular Season", club: "A.S. Ramat Hasharon", games: 18,
          summaryOnly: true, mpg: 27.0, ppg: 21.3, rpg: 4.3, apg: 2.9, tovpg: 3.0,
          drebpg: 2.8, orebpg: 1.5, twoPct: 49.1, threePct: 32.0, ftPct: 72.7,
          spg: 3.7, foulsPg: 2.6, blocksForPg: 0.5, pir: 17.9, plusMinus: 0
        },
        {
          name: "Women's National League", club: "A.S. Ramat Hasharon Gal", games: 19,
          summaryOnly: true, mpg: 28.2, ppg: 14.2, rpg: 2.5, apg: 2.5, tovpg: 2.4,
          drebpg: 1.4, orebpg: 1.1, twoPct: 42.8, threePct: 33.6, ftPct: 68.1,
          spg: 2.1, foulsPg: 2.2, blocksForPg: 0.4, pir: 10.2, plusMinus: 0
        }
      ],
      read: [
        "The official IBBA regular-season youth sample lists 18 games at 21.3 points, 4.3 rebounds, 2.9 assists and 3.7 steals per game in 27.0 minutes.",
        "In the Women's National League, the official IBBA table lists 19 games at 14.2 points, 2.5 rebounds and 2.5 assists per game in 28.2 minutes.",
        "Her published shooting percentages were 49.1% from two, 32.0% from three and 72.7% from the line in Girls A Premier; the National League table lists 42.8%, 33.6% and 68.1% respectively.",
        "CourtIQ keeps the youth and senior National League samples separate. Raw attempt totals are not present in these league-table records, so eFG%, TS%, 3P Rate and FT Rate are not estimated from rounded percentages."
      ],
      video: [
        "Scoring translation — identify which actions generated the 21.3 PPG youth sample and how those actions translate against senior size and physicality.",
        "Turnover profile — classify the 3.0 turnovers per game in Girls A Premier and 2.4 in the National League by pressure, passing read, handle and offensive foul.",
        "Perimeter creation — separate catch-and-shoot, pull-up and off-screen three-point attempts rather than judging the 32–34% range without shot context.",
        "Point-of-attack defense — verify how the 3.7 steals per game youth sample was created and whether it reflects pressure, passing-lane activity or scheme.",
        "Role translation to Holon — evaluate on-ball versus off-ball usage next to the club's established creators."
      ]
    },
    {
      id: "stasha-carey",
      name: "Stasha Carey",
      team: "Elitzur Holon",
      position: "Power Forward",
      season: "2025–26",
      source: "Published 2025–26 Maccabi Ashdod season summary · FIBA identity cross-check",
      sourceUrl: "https://www.fiba.basketball/en/players/272992-stasha-carey",
      competitions: [
        {
          name: "Israel WBL · 2025–26", club: "Maccabi Bnot Ashdod",
          summaryOnly: true, games: null, mpg: null, ppg: 11.1, rpg: 7.5, apg: 2.0,
          tovpg: null, drebpg: null, orebpg: null, twoPct: null, threePct: null, ftPct: null,
          spg: null, foulsPg: null, blocksForPg: null, pir: null, plusMinus: null
        }
      ],
      read: [
        "A published 2025–26 Maccabi Ashdod season summary lists Carey at 11.1 points, 7.5 rebounds and 2.0 assists per game.",
        "FIBA lists Carey as a 188 cm American forward, providing an identity cross-check for the player record.",
        "The available 2025–26 summary does not expose verified shooting attempts, turnovers or minutes. CourtIQ therefore does not calculate eFG%, TS%, AST/TO, 3P Rate, FT Rate or per-40 metrics from this sample.",
        "Carey's box-score profile supports describing her as a productive rebounder in the Ashdod sample; tactical role and action type remain video-verification questions."
      ],
      video: [
        "Interior usage — classify touches by post-up, roll, cut, seal and offensive-rebound possession.",
        "Rebounding — separate box-out wins, pursuit rebounds and put-backs to understand the 7.5 RPG profile.",
        "Screen game — verify roll frequency, short-roll decisions and screening impact.",
        "Defensive role — identify primary matchups, pick-and-roll coverage and rim-protection responsibilities.",
        "Transition to Holon — evaluate how her interior usage fits alongside Holon's existing creators and spacing."
      ]
    }
  ];

  const r1 = n => Math.round(n * 10) / 10;
  const r2 = n => Math.round(n * 100) / 100;
  const safe = (a,b) => b ? a / b : 0;

  function metrics(s) {
    if (s.summaryOnly) {
      return {
        ppg: s.ppg, rpg: s.rpg, apg: s.apg, twoPct: s.twoPct, threePct: s.threePct, ftPct: s.ftPct,
        efg: null, ts: null, astTo: r2(safe(s.apg, s.tovpg)), threeRate: null, ftRate: null,
        pts40: r1(safe(s.ppg * 40, s.mpg)), ast40: r1(safe(s.apg * 40, s.mpg)), tov40: r1(safe(s.tovpg * 40, s.mpg))
      };
    }
    const fgm = s.two_pm + s.three_pm;
    const fga = s.two_pa + s.three_pa;
    return {
      ppg: r1(safe(s.points, s.games)),
      rpg: r1(safe(s.rebounds, s.games)),
      apg: r1(safe(s.assists, s.games)),
      twoPct: r1(safe(s.two_pm, s.two_pa) * 100),
      threePct: r1(safe(s.three_pm, s.three_pa) * 100),
      ftPct: r1(safe(s.ftm, s.fta) * 100),
      efg: r1(safe(fgm + .5 * s.three_pm, fga) * 100),
      ts: r1(safe(s.points, 2 * (fga + .44 * s.fta)) * 100),
      astTo: r2(safe(s.assists, s.turnovers)),
      threeRate: r1(safe(s.three_pa, fga) * 100),
      ftRate: r1(safe(s.fta, fga) * 100),
      pts40: r1(safe(s.points * 40, s.minutes)),
      ast40: r1(safe(s.assists * 40, s.minutes)),
      tov40: r1(safe(s.turnovers * 40, s.minutes))
    };
  }

  function competitionCard(s) {
    const m = metrics(s);
    const pct = v => v == null ? "—" : v + "%";
    const minutesLabel = s.summaryOnly ? s.mpg : r1(s.minutes/s.games);
    const sourceTotals = s.summaryOnly
      ? `Published season averages · MPG ${s.mpg} · PPG ${s.ppg} · DREB ${s.drebpg ?? "—"} · OREB ${s.orebpg ?? "—"} · RPG ${s.rpg} · APG ${s.apg} · 2P% ${s.twoPct} · 3P% ${s.threePct} · FT% ${s.ftPct} · STL ${s.spg} · TO ${s.tovpg} · PF ${s.foulsPg ?? "—"} · BLK ${s.blocksForPg ?? "—"} · PIR ${s.pir ?? "—"} · +/- ${s.plusMinus ?? "—"}`
      : `MIN ${r1(s.minutes)} · PTS ${s.points} · 2P ${s.two_pm}/${s.two_pa} · 3P ${s.three_pm}/${s.three_pa} · FT ${s.ftm}/${s.fta} · REB ${s.rebounds} · AST ${s.assists} · TO ${s.turnovers}`;
    const phase = /regular season/i.test(s.name) ? "REGULAR SEASON" : (/playoffs/i.test(s.name) ? "PLAYOFFS" : s.name);
    return `<div class="piComp card">
      <div class="piPhase">${phase}</div>
      <div class="piCompHead"><div><small>${s.name}</small><b>${s.club}</b></div><span>${s.games} G · ${minutesLabel} MPG</span></div>
      <div class="piMetricGrid">
        <div><small>PPG</small><b>${m.ppg}</b></div><div><small>RPG</small><b>${m.rpg}</b></div><div><small>APG</small><b>${m.apg}</b></div>
        ${m.efg==null?"":`<div><small>eFG%</small><b>${pct(m.efg)}</b></div><div><small>TS%</small><b>${pct(m.ts)}</b></div>`}
        <div><small>AST/TO</small><b>${m.astTo}</b></div>
        <div><small>2P%</small><b>${pct(m.twoPct)}</b></div><div><small>3P%</small><b>${pct(m.threePct)}</b></div><div><small>FT%</small><b>${pct(m.ftPct)}</b></div>
        ${m.threeRate==null?"":`<div><small>3P Rate</small><b>${pct(m.threeRate)}</b></div><div><small>FT Rate</small><b>${pct(m.ftRate)}</b></div>`}
        <div><small>PTS / 40</small><b>${m.pts40}</b></div>
        ${s.summaryOnly?`<div><small>STL</small><b>${s.spg}</b></div><div><small>TO</small><b>${s.tovpg}</b></div><div><small>PIR</small><b>${s.pir}</b></div>`:""}
      </div>
      ${s.summaryOnly?'<div class="piCaution">Attempt totals are not published in this source table, so CourtIQ does not display eFG%, TS%, 3P Rate or FT Rate for this sample.</div>':""}
      <details><summary>${s.summaryOnly ? "Verified published averages" : "Verified source totals"}</summary>
        <div class="piRaw">${sourceTotals}</div>
      </details>
    </div>`;
  }

  function playerDetail(p) {
    const signalRows = [
      ["PPG", x=>metrics(x).ppg],
      ["TS%", x=>metrics(x).ts==null?"—":metrics(x).ts+"%"],
      ["eFG%", x=>metrics(x).efg==null?"—":metrics(x).efg+"%"],
      ["AST/TO", x=>metrics(x).astTo],
      ["FT Rate", x=>metrics(x).ftRate==null?"—":metrics(x).ftRate+"%"]
    ];
    return `<div class="piHero">
      <div><small>PLAYER INTELLIGENCE · ${p.season}</small><h2>${p.name}</h2><p>${p.position} · ${p.team}</p></div>
      <span class="piStatus">● DATA CONFIRMED</span>
    </div>
    <div class="piSource">SOURCE · ${p.source} · Advanced metrics calculated by CourtIQ from displayed totals.</div>
    ${p.id==="tal-lev"?'<div class="piSampleNotice"><b>2025–26 DATA SPLIT</b><span>Regular Season and Playoffs are shown as separate verified samples below.</span></div>':""}
    <div class="piCompare">${p.competitions.map(competitionCard).join("")}</div>
    <div class="piDelta card piSignal">
      <h3>Competition Signal</h3>
      <table class="stats"><tr><th>Metric</th>${p.competitions.map(x=>`<th>${x.name}</th>`).join("")}</tr>
      ${signalRows.map(([label,fn])=>`<tr><td>${label}</td>${p.competitions.map(x=>`<td>${fn(x)}</td>`).join("")}</tr>`).join("")}</table>
    </div>
    <div class="piSections">
      <section class="card"><h3>COURTIQ READ</h3>${p.read.map(x=>`<p>${x}</p>`).join("")}<div class="piCaution">Descriptive statistical interpretation only. Tactical causation requires video.</div></section>
      <section class="card"><h3>🎬 WHAT SHOULD I WATCH?</h3>${p.video.map((x,i)=>`<div class="piWatch"><span>${i+1}</span><p>${x}</p></div>`).join("")}<div class="piVerify">VIDEO VERIFICATION REQUIRED</div></section>
    </div>`;
  }

  function openTeams() {
    const modal = document.createElement("div");
    modal.className = "modal piModal";
    modal.innerHTML = `<div class="modalCard piShell teamShell"><button class="modalX">×</button>
      <div class="teamBreadcrumb"><button data-team-home>Teams</button><span>›</span><span id="teamCrumb">Countries</span></div>
      <div id="teamWorkspace"></div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".modalX").onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    const workspace = modal.querySelector("#teamWorkspace");
    const crumb = modal.querySelector("#teamCrumb");

    function countries() {
      crumb.textContent = "Countries";
      workspace.innerHTML = `<div class="teamPageHead"><small class="eyebrow">COURTIQ · TEAMS</small><h2>Teams</h2><p>Select a country to open the club intelligence workspace.</p></div>
        <div class="teamDirectory"><button class="teamTile" data-country-israel><span class="teamFlag">IL</span><div><b>Israel</b><small>1 club in workspace</small></div><span>→</span></button></div>`;
      workspace.querySelector("[data-country-israel]").onclick = israel;
    }

    function israel() {
      crumb.textContent = "Israel";
      workspace.innerHTML = `<div class="teamPageHead"><small class="eyebrow">TEAMS · ISRAEL</small><h2>Israel</h2><p>Women's basketball club intelligence.</p></div>
        <div class="teamDirectory"><button class="teamTile clubTile" data-club-holon><span class="teamMonogram">EH</span><div><b>Elitzur Holon</b><small>2026–27 · Preseason Intelligence · ${players.length} players loaded</small></div><span>→</span></button></div>`;
      workspace.querySelector("[data-club-holon]").onclick = holon;
    }

    function holon() {
      crumb.textContent = "Israel › Elitzur Holon";
      workspace.innerHTML = `<div class="teamPageHead clubProfileHead"><div><small class="eyebrow">ISRAEL · WOMEN</small><h2>Elitzur Holon</h2><p>2026–27 preseason scouting workspace</p></div><span class="piStatus">● DATA CONFIRMED</span></div>
        <div class="teamSummary card"><div><small>PLAYERS LOADED</small><b>${players.length}</b></div><div><small>DATA MODEL</small><b>Verified source totals</b></div><div><small>ANALYSIS</small><b>Deterministic advanced metrics</b></div><div><small>TACTICAL CLAIMS</small><b>Video verification required</b></div></div>
        <div class="piRoster teamRoster">${players.map((p,i)=>`<button data-team-player="${p.id}" class="${i===0?"sel":""}" id="team-player-${p.id}">${p.name}<small>${p.position}</small></button>`).join("")}</div>
        <div id="teamPlayerDetail">${playerDetail(players[0])}</div>`;
      workspace.querySelectorAll("[data-team-player]").forEach(btn => btn.onclick = () => {
        workspace.querySelectorAll("[data-team-player]").forEach(x=>x.classList.remove("sel"));
        btn.classList.add("sel");
        const p = players.find(x=>x.id===btn.dataset.teamPlayer);
        workspace.querySelector("#teamPlayerDetail").innerHTML = playerDetail(p);
      });
    }

    modal.querySelector("[data-team-home]").onclick = countries;
    countries();
  }

  function openPlayers() {
    const modal = document.createElement("div");
    modal.className = "modal piModal";
    modal.innerHTML = `<div class="modalCard piShell"><button class="modalX">×</button>
      <div class="piTop"><small class="eyebrow">COURTIQ · PLAYER INTELLIGENCE</small><h2>Elitzur Holon</h2><p>2026–27 preseason scouting workspace</p></div>
      <div class="piRoster">${players.map((p,i)=>`<button data-player="${p.id}" class="${i===0?"sel":""}" id="player-${p.id}">${p.name}<small>${p.position}</small></button>`).join("")}</div>
      <div id="piDetail">${playerDetail(players[0])}</div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".modalX").onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.querySelectorAll("[data-player]").forEach(btn => btn.onclick = () => {
      modal.querySelectorAll("[data-player]").forEach(x=>x.classList.remove("sel"));
      btn.classList.add("sel");
      const p = players.find(x=>x.id===btn.dataset.player);
      modal.querySelector("#piDetail").innerHTML = playerDetail(p);
    });
  }

  document.addEventListener("click", e => {
    const item = e.target.closest(".menu div");
    if (item && item.textContent.includes("Teams")) openTeams();
    if ((item && item.textContent.includes("Players")) || e.target.closest("#playersHub")) openPlayers();
  });

  window.CourtIQPlayers = { players, metrics, openPlayers, openTeams };
  window.COURTIQ_BUILD = "076";
})();