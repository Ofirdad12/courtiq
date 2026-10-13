(() => {
  'use strict';

  const SUPABASE_URL = 'https://lgzfmoioecixmnivtqan.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
  const SESSION_KEY = 'courtiq_supabase_session';
  const CLIENT_TIMEOUT_MS = 20000;

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { return null; }
  }

  async function resilientImport(url, retry = true) {
    const session = readSession();
    if (!session?.access_token) throw new Error('Sign in before importing a game.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(SUPABASE_URL + '/functions/v1/import-ibba-game', {
        method: 'POST',
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: 'Bearer ' + session.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({url}),
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('The official source did not respond in time. CourtIQ stopped the import after 20 seconds instead of leaving it stuck. Try the same link again.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    let body = null;
    try { body = await res.json(); } catch (_) {}

    if (!res.ok) {
      if (res.status === 401 && retry && window.CourtIQData?.refreshSession) {
        const refreshed = await window.CourtIQData.refreshSession();
        if (refreshed) return resilientImport(url, false);
      }
      if (res.status === 422) {
        throw new Error(body?.error || body?.message || 'CourtIQ reached the source, but the game could not be parsed. Check that this is the official game/box-score URL.');
      }
      if (res.status === 504) {
        throw new Error('The official source is blocking the importer right now. CourtIQ stopped quickly instead of hanging. Try again shortly.');
      }
      throw new Error(body?.error || body?.message || `Official game import failed (${res.status}).`);
    }
    return body;
  }

  function install() {
    if (!window.CourtIQData || window.CourtIQData.__importResilienceV242) return;
    window.CourtIQData.importOfficialGame = resilientImport;
    window.CourtIQData.__importResilienceV242 = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  install();
  window.addEventListener('load', install, {once:true});
  window.CourtIQImportResilience = {install, importOfficialGame: resilientImport};
})();
