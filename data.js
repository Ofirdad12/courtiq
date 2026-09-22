(() => {
  const SUPABASE_URL = "https://lgzfmoioecixmnivtqan.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l";
  const SESSION_KEY = "courtiq_supabase_session";
  const CLUB_KEY = "courtiq_selected_club";

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch (_) { return null; }
  }
  function saveSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }
  async function jsonFetch(path, options = {}, useAuth = true) {
    const session = readSession();
    const headers = {
      apikey: PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (useAuth && session?.access_token) headers.Authorization = "Bearer " + session.access_token;
    const res = await fetch(SUPABASE_URL + path, {...options, headers});
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(body?.msg || body?.message || body?.error_description || body?.hint || "CourtIQ data request failed");
    return body;
  }
  async function createPilotAccount(email, password, inviteCode) {
    return jsonFetch("/functions/v1/create-pilot-account", {
      method: "POST",
      body: JSON.stringify({email, password, invite_code: inviteCode})
    }, false);
  }

  async function requestPasswordReset(email) {
    const redirectTo = location.origin + location.pathname;
    await jsonFetch("/auth/v1/recover?redirect_to=" + encodeURIComponent(redirectTo), {
      method: "POST", body: JSON.stringify({email})
    }, false);
    return true;
  }
  function recoverySessionFromUrl() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    if (hash.get("type") !== "recovery" || !hash.get("access_token")) return false;
    saveSession({
      access_token: hash.get("access_token"),
      refresh_token: hash.get("refresh_token") || null,
      token_type: hash.get("token_type") || "bearer",
      expires_in: Number(hash.get("expires_in") || 3600),
      user: null,
      recovery: true
    });
    return true;
  }
  async function updatePassword(password) {
    const session = readSession();
    if (!session?.access_token) throw new Error("Open the password reset link from your email first.");
    if (!password || password.length < 10) throw new Error("Password must contain at least 10 characters.");
    const user = await jsonFetch("/auth/v1/user", {
      method: "PUT", body: JSON.stringify({password})
    });
    if (session) { session.user = user; session.recovery = false; saveSession(session); }
    history.replaceState({}, document.title, location.pathname + location.search);
    return user;
  }

  async function signIn(email, password) {
    const session = await jsonFetch("/auth/v1/token?grant_type=password", {
      method: "POST", body: JSON.stringify({email, password})
    }, false);
    saveSession(session);
    return session;
  }
  async function refreshSession() {
    const current = readSession();
    if (!current?.refresh_token) return null;
    try {
      const session = await jsonFetch("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", body: JSON.stringify({refresh_token: current.refresh_token})
      }, false);
      saveSession(session);
      return session;
    } catch (_) {
      saveSession(null);
      return null;
    }
  }
  function signOut() { saveSession(null); }
  function user() { return readSession()?.user || null; }

  async function accessibleClubs() {
    if (!readSession()?.access_token) throw new Error("Sign in to load club workspaces.");
    try { return await jsonFetch("/rest/v1/clubs?select=id,slug,name,season,country,competition,pilot&order=name.asc"); }
    catch (e) { if (/JWT|expired/i.test(e.message)) { await refreshSession(); return jsonFetch("/rest/v1/clubs?select=id,slug,name,season,country,competition,pilot&order=name.asc"); } throw e; }
  }
  function selectedClubId() { return Number(localStorage.getItem(CLUB_KEY) || 0) || null; }
  function selectClub(id) { if (id) localStorage.setItem(CLUB_KEY, String(id)); else localStorage.removeItem(CLUB_KEY); }
  async function workspace() {
    const clubs = await accessibleClubs();
    const preferred = selectedClubId();
    const club = clubs?.find(c => Number(c.id) === Number(preferred)) || clubs?.[0];
    if (!club) throw new Error("This account does not have access to a CourtIQ club workspace.");
    if (!preferred) selectClub(club.id);
    const [games, clubPlayers] = await Promise.all([
      jsonFetch("/rest/v1/games?select=id,external_id,provider,competition,game_date,home_team,away_team,payload,created_at&club_id=eq." + club.id + "&order=game_date.desc.nullslast"),
      jsonFetch("/rest/v1/club_players?select=season,roster_status,players(id,name,position,nationality,source_url,analysis)&club_id=eq." + club.id + "&season=eq." + encodeURIComponent(club.season))
    ]);
    return {club, games, clubPlayers};
  }

  async function playerIntelligence() {
    const w = await workspace();
    const rows = w.clubPlayers || [];
    const ids = rows.map(r => r.players?.id).filter(Boolean);
    if (!ids.length) return [];
    const samples = await jsonFetch("/rest/v1/player_samples?select=id,player_id,season,competition,club_name,phase,games,minutes,raw_stats,published_summary,source_label,source_url,source_note,verified&player_id=in.(" + ids.join(",") + ")&order=season.desc");
    const byPlayer = new Map();
    for (const sample of samples) {
      if (!byPlayer.has(sample.player_id)) byPlayer.set(sample.player_id, []);
      byPlayer.get(sample.player_id).push(sample);
    }
    return rows.map(row => ({...row, samples: byPlayer.get(row.players?.id) || []}));
  }

  async function gameReports(gameId) {
    return jsonFetch("/rest/v1/game_reports?select=id,game_id,report_version,payload,updated_at&game_id=eq." + Number(gameId) + "&order=updated_at.desc");
  }

  async function gameVideo(gameId) {
    const rows = await jsonFetch("/rest/v1/game_videos?select=id,game_id,club_id,storage_bucket,storage_path,playback_url,duration_seconds,fps,status,created_at&game_id=eq." + Number(gameId) + "&order=created_at.desc&limit=1");
    return rows?.[0] || null;
  }

  async function tacticalEvents(gameId) {
    const rows = await jsonFetch("/rest/v1/tactical_events?select=id,game_id,video_id,external_event_id,period,game_clock,video_start,video_time,video_end,offense_team,defense_team,action_type,coverage_type,ball_handler_ref,screener_ref,outcome_type,points,tags,confidence,verification,model_version,evidence,created_at&game_id=eq." + Number(gameId) + "&order=video_time.asc");
    return (rows || []).map(e => ({
      id:e.external_event_id || ("db_tactical_" + e.id), period:e.period, clock:e.game_clock,
      videoStart:Number(e.video_start), videoTime:Number(e.video_time), videoEnd:Number(e.video_end),
      offense:e.offense_team, defense:e.defense_team, type:"tactical", tactic:e.action_type, action:e.action_type,
      coverage:e.coverage_type, defenseMeta:{coverage:e.coverage_type}, ballHandler:e.ball_handler_ref, screener:e.screener_ref,
      outcome:{type:e.outcome_type,points:e.points}, points:e.points, tags:e.tags || [], confidence:e.confidence || {},
      verification:e.verification, model:e.model_version, evidence:e.evidence || {}, _dbId:e.id
    }));
  }

  async function hydrateGameVideo(ui, gameId) {
    if (!gameId) return ui;
    const [video, events] = await Promise.all([gameVideo(gameId), tacticalEvents(gameId)]);
    if (video?.playback_url) ui.video = {url:video.playback_url,id:video.id,status:video.status,duration:video.duration_seconds,fps:video.fps};
    if (events?.length) ui.events = [...(Array.isArray(ui.events)?ui.events:[]), ...events];
    return ui;
  }

  async function importRuns(clubId) {
    return jsonFetch("/rest/v1/import_runs?select=id,provider,source_url,external_id,status,validation,error_message,game_id,created_at&club_id=eq." + Number(clubId) + "&order=created_at.desc&limit=20");
  }

  async function productHealth() {
    const w = await workspace();
    const roster = (w.clubPlayers || []).filter(r => r.roster_status === "roster");
    const scouting = (w.clubPlayers || []).filter(r => r.roster_status === "scouting");
    const opponent = (w.clubPlayers || []).filter(r => r.roster_status === "opponent");
    const gameIds = (w.games || []).map(g => g.id);
    const [runs, reports] = await Promise.all([
      importRuns(w.club.id),
      gameIds.length ? jsonFetch("/rest/v1/game_reports?select=id,game_id,report_version,updated_at&game_id=in.(" + gameIds.join(",") + ")") : Promise.resolve([])
    ]);
    return {
      club: w.club,
      counts: {games:w.games.length,reports:reports.length,roster:roster.length,scouting:scouting.length,opponent:opponent.length},
      latestImport: runs[0] || null,
      importRuns: runs,
      checks: {
        secureWorkspace: true,
        rosterLoaded: roster.length > 0,
        realGameImported: w.games.length > 0,
        reportPersisted: reports.length > 0,
        importValidated: runs.some(r => r.status === "success" && r.validation?.home?.status === "passed" && r.validation?.away?.status === "passed")
      }
    };
  }

  async function importOfficialGame(url, clubId = selectedClubId()) {
    const session = readSession();
    if (!session?.access_token) throw new Error("Sign in before importing a game.");
    const res = await fetch(SUPABASE_URL + "/functions/v1/import-ibba-game", {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: "Bearer " + session.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({url, club_id: clubId})
    });
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
      if (res.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) return importOfficialGame(url, clubId);
      }
      throw new Error(body?.error || body?.message || "Official game import failed.");
    }
    return body;
  }

  window.CourtIQData = {
    createPilotAccount, requestPasswordReset, recoverySessionFromUrl, updatePassword, signIn, signOut, refreshSession, user, accessibleClubs, selectedClubId, selectClub, workspace, playerIntelligence, gameReports, gameVideo, tacticalEvents, hydrateGameVideo, importRuns, productHealth, importOfficialGame,
    isSignedIn: () => !!readSession()?.access_token
  };
})();