// CourtIQ shared box-score possession correction for Supabase Edge Functions.
// Installs before the legacy importer registers Deno.serve, then patches the
// successful response and persisted game/report payloads to formula v5.
// Also resolves Czech Basketball Federation (CBF) game pages to their linked
// official FIBA LiveStats / Genius Sports feed before the legacy importer runs.

const nativeServe = Deno.serve.bind(Deno);
const nativeHttpFetch = globalThis.fetch.bind(globalThis);
const METHOD = "TEAM_FULL_BOX_SCORE";
const VERSION = "courtiq-formulas-v5";
const POSSESSION_FORMULA = "TeamEst = FGA + 0.4 × FTA - 1.07 × (ORB / (ORB + Opp DRB)) × (FGA - FGM) + TOV; keep TeamEst separate for each team; Game Pace = average(Home TeamEst, Away TeamEst) × 40 / Game Minutes";
const CBF_HOST = "cbf.cz.basketball";

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 1000) / 10 : 0;
const finite = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function teamBox(team: any) {
  if (!team || typeof team !== "object") return null;
  const twoPm = finite(team.two_pm), twoPa = finite(team.two_pa), threePm = finite(team.three_pm), threePa = finite(team.three_pa);
  const fta = finite(team.fta), oreb = finite(team.oreb), dreb = finite(team.dreb), tov = finite(team.tov), points = finite(team.points);
  if ([twoPm,twoPa,threePm,threePa,fta,oreb,dreb,tov,points].some(v => v == null)) return null;
  const fgm = Number(twoPm) + Number(threePm), fga = Number(twoPa) + Number(threePa);
  if (fgm > fga) return null;
  return {fgm,fga,fta:Number(fta),oreb:Number(oreb),dreb:Number(dreb),tov:Number(tov),points:Number(points)};
}

function sideEstimate(team: any, opponent: any) {
  const t = teamBox(team), o = teamBox(opponent);
  if (!t || !o) return null;
  const reb = t.oreb + o.dreb;
  if (reb <= 0) return null;
  return t.fga + 0.4 * t.fta - 1.07 * (t.oreb / reb) * (t.fga - t.fgm) + t.tov;
}

function patchRow(rows: any, label: string, home: any, away: any, formatter: (v:any)=>any = v => v) {
  if (!Array.isArray(rows)) return;
  const row = rows.find((r: any) => Array.isArray(r) && String(r[0] || "").trim().toLowerCase() === label.toLowerCase());
  if (!row) return;
  row[1] = formatter(home); row[2] = formatter(away);
}

function patchFormulaCatalog(catalog: any) {
  if (!catalog || typeof catalog !== "object") catalog = {};
  catalog.version = VERSION;
  catalog.box_score = {...(catalog.box_score || {}),
    possessions: POSSESSION_FORMULA,
    ortg: "Team PTS / Team Possessions × 100",
    drtg: "Opponent PTS / Opponent Possessions × 100",
    pace: "[(Home TeamEst + Away TeamEst) / 2] × 40 / Game Minutes"
  };
  return catalog;
}

function patchPlayerShares(ui: any, side: "home"|"away", possessions: number) {
  const players = ui?.players?.[side];
  if (!Array.isArray(players) || !(possessions > 0)) return;
  for (const player of players) {
    const directFga = finite(player?.fga);
    const twoPa = finite(player?.two_pa), threePa = finite(player?.three_pa), fta = finite(player?.fta), tov = finite(player?.tov);
    const fga = directFga ?? ((twoPa ?? 0) + (threePa ?? 0));
    if (fta == null || tov == null) continue;
    player.play_end_share = pct(Number(fga) + 0.44 * Number(fta) + Number(tov), possessions);
  }
}

