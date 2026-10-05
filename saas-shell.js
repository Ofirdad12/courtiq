(() => {
  const SITE_ID = 'courtiq-site-shell';
  const state = { mode: null };

  const signedIn = () => !!window.CourtIQData?.isSignedIn?.();
  const accountLabel = () => window.CourtIQData?.user?.()?.email || (signedIn() ? 'Club account' : 'Pilot access');
  const activeGame = () => window.CourtIQActiveGame || {};

  function routeMode() {
    const hash = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (hash === 'home' || hash === 'about' || hash === 'product') return 'home';
    if (hash === 'workspace' || hash === 'app') return 'workspace';
    return signedIn() ? 'workspace' : 'home';
  }

  function setMode(mode, push = true) {
    state.mode = mode;
    const app = document.getElementById('app');
    const site = document.getElementById(SITE_ID);
    if (app) app.hidden = mode !== 'workspace';
    if (site) site.hidden = mode !== 'home';
    document.body.classList.toggle('cq-public-mode', mode === 'home');
    document.body.classList.toggle('cq-workspace-mode', mode === 'workspace');
    if (push) history.replaceState({}, document.title, location.pathname + location.search + (mode === 'home' ? '#home' : '#workspace'));
    if (mode === 'workspace') {
      requestAnimationFrame(enhanceWorkspace);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  function createPublicSite() {
    if (document.getElementById(SITE_ID)) return;
    const site = document.createElement('div');
    site.id = SITE_ID;
    site.className = 'cq-site';
    site.innerHTML = `
      <header class="cq-site-nav">
        <button class="cq-wordmark" data-cq-route="home" aria-label="CourtIQ home">Court<span>IQ</span><small>BASKETBALL INTELLIGENCE</small></button>
        <nav aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#standards">Analysis Standard</a>
        </nav>
        <div class="cq-site-actions">
          <button class="cq-ghost" data-cq-action="login">Club Login</button>
          <button class="cq-primary" data-cq-route="workspace">Open Workspace</button>
        </div>
      </header>

      <main>
        <section class="cq-hero">
          <div class="cq-hero-copy">
            <div class="cq-kicker"><span></span> COURTIQ · BASKETBALL INTELLIGENCE SYSTEM</div>
            <h1>Turn official game data into <em>coaching intelligence.</em></h1>
            <p>CourtIQ brings game imports, team analytics, player intelligence, lineups, scouting, season memory and coach-ready reports into one workspace.</p>
            <div class="cq-hero-actions">
              <button class="cq-primary cq-large" data-cq-route="workspace">Enter CourtIQ</button>
              <button class="cq-ghost cq-large" data-cq-action="import">Import a Game</button>
            </div>
            <div class="cq-trust-row">
              <span>Official sources</span><span>Deterministic metrics</span><span>Evidence-first scouting</span><span>Video verification</span>
            </div>
          </div>
          <div class="cq-hero-panel" aria-label="CourtIQ product preview">
            <div class="cq-preview-top"><span>LIVE WORKSPACE</span><b>2026/27</b></div>
            <div class="cq-preview-game"><small>GAME INTELLIGENCE</small><h2>Official Game → Coach Brief</h2><p>Import once. Verify totals. Calculate. Save. Compare. Scout.</p></div>
            <div class="cq-preview-kpis">
              <div><small>01</small><b>Game Library</b><span>Verified imports</span></div>
              <div><small>02</small><b>Analytics</b><span>Team + player</span></div>
              <div><small>03</small><b>Scouting</b><span>Opponent memory</span></div>
              <div><small>04</small><b>Coach View</b><span>Decision support</span></div>
            </div>
            <div class="cq-preview-flow"><b>DATA</b><i>→</i><b>EVIDENCE</b><i>→</i><b>INSIGHT</b><i>→</i><b>DECISION</b></div>
          </div>
        </section>

        <section id="product" class="cq-section">
          <div class="cq-section-head"><small>ONE PRODUCT · ONE WORKFLOW</small><h2>Built for the daily work of coaches and analysts.</h2></div>
          <div class="cq-feature-grid">
            <article><span>01</span><h3>Games</h3><p>Store official games in a reusable club library instead of starting every analysis from zero.</p></article>
            <article><span>02</span><h3>Team Analytics</h3><p>Four Factors, efficiency, pace, possession control, splits and evidence-linked findings.</p></article>
            <article><span>03</span><h3>Player Intelligence</h3><p>Advanced box-score profiles, role signals, trends and season memory with sample context.</p></article>
            <article><span>04</span><h3>Opponent Scouting</h3><p>Turn accumulated official games into tendencies, alerts, matchups and questions for film.</p></article>
            <article><span>05</span><h3>Lineups & Shot Context</h3><p>Analyze combinations and shot information when play-by-play or source data supports it.</p></article>
            <article><span>06</span><h3>Coach Brief</h3><p>Compress the analysis into a practical game-preparation view with evidence and confidence.</p></article>
          </div>
        </section>

        <section id="workflow" class="cq-section cq-workflow-section">
          <div class="cq-section-head"><small>THE COURTIQ PIPELINE</small><h2>From a URL to a repeatable intelligence asset.</h2></div>
          <div class="cq-workflow">
            <div><b>1</b><h3>Import</h3><p>Paste an official game link.</p></div>
            <i>→</i><div><b>2</b><h3>Verify</h3><p>Validate basketball totals and source integrity.</p></div>
            <i>→</i><div><b>3</b><h3>Calculate</h3><p>Generate deterministic team and player metrics.</p></div>
            <i>→</i><div><b>4</b><h3>Remember</h3><p>Save the game to team and player memory.</p></div>
            <i>→</i><div><b>5</b><h3>Decide</h3><p>Surface coach-ready evidence and video questions.</p></div>
          </div>
        </section>

        <section id="standards" class="cq-section cq-standard">
          <div><small>ANALYSIS STANDARD</small><h2>CourtIQ separates facts from basketball interpretation.</h2></div>
          <div class="cq-standard-rule"><b>DATA</b><span>What the official source contains</span></div>
          <div class="cq-standard-rule"><b>FINDING</b><span>What the calculations establish</span></div>
          <div class="cq-standard-rule"><b>INTERPRETATION</b><span>What may explain the pattern</span></div>
          <div class="cq-standard-rule"><b>VIDEO</b><span>What must be verified on film</span></div>
        </section>

        <section class="cq-cta">
          <small>COURTIQ CLUB WORKSPACE</small><h2>Ready to analyze the next game?</h2>
          <p>Use the existing pilot workspace now. A custom domain can be connected without rebuilding the product.</p>
          <button class="cq-primary cq-large" data-cq-route="workspace">Open Basketball Intelligence Workspace</button>
        </section>
      </main>
      <footer class="cq-site-footer"><b>CourtIQ</b><span>Basketball Intelligence · Data → Evidence → Decision Support</span></footer>`;
    document.body.appendChild(site);
  }

  function action(name) {
    const open = fn => typeof fn === 'function' && fn();
    if (name === 'login') { setMode('workspace'); return open(window.openAccount); }
    if (name === 'dashboard') return open(window.openPilotDashboard);
    if (name === 'games') return open(window.openGameLibrary);
    if (name === 'season') return open(window.openSeasonMemory);
    if (name === 'players') return window.CourtIQPlayers?.openPlayers?.();
    if (name === 'scouting') return open(window.openOpponentScout);
    if (name === 'coach') return window.CourtIQV2?.openCoachDashboard?.();
    if (name === 'reports') return open(window.openFullReport);
    if (name === 'import') { setMode('workspace'); return open(window.openAutoImport); }
    if (name === 'account') return open(window.openAccount);
    if (name === 'connected') return open(window.openConnectedIntelligence);
    if (name === 'player-memory') return open(window.openPlayerMemory);
    if (name === 'team-analytics') return document.querySelector('[data-game-tab="team"]')?.click();
    if (name === 'play') return document.querySelector('[data-game-tab="play"]')?.click();
    if (name === 'lineups') return document.querySelector('[data-game-tab="lineups"]')?.click();
  }

  function navItem(icon, label, name, primary = false) {
    return `<button type="button" class="cq-nav-item${primary ? ' cq-nav-primary' : ''}" data-cq-action="${name}"><span>${icon}</span><b>${label}</b></button>`;
  }

  function enhanceWorkspace() {
    const root = document.querySelector('#app .app');
    if (!root || root.dataset.shellReady === '1') return;
    root.dataset.shellReady = '1';
    document.title = 'CourtIQ — Basketball Intelligence';

    const side = root.querySelector('.side');
    const menu = root.querySelector('.menu');
    const top = root.querySelector('.top');
    const g = activeGame();

    if (side) {
      side.classList.add('cq-side');
      const logo = side.querySelector('.logo');
      if (logo) logo.innerHTML = 'Court<span>IQ</span><small class="tagline">BASKETBALL INTELLIGENCE</small>';
      if (menu) {
        menu.classList.add('cq-menu');
        menu.innerHTML = `
          <small class="cq-nav-label">WORKSPACE</small>
          ${navItem('⌂','Dashboard','dashboard',true)}
          ${navItem('▣','Games','games')}
          ${navItem('◫','Team Analytics','team-analytics')}
          ${navItem('♟','Players','players')}
          ${navItem('◈','Season Memory','season')}
          <small class="cq-nav-label">PREPARATION</small>
          ${navItem('◎','Opponent Scouting','scouting')}
          ${navItem('◇','Coach View','coach')}
          ${navItem('▤','Reports','reports')}
          ${navItem('▶','Play-by-Play','play')}
          ${navItem('▦','Lineups','lineups')}
          <small class="cq-nav-label">DATA</small>
          ${navItem('+','Import Game','import')}
          ${navItem('◆','Connected Intelligence','connected')}
          ${navItem('♙','Player Memory','player-memory')}`;
      }
      const quote = side.querySelector('.quote');
      if (quote) quote.innerHTML = `<small>${signedIn() ? 'SECURE CLUB SESSION' : 'DEMO WORKSPACE'}</small><b>${signedIn() ? 'Club database connected' : 'Sign in to save official games'}</b><button type="button" data-cq-action="account">${signedIn() ? 'Account' : 'Club Login'}</button>`;
    }

    if (top) {
      top.classList.add('cq-top');
      top.innerHTML = `
        <button class="cq-mobile-menu" type="button" aria-label="Open navigation">☰</button>
        <div class="cq-context"><small>${g.comp || 'COURTIQ WORKSPACE'}</small><b>${g.home && g.away ? `${escapeHtml(g.home)} vs ${escapeHtml(g.away)}` : 'Basketball Intelligence'}</b></div>
        <div class="cq-top-actions">
          <button type="button" class="cq-top-import" data-cq-action="import">+ Import Game</button>
          <button type="button" class="cq-account" data-cq-action="account"><span class="cq-user-dot"></span><div><small>${signedIn() ? 'SIGNED IN' : 'PILOT'}</small><b>${escapeHtml(accountLabel())}</b></div></button>
          <button type="button" class="cq-home-link" data-cq-route="home" aria-label="Public site">↗</button>
        </div>`;
    }

    root.querySelector('.content')?.classList.add('cq-content');
    root.querySelector('.v2bar')?.classList.add('cq-commandbar');
    root.querySelector('.clubbar')?.classList.add('cq-clubbar');
    root.querySelector('.gamehead')?.classList.add('cq-gamehead');

    const footer = root.querySelector('.footer');
    if (footer) footer.textContent = 'CourtIQ · Basketball Intelligence · Data → Evidence → Decision Support';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  document.addEventListener('click', e => {
    const route = e.target.closest('[data-cq-route]');
    if (route) { e.preventDefault(); setMode(route.dataset.cqRoute); return; }
    const button = e.target.closest('[data-cq-action]');
    if (button) { e.preventDefault(); document.querySelector('#app .side')?.classList.remove('cq-side-open'); action(button.dataset.cqAction); return; }
    const mobile = e.target.closest('.cq-mobile-menu');
    if (mobile) document.querySelector('#app .side')?.classList.toggle('cq-side-open');
    if (e.target.closest('.cq-nav-item')) document.querySelector('#app .side')?.classList.remove('cq-side-open');
  });

  window.addEventListener('hashchange', () => setMode(routeMode(), false));

  const observer = new MutationObserver(() => requestAnimationFrame(enhanceWorkspace));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  createPublicSite();
  setMode(routeMode(), false);
  enhanceWorkspace();
})();
