(() => {
  const SUPABASE_URL = "https://lgzfmoioecixmnivtqan.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l";
  const SESSION_KEY = "courtiq_supabase_session";

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

  async function workspace() {
    if (!readSession()?.access_token) throw new Error("Sign in to load the club workspace.");
    let clubs;
    try {
      clubs = await jsonFetch("/rest/v1/clubs?select=id,slug,name,season,country,competition,pilot&slug=eq.maccabi-bnot-ashdod");
    } catch (e) {
      if (/JWT|expired/i.test(e.message)) {
        await refreshSession();
        clubs = await jsonFetch("/rest/v1/clubs?select=id,slug,name,season,country,competition,pilot&slug=eq.maccabi-bnot-ashdod");
      } else throw e;
    }
    const club = clubs?.[0];
    if (!club) throw new Error("This account does not have access to the Maccabi Bnot Ashdod pilot.");
    const [games, clubPlayers] = await Promise.all([
      jsonFetch("/rest/v1/games?select=id,external_id,provider,competition,game_date,home_team,away_team,payload,created_at&club_id=eq." + club.id + "&order=game_date.desc.nullslast"),
      jsonFetch("/rest/v1/club_players?select=season,roster_status,players(id,name,position,nationality,source_url)&club_id=eq." + club.id + "&season=eq." + encodeURIComponent(club.season))
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

  async function importOfficialGame(url) {
    const session = readSession();
    if (!session?.access_token) throw new Error("Sign in before importing a game.");
    const res = await fetch(SUPABASE_URL + "/functions/v1/import-ibba-game", {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: "Bearer " + session.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({url})
    });
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
      if (res.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) return importOfficialGame(url);
      }
      throw new Error(body?.error || body?.message || "Official game import failed.");
    }
    return body;
  }

  window.CourtIQData = {
    signIn, signOut, refreshSession, user, workspace, playerIntelligence, gameReports, importOfficialGame,
    isSignedIn: () => !!readSession()?.access_token
  };
})();