(() => {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeName = (value) => String(value || "CourtIQ").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  const val = (value, suffix = "") => value === null || value === undefined || value === "" ? "—" : esc(value) + suffix;
  const pct = (value) => value === null || value === undefined || value === "" ? "—" : esc(value) + "%";

  function printDocument(title, body, orientation = "landscape") {
    const popup = window.open("", "_blank");
    if (!popup) {
      alert("CourtIQ could not open the PDF export window. Allow pop-ups for this site and try again.");
      return;
    }
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
      @page{size:A4 ${orientation};margin:10mm}
      *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;background:#fff;font-size:10px;line-height:1.35}
      .header{border-bottom:2px solid #111827;padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between;gap:20px;align-items:flex-end}.brand{font-size:22px;font-weight:800;letter-spacing:.5px}.brand span{color:#6d5ce7}.meta{text-align:right;color:#4b5563;font-size:9px}.score{font-size:19px;font-weight:800;margin-top:4px}.section{margin:12px 0;break-inside:avoid}.section h2{font-size:13px;margin:0 0 6px}.section h3{font-size:11px;margin:10px 0 5px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.teamBlock{break-inside:avoid-page;margin-bottom:12px}
      table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #d1d5db;padding:4px 5px;text-align:center;vertical-align:middle}th{background:#f3f4f6;font-weight:700}td:first-child,th:first-child{text-align:left}.small{font-size:8px}.nowrap{white-space:nowrap}.note{font-size:8px;color:#6b7280;margin-top:6px}.footer{margin-top:10px;border-top:1px solid #d1d5db;padding-top:5px;color:#6b7280;font-size:8px;text-align:right}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>${body}<div class="footer">CourtIQ · Basketball Intelligence · PDF export</div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),180));<\/script></body></html>`);
    popup.document.close();
  }

  function header(G, reportName) {
    const source = G.sourceLabel || (G._dbId ? "Official saved game" : "CourtIQ game report");
    return `<div class="header"><div><div class="brand">Court<span>IQ</span></div><div>${esc(reportName)}</div><div class="score">${esc(G.home)} ${esc(G.hs)} - ${esc(G.as)} ${esc(G.away)}</div></div><div class="meta">${esc(G.comp || "")}<br>${esc(G.date || "")}<br>${esc(source)}</div></div>`;
  }

  function teamPdf(G) {
    const stats = (G.stats || []).map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("");
    const factors = (G.factors || []).map((r) => `<tr><td>${esc(r[0])}</td><td>${pct(r[1])}</td><td>${pct(r[2])}</td></tr>`).join("");
    let splits = "";
    if (G.splits?.home && G.splits?.away) {
      const rows = [
        ["Points", "points", false], ["Minutes", "minutes", false], ["eFG%", "efg", true], ["TS%", "ts", true],
        ["AST/TO", "ast_to", false], ["OREB", "oreb", false], ["DREB", "dreb", false]
      ].map(([label,key,isPct]) => `<tr><td>${label}</td><td>${isPct?pct(G.splits.home.starters?.[key]):val(G.splits.home.starters?.[key])}</td><td>${isPct?pct(G.splits.home.bench?.[key]):val(G.splits.home.bench?.[key])}</td><td>${isPct?pct(G.splits.away.starters?.[key]):val(G.splits.away.starters?.[key])}</td><td>${isPct?pct(G.splits.away.bench?.[key]):val(G.splits.away.bench?.[key])}</td></tr>`).join("");
      splits = `<div class="section"><h2>Starters vs Bench</h2><table><thead><tr><th>Metric</th><th>${esc(G.home)} · 5</th><th>${esc(G.home)} · Bench</th><th>${esc(G.away)} · 5</th><th>${esc(G.away)} · Bench</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    const body = `${header(G,"Team Stats")}<div class="grid2"><div class="section"><h2>Team Stats</h2><table><thead><tr><th>Metric</th><th>${esc(G.home)}</th><th>${esc(G.away)}</th></tr></thead><tbody>${stats}</tbody></table></div><div class="section"><h2>Four Factors</h2><table><thead><tr><th>Metric</th><th>${esc(G.home)}</th><th>${esc(G.away)}</th></tr></thead><tbody>${factors}</tbody></table></div></div>${splits}`;
    printDocument(`CourtIQ-Team-Stats-${safeName(G.home)}-vs-${safeName(G.away)}`, body, "landscape");
  }

  function playerBasicRows(G, team, side, players) {
    return (players || []).map((p) => {
      const role = window.CourtIQGameIntelligence?.role?.(G, side, p) || (p.starter ? "Starter" : "Bench");
      return `<tr><td>${esc(p.name)}</td><td>${esc(role)}</td><td>${val(p.minutes)}</td><td>${val(p.points)}</td><td>${val(p.rebounds)}</td><td>${val(p.ast)}</td><td>${pct(p.fg_pct)}</td><td>${pct(p.two_pct)}</td><td>${pct(p.three_pct)}</td><td>${pct(p.ft_pct)}</td><td>${val(p.plus_minus)}</td></tr>`;
    }).join("");
  }

  function playerAdvancedRows(players) {
    return (players || []).map((p) => `<tr><td>${esc(p.name)}</td><td>${pct(p.efg)}</td><td>${pct(p.ts)}</td><td>${val(p.pps)}</td><td>${pct(p.three_pa_rate)}</td><td>${val(p.ast_to)}</td><td>${val(p.points_per_40)}</td><td>${val(p.rebounds_per_40)}</td><td>${val(p.assists_per_40)}</td><td>${pct(p.play_end_share)}</td><td>${pct(p.oreb_pct)}</td><td>${pct(p.dreb_pct)}</td><td>${val(p.box_impact_per_40)}</td></tr>`).join("");
  }

  function playerTeamBlock(G, team, side, players) {
    return `<div class="teamBlock"><h2>${esc(team)} · Player Stats</h2><h3>Box Score & Shooting</h3><table class="small"><thead><tr><th>Player</th><th>Role</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG%</th><th>2P%</th><th>3P%</th><th>FT%</th><th>+/-</th></tr></thead><tbody>${playerBasicRows(G,team,side,players)}</tbody></table><h3>Advanced</h3><table class="small"><thead><tr><th>Player</th><th>eFG%</th><th>TS%</th><th>PPS</th><th>3PA Rate</th><th>AST/TO</th><th>PTS/40</th><th>REB/40</th><th>AST/40</th><th>Play-end%</th><th>OREB%</th><th>DREB%</th><th>Impact/40</th></tr></thead><tbody>${playerAdvancedRows(players)}</tbody></table></div>`;
  }

  function playersPdf(G) {
    if (!G.players?.home?.length && !G.players?.away?.length) {
      alert("Player Stats are not available for this game yet.");
      return;
    }
    const body = `${header(G,"Player Stats")}<div class="section">${playerTeamBlock(G,G.home,"home",G.players?.home||[])}${playerTeamBlock(G,G.away,"away",G.players?.away||[])}</div><div class="note">Advanced player metrics are CourtIQ calculations from the official box score. Tactical impact still requires video/context.</div>`;
    printDocument(`CourtIQ-Player-Stats-${safeName(G.home)}-vs-${safeName(G.away)}`, body, "landscape");
  }

  function installButtons() {
    const G = window.CourtIQActiveGame;
    if (!G) return;
    const teamTitle = document.querySelector('[data-game-view="team"] .viewTitle');
    if (teamTitle && !teamTitle.querySelector(".pdfTeamExport")) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "importBtn secondaryAction pdfViewExport pdfTeamExport";
      b.textContent = "EXPORT TEAM PDF";
      b.onclick = () => teamPdf(window.CourtIQActiveGame || G);
      teamTitle.appendChild(b);
    }
    const playerTitle = document.querySelector('[data-game-view="player"] .viewTitle');
    if (playerTitle && !playerTitle.querySelector(".pdfPlayerExport")) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "importBtn secondaryAction pdfViewExport pdfPlayerExport";
      b.textContent = "EXPORT PLAYER PDF";
      b.onclick = () => playersPdf(window.CourtIQActiveGame || G);
      playerTitle.appendChild(b);
    }
  }

  const style = document.createElement("style");
  style.textContent = `.pdfViewExport{margin-left:auto;white-space:nowrap}.viewTitle{gap:12px;align-items:center}.viewTitle>span{margin-left:auto}.viewTitle>.pdfViewExport{margin-left:8px}@media(max-width:780px){.viewTitle{flex-wrap:wrap}.viewTitle>.pdfViewExport{width:100%;margin-left:0}}`;
  document.head.appendChild(style);

  let queued = false;
  const queueInstall = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; installButtons(); });
  };
  queueInstall();
  const root = document.getElementById("app") || document.body;
  new MutationObserver(queueInstall).observe(root, {childList:true, subtree:true});

  window.CourtIQPdfExport = {team:teamPdf, players:playersPdf, install:installButtons};
})();
