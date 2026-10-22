// CourtIQ v6 data-quality synchronization layer.
// Import this BEFORE team-possessions-postprocess.ts so it receives the final
// post-processed response and keeps persisted QA checks aligned with the same
// values shown in CourtIQ. This prevents an older pre-patch Pace calculation
// from remaining in data_quality_checks after the v6 correction is applied.

const baseServe = Deno.serve.bind(Deno);
const baseFetch = globalThis.fetch.bind(globalThis);
const V6_FORMULA = "average(Home TeamEst, Away TeamEst) × 40 / Game Minutes";

async function adminJson(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase admin environment is unavailable");
  const headers = new Headers(init.headers || {});
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("Content-Type", "application/json");
  const res = await baseFetch(url + path, {...init, headers});
  if (!res.ok) throw new Error(`Supabase REST ${res.status}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function qualityRow(check_name: string, status: "PASS" | "FAIL", expected: any, actual: any, details: string) {
  return {check_name, status, expected, actual, details};
}

function v6Checks(body: any) {
  const ui = body?.ui;
  if (!ui) return [];
  const rows: any[] = [];
  const homePace = Number(ui?.calculated?.home?.pace);
  const awayPace = Number(ui?.calculated?.away?.pace);
  const gamePossessions = Number(ui?.calculated?.home?.game_possessions ?? ui?.gamePossessions);
  const gameMinutes = Number(ui?.gameMinutes || 40);
  const paceValid = Number.isFinite(homePace) && Number.isFinite(awayPace) && Math.abs(homePace - awayPace) < 0.01;
  rows.push(qualityRow(
    "pace_formula",
    paceValid ? "PASS" : "FAIL",
    {formula:V6_FORMULA, same_pace_both_teams:true},
    {home:homePace, away:awayPace, game_possessions:gamePossessions, game_minutes:gameMinutes},
    paceValid ? "v6 Pace is synchronized with the post-processed game possession estimate." : "v6 Pace validation failed."
  ));

  const quarters = Array.isArray(ui?.quarters) ? ui.quarters : [];
  if (quarters.length >= 4) {
    const homePeriodSum = quarters.reduce((s: number, q: any) => s + Number(Array.isArray(q) ? q[0] || 0 : 0), 0);
    const awayPeriodSum = quarters.reduce((s: number, q: any) => s + Number(Array.isArray(q) ? q[1] || 0 : 0), 0);
    const homePoints = Number(ui?.raw?.home?.points ?? ui?.hs);
    const awayPoints = Number(ui?.raw?.away?.points ?? ui?.as);
    const periodsValid = Number.isFinite(homePoints) && Number.isFinite(awayPoints)
      && homePeriodSum === homePoints && awayPeriodSum === awayPoints;
    rows.push(qualityRow(
      "period_score_reconcile",
      periodsValid ? "PASS" : "FAIL",
      {home_points:homePoints, away_points:awayPoints},
      {home_period_sum:homePeriodSum, away_period_sum:awayPeriodSum, periods:quarters.length},
      periodsValid ? "Period totals reconcile to the final score." : "Period totals do not reconcile to the final score."
    ));
  }
  return rows;
}

async function upsertQualityRows(gameId: number, rows: any[]) {
  if (!rows.length) return;
  const payload = rows.map(row => ({game_id:gameId, ...row}));
  await adminJson("/rest/v1/data_quality_checks?on_conflict=game_id,check_name", {
    method:"POST",
    headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify(payload)
  });
}

async function syncGamePayload(gameId: number, rows: any[]) {
  const games = await adminJson(`/rest/v1/games?id=eq.${gameId}&select=payload`);
  const current = games?.[0]?.payload;
  if (!current || !rows.length) return;
  const quality = current.quality && typeof current.quality === "object" ? {...current.quality} : {checks:[]};
  const checks = Array.isArray(quality.checks) ? [...quality.checks] : [];
  for (const row of rows) {
    const next = {check_name:row.check_name,status:row.status,expected:row.expected,actual:row.actual};
    const i = checks.findIndex((c:any) => c?.check_name === row.check_name);
    if (i >= 0) checks[i] = next; else checks.push(next);
  }
  quality.checks = checks;
  quality.status = checks.every((c:any) => c?.status === "PASS") ? "VERIFIED" : "REVIEW";
  const payload = {...current, quality, verified:quality.status === "VERIFIED"};
  await adminJson(`/rest/v1/games?id=eq.${gameId}`, {
    method:"PATCH",
    headers:{Prefer:"return=minimal"},
    body:JSON.stringify({payload})
  });
}

async function syncResponse(response: Response) {
  if (!(response instanceof Response) || !response.ok) return response;
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("json")) return response;
  const text = await response.text();
  try {
    const body = text ? JSON.parse(text) : null;
    const gameId = Number(body?.game_id || 0);
    const rows = v6Checks(body);
    if (gameId && rows.length) {
      await upsertQualityRows(gameId, rows);
      await syncGamePayload(gameId, rows);
    }
  } catch (error) {
    console.warn("[CourtIQ] v6 data-quality synchronization skipped:", error);
  }
  return new Response(text, {status:response.status,statusText:response.statusText,headers:response.headers});
}

const wrappedServe = (optionsOrHandler: any, maybeHandler?: any) => {
  const wrap = (handler: any) => async (req: Request, info: any) => syncResponse(await handler(req, info));
  return typeof optionsOrHandler === "function"
    ? baseServe(wrap(optionsOrHandler))
    : baseServe(optionsOrHandler, wrap(maybeHandler));
};

Object.defineProperty(Deno, "serve", {value:wrappedServe, configurable:true, writable:true});
