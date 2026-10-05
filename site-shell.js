(() => {
  const data = window.CourtIQData;
  if (data?.isSignedIn?.()) return;

  const root = document.getElementById("app");
  if (!root) return;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function openWorkspace() {
    document.body.classList.remove("publicSiteMode");
    if (typeof render === "function") render();
    window.scrollTo(0, 0);
  }

  function login() {
    if (typeof openAccount === "function") openAccount("signin");
  }

  document.body.classList.add("publicSiteMode");
  root.innerHTML = `
    <div class="publicSite">
      <header class="publicNav">
        <a class="publicBrand" href="#top" aria-label="CourtIQ home">
          <span class="publicMark">C</span>
          <span><b>CourtIQ</b><small>Basketball Intelligence</small></span>
        </a>
        <nav aria-label="Public navigation">
          <a href="#platform">Platform</a>
          <a href="#workflow">Workflow</a>
          <a href="#trust">Trust</a>
        </nav>
        <button class="publicGhost" id="publicLogin">Pilot login</button>
      </header>

      <main id="top">
        <section class="publicHero">
          <div class="publicHeroCopy">
            <span class="publicEyebrow">COURTIQ · COACHING INTELLIGENCE PLATFORM</span>
            <h1>Turn official basketball data into decisions.</h1>
            <p>CourtIQ connects verified game data, advanced analytics, player and lineup intelligence, scouting memory and video evidence in one coaching workspace.</p>
            <div class="publicActions">
              <button class="publicPrimary" id="publicWorkspace">Explore workspace</button>
              <button class="publicSecondary" id="publicSignin">Sign in</button>
            </div>
            <div class="publicProof">
              <span>Official sources</span>
              <span>Deterministic metrics</span>
              <span>Season memory</span>
              <span>Evidence-first scouting</span>
            </div>
          </div>
          <div class="publicHeroPanel" aria-label="CourtIQ workflow preview">
            <div class="previewTop"><span>LIVE PRODUCT FLOW</span><b>COURTIQ</b></div>
            <div class="previewScore"><small>OFFICIAL GAME</small><strong>Import → Verify → Analyze</strong><span>IBBA · FIBA · EuroLeague · PLK · LiveStats</span></div>
            <div class="previewGrid">
              <div><small>TEAM</small><b>eFG% · TOV% · ORB% · FTr</b></div>
              <div><small>PLAYER</small><b>Role · trends · efficiency</b></div>
              <div><small>LINEUPS</small><b>5-man combinations</b></div>
              <div><small>COACH</small><b>3 tendencies · 3 decisions</b></div>
            </div>
            <div class="previewSignal"><i></i><span>DATA → EVIDENCE → DECISION SUPPORT</span></div>
          </div>
        </section>

        <section class="publicSection" id="platform">
          <div class="sectionIntro"><span>THE PLATFORM</span><h2>One system, from game import to coach brief.</h2><p>The analytical engines already inside CourtIQ are presented as a single product instead of disconnected tools.</p></div>
          <div class="publicFeatureGrid">
            <article><span>01</span><h3>Games & Import</h3><p>Paste an official game URL. CourtIQ validates the source, calculates metrics and stores a reusable game record.</p></article>
            <article><span>02</span><h3>Team Analytics</h3><p>Four Factors, pace, possession control, shot efficiency, rebounding and game-to-game trends.</p></article>
            <article><span>03</span><h3>Player Intelligence</h3><p>Advanced player profiles, verified role markers, form changes, usage signals and comparison views.</p></article>
            <article><span>04</span><h3>Lineups & Shot Context</h3><p>Lineup combinations, on-court intervals, shot context and links back to play-by-play evidence when available.</p></article>
            <article><span>05</span><h3>Opponent Scouting</h3><p>Season memory converts stored games into evidence-backed tendencies, alerts and matchup questions.</p></article>
            <article><span>06</span><h3>Coach View</h3><p>A compact preparation layer built for coaching decisions rather than analyst-only dashboards.</p></article>
          </div>
        </section>

        <section class="publicWorkflow" id="workflow">
          <div class="sectionIntro"><span>WORKFLOW</span><h2>Built around how a basketball staff actually works.</h2></div>
          <div class="workflowRail">
            <div><b>1</b><h3>Import</h3><p>Official URL or verified source.</p></div>
            <div><b>2</b><h3>Validate</h3><p>Totals, source quality and data integrity.</p></div>
            <div><b>3</b><h3>Calculate</h3><p>Transparent basketball metrics.</p></div>
            <div><b>4</b><h3>Remember</h3><p>Team and player season memory.</p></div>
            <div><b>5</b><h3>Prepare</h3><p>Scouting brief and video questions.</p></div>
          </div>
        </section>

        <section class="publicTrust" id="trust">
          <div>
            <span class="publicEyebrow">COURTIQ ANALYSIS STANDARD</span>
            <h2>Box-score facts stay separate from tactical claims.</h2>
            <p>CourtIQ can calculate outcomes from official data. Tactical causation is promoted only when the supporting play-by-play or video evidence exists.</p>
          </div>
          <div class="trustStack">
            <div><b>01</b><span>DATA</span><small>What officially happened</small></div>
            <div><b>02</b><span>FINDING</span><small>What the numbers confirm</small></div>
            <div><b>03</b><span>INTERPRETATION</span><small>What requires context</small></div>
            <div><b>04</b><span>VIDEO</span><small>What supports the tactical conclusion</small></div>
          </div>
        </section>

        <section class="publicCta">
          <div><span>COURTIQ PILOT · 2026/27</span><h2>Open the basketball intelligence workspace.</h2></div>
          <div><button class="publicPrimary" id="publicWorkspaceBottom">Explore workspace</button><button class="publicSecondary" id="publicLoginBottom">Pilot login</button></div>
        </section>
      </main>
      <footer class="publicFooter"><b>CourtIQ</b><span>Basketball Intelligence Platform</span><small>Data → Evidence → Decision Support</small></footer>
    </div>`;

  ["publicWorkspace", "publicWorkspaceBottom"].forEach(id => document.getElementById(id)?.addEventListener("click", openWorkspace));
  ["publicLogin", "publicSignin", "publicLoginBottom"].forEach(id => document.getElementById(id)?.addEventListener("click", login));
})();
