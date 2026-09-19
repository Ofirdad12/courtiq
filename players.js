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
      season: "2025–26 · EuroLeague sample + prior-season baseline",
      source: "FIBA official competition data; Eurobasket profile link supplied by user",
      comparisonLabel: "2024–25 Zaragoza → 2025–26 Valencia",
      competitions: [
        {
          name: "EuroLeague Women 2024–25", club: "Casademont Zaragoza", games: 13, minutes: 308, points: 97,
          two_pm: 24, two_pa: 71, three_pm: 7, three_pa: 17, ftm: 28, fta: 35,
          oreb: 16, dreb: 45, rebounds: 61, assists: 29, steals: 8, blocks: 2, turnovers: 31
        },
        {
          name: "EuroLeague Women 2025–26", club: "Valencia Basket", games: 3, minutes: 46, points: 12,
          two_pm: 4, two_pa: 9, three_pm: 1, three_pa: 4, ftm: 1, fta: 2,
          oreb: 4, dreb: 5, rebounds: 9, assists: 1, steals: 1, blocks: 0, turnovers: 5
        }
      ],
      read: [
        "Atkinson's 2024–25 EuroLeague profile was low-volume but multi-category: 7.5 points, 4.7 rebounds and 2.2 assists per game across 13 appearances.",
        "The 2025–26 Valencia EuroLeague sample is only three games, so its lower scoring and playmaking output should be treated as a small-sample signal rather than a stable performance level.",
        "Across the verified European samples, her shot mix is weighted toward two-point attempts. The next scouting question is where those attempts originate and how much creation comes on-ball versus off-ball."
      ],
      video: [
        "Two-point shot creation — separate transition, cuts, post touches, drives and pick-and-roll possessions.",
        "Secondary playmaking — identify where her assists are created and whether she functions as a connector or primary initiator.",
        "Turnover context — classify the 2025–26 EuroLeague turnovers before drawing conclusions from the small sample.",
        "Defensive versatility — verify matchups, switching responsibility and help rotations on film.",
        "Rebounding impact — determine whether her defensive rebounds trigger transition or primarily finish possessions."
      ]
    }
  ];

  const r1 = n => Math.round(n * 10) / 10;
  const r2 = n => Math.round(n * 100) / 100;
  const safe = (a,b) => b ? a / b : 0;

  function metrics(s) {
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
    return `<div class="piComp card">
      <div class="piCompHead"><div><small>${s.name}</small><b>${s.club}</b></div><span>${s.games} G · ${r1(s.minutes/s.games)} MPG</span></div>
      <div class="piMetricGrid">
        <div><small>PPG</small><b>${m.ppg}</b></div><div><small>RPG</small><b>${m.rpg}</b></div><div><small>APG</small><b>${m.apg}</b></div>
        <div><small>eFG%</small><b>${m.efg}%</b></div><div><small>TS%</small><b>${m.ts}%</b></div><div><small>AST/TO</small><b>${m.astTo}</b></div>
        <div><small>2P%</small><b>${m.twoPct}%</b></div><div><small>3P%</small><b>${m.threePct}%</b></div><div><small>FT%</small><b>${m.ftPct}%</b></div>
        <div><small>3P Rate</small><b>${m.threeRate}%</b></div><div><small>FT Rate</small><b>${m.ftRate}%</b></div><div><small>PTS / 40</small><b>${m.pts40}</b></div>
      </div>
      <details><summary>Verified source totals</summary>
        <div class="piRaw">MIN ${s.minutes} · PTS ${s.points} · 2P ${s.two_pm}/${s.two_pa} · 3P ${s.three_pm}/${s.three_pa} · FT ${s.ftm}/${s.fta} · REB ${s.rebounds} · AST ${s.assists} · TO ${s.turnovers}</div>
      </details>
    </div>`;
  }

  function playerDetail(p) {
    const a = metrics(p.competitions[0]), b = metrics(p.competitions[1]);
    return `<div class="piHero">
      <div><small>PLAYER INTELLIGENCE · ${p.season}</small><h2>${p.name}</h2><p>${p.position} · ${p.team}</p></div>
      <span class="piStatus">● DATA CONFIRMED</span>
    </div>
    <div class="piSource">SOURCE · ${p.source} · Advanced metrics calculated by CourtIQ from displayed totals.</div>
    <div class="piCompare">${p.competitions.map(competitionCard).join("")}</div>
    <div class="piDelta card">
      <h3>Competition Signal</h3>
      <div><b>AST/TO</b><span>${a.astTo} → ${b.astTo}</span><small>${p.comparisonLabel||"Competition A → Competition B"}</small></div>
      <div><b>TS%</b><span>${a.ts}% → ${b.ts}%</span><small>${p.comparisonLabel||"Competition A → Competition B"}</small></div>
      <div><b>FT Rate</b><span>${a.ftRate}% → ${b.ftRate}%</span><small>${p.comparisonLabel||"Competition A → Competition B"}</small></div>
      <div><b>PPG</b><span>${a.ppg} → ${b.ppg}</span><small>${p.comparisonLabel||"Competition A → Competition B"}</small></div>
    </div>
    <div class="piSections">
      <section class="card"><h3>COURTIQ READ</h3>${p.read.map(x=>`<p>${x}</p>`).join("")}<div class="piCaution">Descriptive statistical interpretation only. Tactical causation requires video.</div></section>
      <section class="card"><h3>🎬 WHAT SHOULD I WATCH?</h3>${p.video.map((x,i)=>`<div class="piWatch"><span>${i+1}</span><p>${x}</p></div>`).join("")}<div class="piVerify">VIDEO VERIFICATION REQUIRED</div></section>
    </div>`;
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
    if (item && item.textContent.includes("Players")) openPlayers();
  });

  window.CourtIQPlayers = { players, metrics, openPlayers };
})();