export function patchUi(ui: any) {
  const homeRaw = ui?.raw?.home, awayRaw = ui?.raw?.away;
  if (!homeRaw || !awayRaw) return null;
  const h = teamBox(homeRaw), a = teamBox(awayRaw);
  const homeEst = sideEstimate(homeRaw, awayRaw), awayEst = sideEstimate(awayRaw, homeRaw);
  if (!h || !a || homeEst == null || awayEst == null) return null;

  const periods = Array.isArray(ui.quarters) && ui.quarters.length ? Math.max(4, ui.quarters.length) : 4;
  const gameMinutes = 40 + Math.max(0, periods - 4) * 5;
  const gamePossessions = (homeEst + awayEst) / 2;
  const gamePace = gamePossessions * 40 / gameMinutes;
  const homeOrtg = 100 * h.points / homeEst, awayOrtg = 100 * a.points / awayEst;
  const homePoss1 = r1(homeEst), awayPoss1 = r1(awayEst);
  const gamePoss1 = r1(gamePossessions), gamePace1 = r1(gamePace);
  const homePace1 = gamePace1, awayPace1 = gamePace1;
  const hOrtg1 = r1(homeOrtg), aOrtg1 = r1(awayOrtg);
  const hNet = r1(hOrtg1 - aOrtg1), aNet = r1(aOrtg1 - hOrtg1);

  ui.calculated = ui.calculated || {};
  ui.calculated.home = {...(ui.calculated.home || {}), possessions:homePoss1, pace:homePace1, ortg:hOrtg1, drtg:aOrtg1, net_rating:hNet,
    possession_method:METHOD, possession_formula_version:VERSION, team_possession_estimate:homePoss1, opponent_possession_estimate:awayPoss1, game_possessions:gamePoss1};
  ui.calculated.away = {...(ui.calculated.away || {}), possessions:awayPoss1, pace:awayPace1, ortg:aOrtg1, drtg:hOrtg1, net_rating:aNet,
    possession_method:METHOD, possession_formula_version:VERSION, team_possession_estimate:awayPoss1, opponent_possession_estimate:homePoss1, game_possessions:gamePoss1};
  ui.gamePace = gamePace1;
  ui.possessionMethod = METHOD;
  ui.possessionFormulaVersion = VERSION;
  ui.formulaCatalog = patchFormulaCatalog(ui.formulaCatalog);

  patchRow(ui.metrics,"Offensive Rating",hOrtg1,aOrtg1,v=>Number(v).toFixed(1));
  patchRow(ui.metrics,"Defensive Rating",aOrtg1,hOrtg1,v=>Number(v).toFixed(1));
  patchRow(ui.metrics,"Net Rating",hNet,aNet,v=>Number(v).toFixed(1));
  patchRow(ui.metrics,"Pace",gamePace1,gamePace1,v=>Number(v).toFixed(1));
  patchRow(ui.metrics,"Estimated Possessions",homePoss1,awayPoss1,v=>Number(v).toFixed(1));
  patchRow(ui.metrics,"Possessions",homePoss1,awayPoss1,v=>Number(v).toFixed(1));
  patchRow(ui.stats,"Possessions",homePoss1,awayPoss1);
  patchRow(ui.stats,"Pace",gamePace1,gamePace1);
  patchRow(ui.stats,"ORtg",hOrtg1,aOrtg1);
  patchRow(ui.stats,"DRtg",aOrtg1,hOrtg1);
  patchRow(ui.stats,"Net Rating",hNet,aNet);
  patchPlayerShares(ui,"home",homeEst);
  patchPlayerShares(ui,"away",awayEst);
  return {homePossessions:homePoss1, awayPossessions:awayPoss1, gamePossessions:gamePoss1, gamePace:gamePace1, homePace:homePace1, awayPace:awayPace1};
}

function patchReport(report: any, ui: any) {
  if (!report || typeof report !== "object" || !ui) return report;
  report.metrics = ui.metrics;
  report.team_stats = ui.stats;
  report.player_analytics = ui.players || report.player_analytics;
  report.formula_catalog = patchFormulaCatalog(report.formula_catalog || ui.formulaCatalog);
  report.possession_method = METHOD;
  report.possession_formula_version = VERSION;
  return report;
}

