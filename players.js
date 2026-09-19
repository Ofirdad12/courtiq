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
      position: "Forward",
      season: "2025–26",
      source: "Israel Basketball Association · Women's Premier League 2025–26",
      sourceUrl: "https://ibasketball.co.il/league/2025-51/",
      competitions: [
        {
          name: "Israel Women's Premier League", club: "Hapoel Rishon LeZion", games: 16,
          summaryOnly: true, mpg: 28.5, ppg: 11.2, rpg: 5.0, apg: 4.4,
          twoPct: 45.5, threePct: 35.6, ftPct: 66.7, spg: 1.0, tovpg: 3.3
        }
      ],
      read: [
        "Lev's verified 2025–26 league sample shows 11.2 points, 5.0 rebounds and 4.4 assists in 28.5 minutes across 16 games.",
        "Her 4.4 assists against 3.3 turnovers produce a 1.33 AST/TO ratio. That combination points to meaningful creation volume with ball security as a clear investigation area.",
        "She shot 35.6% from three and 45.5% on two-point attempts in the published league sample. Shot-attempt totals are not exposed in the verified season table used here, so CourtIQ does not manufacture eFG% or TS%."
      ],
      video: [
        "Turnover taxonomy — classify the 3.3 turnovers per game by passing read, handle, offensive foul and pressure.",
        "Creation profile — separate pick-and-roll, drive-and-kick, transition and secondary-side assists.",
        "Three-point profile — identify catch-and-shoot versus pull-up volume behind the 35.6% season mark.",
        "Two-point attempts — determine how much of the 45.5% comes at the rim, from cuts or from mid-range creation.",
        "Role translation to Holon — verify how her creation fits next to Eden Rotberg and Ashley Owusu rather than assuming the same Rishon LeZion role."
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
      ? `Published season averages · MPG ${s.mpg} · PPG ${s.ppg} · RPG ${s.rpg} · APG ${s.apg} · 2P% ${s.twoPct} · 3P% ${s.threePct} · FT% ${s.ftPct} · STL ${s.spg} · TO ${s.tovpg}`
      : `MIN ${s.minutes} · PTS ${s.points} · 2P ${s.two_pm}/${s.two_pa} · 3P ${s.three_pm}/${s.three_pa} · FT ${s.ftm}/${s.fta} · REB ${s.rebounds} · AST ${s.assists} · TO ${s.turnovers}`;
    return `<div class="piComp card">
      <div class="piCompHead"><div><small>${s.name}</small><b>${s.club}</b></div><span>${s.games} G · ${minutesLabel} MPG</span></div>
      <div class="piMetricGrid">
        <div><small>PPG</small><b>${m.ppg}</b></div><div><small>RPG</small><b>${m.rpg}</b></div><div><small>APG</small><b>${m.apg}</b></div>
        <div><small>eFG%</small><b>${pct(m.efg)}</b></div><div><small>TS%</small><b>${pct(m.ts)}</b></div><div><small>AST/TO</small><b>${m.astTo}</b></div>
        <div><small>2P%</small><b>${pct(m.twoPct)}</b></div><div><small>3P%</small><b>${pct(m.threePct)}</b></div><div><small>FT%</small><b>${pct(m.ftPct)}</b></div>
        <div><small>3P Rate</small><b>${pct(m.threeRate)}</b></div><div><small>FT Rate</small><b>${pct(m.ftRate)}</b></div><div><small>PTS / 40</small><b>${m.pts40}</b></div>
      </div>
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
        <div class="piRoster teamRoster">${players.map((p,i)=>`<button data-team-player="${p.id}" class="${i===0?"sel":""}">${p.name}<small>${p.position}</small></button>`).join("")}</div>
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
      <div class="piRoster">${players.map((p,i)=>`<button data-player="${p.id}" class="${i===0?"sel":""}">${p.name}<small>${p.position}</small></button>`).join("")}</div>
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
})();