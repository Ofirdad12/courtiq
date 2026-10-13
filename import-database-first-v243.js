(() => {
  'use strict';

  const SUPABASE_URL = 'https://lgzfmoioecixmnivtqan.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
  const SESSION_KEY = 'courtiq_supabase_session';
  const CLIENT_TIMEOUT_MS = 20000;
  const CACHE_TIMEOUT_MS = 5000;

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { return null; }
  }

  function identityFromUrl(raw) {
    try {
      const u = new URL(String(raw || '').trim());
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (host === 'ibasketball.co.il') {
        const m = u.pathname.match(/^\/match\/([^/?#]+)\/?$/i);
        return m ? {provider:'IBBA', externalId:m[1]} : null;
      }
      if (host === 'basket.co.il') {
        const id = u.searchParams.get('GameId');
        return id ? {provider:'WINNER_LEAGUE', externalId:id} : null;
      }
      if (host === 'fiba.basketball') {
        const m = u.pathname.match(/\/games\/(\d+)-/i);
        return m ? {provider:'FIBA', externalId:m[1]} : null;
      }
      if (host === 'euroleaguebasketball.net') {
        const m = u.pathname.match(/\/([EU]\d{4})\/(\d+)\/?$/i);
        if (!m) return null;
        return {provider:u.pathname.toLowerCase().includes('/eurocup/')?'EUROCUP':'EUROLEAGUE', externalId:m[1].toUpperCase()+'-'+m[2]};
      }
      if (host === 'plk.pl') {
        const m = u.pathname.match(/^\/mecz\/(\d+)/i);
        return m ? {provider:'PLK', externalId:m[1]} : null;
      }
      if (host.endsWith('geniussports.com')) {
        const m = u.pathname.match(/^\/u\/[^/]+\/(\d+)\//i);
        return m ? {provider:'GENIUS_LIVESTATS', externalId:m[1]} : null;
      }
      if (host === 'eurobasket.com') {
        const id = u.searchParams.get('Game') || u.searchParams.get('game');
        return id ? {provider:'EUROBASKET_POLAND', externalId:String(id).slice(0,120)} : null;
      }
    } catch (_) {}
    return null;
  }

  async function findVerifiedSavedGame(url, session) {
    const identity = identityFromUrl(url);
    if (!identity || !session?.access_token) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CACHE_TIMEOUT_MS);
    try {
      const qs = new URLSearchParams({
        select:'id,external_id,provider,source_url,payload,created_at',
        provider:'eq.' + identity.provider,
        external_id:'eq.' + identity.externalId,
        order:'created_at.desc',
        limit:'5'
      });
      const res = await fetch(SUPABASE_URL + '/rest/v1/games?' + qs.toString(), {
        headers:{
          apikey:PUBLISHABLE_KEY,
          Authorization:'Bearer ' + session.access_token,
          Accept:'application/json'
        },
        signal:controller.signal
      });
      if (!res.ok) return null;
      const rows = await res.json();
      const row = (Array.isArray(rows) ? rows : []).find(game => game?.payload?.verified === true && game?.payload?.ui);
      if (!row) return null;
      return {
        game_id:row.id,
        ui:row.payload.ui,
        validation:row.payload.validation || null,
        saved:true,
        reused_existing:true,
        cache_hit:true,
        source:'courtiq_verified_database'
      };
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function resilientImport(url, retry = true) {
    const session = readSession();
    if (!session?.access_token) throw new Error('Sign in before importing a game.');

    // Database first: a verified CourtIQ copy is the preferred source for a
    // repeat import. This avoids unnecessary dependence on federation pages
    // that may block cloud/server IPs after the game was already validated.
    const cached = await findVerifiedSavedGame(url, session);
    if (cached) return cached;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(SUPABASE_URL + '/functions/v1/import-ibba-game', {
        method:'POST',
        headers:{
          apikey:PUBLISHABLE_KEY,
          Authorization:'Bearer ' + session.access_token,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({url}),
        signal:controller.signal
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('The official source did not respond in time. CourtIQ stopped the import after 20 seconds instead of leaving it stuck.');
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
        throw new Error(body?.error || body?.message || 'CourtIQ reached the source, but the game could not be parsed.');
      }
      if (res.status === 504) {
        throw new Error('The official source is blocking the importer right now. CourtIQ stopped quickly instead of hanging.');
      }
      throw new Error(body?.error || body?.message || `Official game import failed (${res.status}).`);
    }
    return body;
  }

  function install() {
    if (!window.CourtIQData || window.CourtIQData.__importDatabaseFirstV243) return;
    window.CourtIQData.importOfficialGame = resilientImport;
    window.CourtIQData.__importDatabaseFirstV243 = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  install();
  window.addEventListener('load', install, {once:true});
  window.CourtIQImportDatabaseFirst = {install, importOfficialGame:resilientImport, findVerifiedSavedGame, identityFromUrl};
})();