async function adminJson(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase admin environment is unavailable");
  const headers = new Headers(init.headers || {});
  headers.set("apikey", key); headers.set("Authorization", `Bearer ${key}`); headers.set("Content-Type", "application/json");
  const res = await nativeHttpFetch(url + path, {...init, headers});
  if (!res.ok) throw new Error(`Supabase REST ${res.status}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function persistCorrection(body: any) {
  const gameId = Number(body?.game_id || 0);
  if (!gameId || !body?.ui) return;
  try {
    const gameRows = await adminJson(`/rest/v1/games?id=eq.${gameId}&select=payload`);
    const currentPayload = gameRows?.[0]?.payload;
    if (currentPayload) {
      const payload = {...currentPayload, ui:body.ui, calculated:body.ui.calculated, formula_catalog:body.ui.formulaCatalog,
        possession_method:METHOD, possession_formula_version:VERSION};
      await adminJson(`/rest/v1/games?id=eq.${gameId}`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({payload})});
    }

    const reportRows = await adminJson(`/rest/v1/game_reports?game_id=eq.${gameId}&select=id,payload`);
    for (const row of reportRows || []) {
      const payload = patchReport({...row.payload}, body.ui);
      await adminJson(`/rest/v1/game_reports?id=eq.${Number(row.id)}`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({payload,updated_at:new Date().toISOString()})});
    }
  } catch (error) {
    console.warn("[CourtIQ] Team possessions persisted correction skipped:", error);
  }
}

function cbfGameUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname.toLowerCase() === CBF_HOST && /^\/zapas\/\d+\/?$/i.test(u.pathname);
  } catch (_) {
    return false;
  }
}

function liveStatsTarget(html: string) {
  const source = String(html || "")
    .replaceAll("&amp;", "&")
    .replaceAll("\\/", "/")
    .replaceAll("\\u002F", "/");
  const genius = source.match(/https?:\/\/(?:fibalivestats|livestats)\.dcd\.shared\.geniussports\.com\/u\/([a-z0-9_-]+)\/(\d+)(?:\/[^\"'<>\s]*)?/i);
  if (genius) return `https://fibalivestats.dcd.shared.geniussports.com/u/${genius[1]}/${genius[2]}/bs.html`;
  const legacy = source.match(/https?:\/\/(?:www\.)?fibalivestats\.com\/(?:u|webcast)\/([a-z0-9_-]+)\/(\d+)/i);
  if (legacy) return `https://fibalivestats.dcd.shared.geniussports.com/u/${legacy[1]}/${legacy[2]}/bs.html`;
  return null;
}

async function resolveCbfSource(raw: string) {
  const source = new URL(raw);
  source.hash = "";
  const res = await nativeHttpFetch(source.toString(), {
    method:"GET",
    redirect:"follow",
    headers:{
      "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language":"cs-CZ,cs;q=0.9,en;q=0.8"
    }
  });
  if (!res.ok) throw new Error(`CBF game page returned HTTP ${res.status}.`);
  const target = liveStatsTarget(await res.text());
  if (!target) throw new Error("CBF game page does not expose an official FIBA LiveStats link yet.");
  return target;
}

async function normalizeIncomingRequest(req: Request) {
  if (req.method !== "POST" || !(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return {request:req, cbfSource:null as string|null, liveStatsSource:null as string|null};
  }
  let body: any;
  try { body = await req.clone().json(); } catch (_) { return {request:req, cbfSource:null, liveStatsSource:null}; }
  const raw = String(body?.url || "").trim();
  if (!cbfGameUrl(raw)) return {request:req, cbfSource:null, liveStatsSource:null};

  const liveStatsSource = await resolveCbfSource(raw);
  const headers = new Headers(req.headers);
  headers.delete("content-length");
  headers.set("Content-Type", "application/json");
  headers.set("X-CourtIQ-CBF-Source", raw);
  const request = new Request(req.url, {
    method:req.method,
    headers,
    body:JSON.stringify({...body, url:liveStatsSource}),
    signal:req.signal
  });
  return {request, cbfSource:raw, liveStatsSource};
}

async function patchResponse(response: Response, source?: {cbfSource:string|null;liveStatsSource:string|null}) {
  if (!(response instanceof Response) || !response.ok) return response;
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("json")) return response;
  try {
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (source?.cbfSource && body?.ui) {
      body.ui.sourceLiveStatsUrl = source.liveStatsSource;
      body.ui.sourceUrl = source.cbfSource;
      body.ui.sourceLabel = "CBF · FIBA LIVESTATS / GENIUS SPORTS OFFICIAL DATA · DATA CONFIRMED";
      body.source_url = source.cbfSource;
    }
    if (!body?.ui || !patchUi(body.ui)) return new Response(JSON.stringify(body ?? {}), {status:response.status,statusText:response.statusText,headers:response.headers});
    if (body.report) body.report = patchReport(body.report, body.ui);
    await persistCorrection(body);
    const headers = new Headers(response.headers);
    headers.set("Content-Type","application/json");
    headers.set("X-CourtIQ-Possessions","TEAM_FULL_BOX_SCORE");
    if (source?.cbfSource) headers.set("X-CourtIQ-Source-Bridge","CBF_TO_GENIUS");
    return new Response(JSON.stringify(body), {status:response.status,statusText:response.statusText,headers});
  } catch (error) {
    console.warn("[CourtIQ] Team possessions response correction skipped:", error);
    return response;
  }
}

function bridgeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return new Response(JSON.stringify({error:message}), {
    status:422,
    headers:{
      "Access-Control-Allow-Origin":"https://ofirdad12.github.io",
      "Access-Control-Allow-Headers":"authorization, apikey, content-type",
      "Access-Control-Allow-Methods":"POST, OPTIONS",
      "Content-Type":"application/json"
    }
  });
}

const wrappedServe = (optionsOrHandler: any, maybeHandler?: any) => {
  const wrap = (handler: any) => async (req: Request, info: any) => {
    try {
      const normalized = await normalizeIncomingRequest(req);
      return patchResponse(await handler(normalized.request, info), normalized);
    } catch (error) {
      console.warn("[CourtIQ] CBF source bridge failed:", error);
      return bridgeError(error);
    }
  };
  return typeof optionsOrHandler === "function"
    ? nativeServe(wrap(optionsOrHandler))
    : nativeServe(optionsOrHandler, wrap(maybeHandler));
};

Object.defineProperty(Deno, "serve", {value:wrappedServe, configurable:true, writable:true});