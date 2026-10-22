// Preserve the production EuroLeague v2 normalization before the legacy
// importer consumes official EuroLeague / EuroCup responses.
//
// 1) Stats: v2 can expose aggregate statistics under total.stats while the
//    legacy CourtIQ parser reads aggregate fields directly from total.
// 2) Game header: v2 exposes quarter scoring under local/road.partials, while
//    the legacy parser expects local/road.score.byQuarter. Normalize both shapes
//    so quarter scores and overtime duration are never silently lost.

const upstreamFetch = globalThis.fetch.bind(globalThis);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function euroleagueV2Route(raw: string): "stats" | "game" | null {
  try {
    const u = new URL(raw);
    if (!/^api-live\.euroleague\.net$/i.test(u.hostname)) return null;
    if (/^\/v2\/competitions\/[EU]\/seasons\/[EU]\d{4}\/games\/\d+\/stats\/?$/i.test(u.pathname)) return "stats";
    if (/^\/v2\/competitions\/[EU]\/seasons\/[EU]\d{4}\/games\/\d+\/?$/i.test(u.pathname)) return "game";
    return null;
  } catch (_) {
    return null;
  }
}

function statNum(o: any, ...keys: string[]): number {
  for (const key of keys) {
    const value = o?.[key];
    if (value !== undefined && value !== null && value !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function fgaOf(o: any): number {
  return statNum(o, "fieldGoalsAttempted", "fieldGoalsAttemptedTotal")
    || statNum(o, "fieldGoalsAttempted2", "twoPointersAttempted")
      + statNum(o, "fieldGoalsAttempted3", "threePointersAttempted");
}

function exposeTotalStats(side: any, stats: any): any {
  const total = side?.total && typeof side.total === "object" ? side.total : {};
  return {...side, total: {...total, ...stats}};
}

function normalizeEuroleagueSide(side: any): any {
  if (!side || typeof side !== "object") return side;
  const existingTotal = side?.total?.stats || side?.total || {};

  // Even when the official feed already has valid aggregate stats, flatten
  // total.stats onto total because the downstream production parser expects
  // fieldGoalsAttempted*, points, rebounds, etc. directly on total.
  if (fgaOf(existingTotal) > 0) return exposeTotalStats(side, existingTotal);

  const teamStatsCandidates = [side?.team?.stats, side?.team].filter(Boolean);
  const teamStats = teamStatsCandidates.find((candidate: any) => fgaOf(candidate) > 0) || null;
  const players = Array.isArray(side?.players) ? side.players : [];
  const playerStats = players.map((row: any) => row?.stats || row).filter(Boolean);
  const sum = (...keys: string[]) => playerStats.reduce((acc: number, stats: any) => acc + statNum(stats, ...keys), 0);
  const playerFga = sum("fieldGoalsAttempted2", "twoPointersAttempted") + sum("fieldGoalsAttempted3", "threePointersAttempted");
  if (!teamStats && playerFga <= 0) return side;

  const pick = (keys: string[], fallbackKeys = keys) => {
    if (teamStats) {
      const v = statNum(teamStats, ...keys);
      if (v || keys.some(k => teamStats?.[k] === 0 || teamStats?.[k] === "0")) return v;
    }
    return sum(...fallbackKeys);
  };

  const normalizedTotal: any = {
    ...existingTotal,
    points: pick(["points"]),
    fieldGoalsMade2: pick(["fieldGoalsMade2", "twoPointersMade"]),
    fieldGoalsAttempted2: pick(["fieldGoalsAttempted2", "twoPointersAttempted"]),
    fieldGoalsMade3: pick(["fieldGoalsMade3", "threePointersMade"]),
    fieldGoalsAttempted3: pick(["fieldGoalsAttempted3", "threePointersAttempted"]),
    freeThrowsMade: pick(["freeThrowsMade"]),
    freeThrowsAttempted: pick(["freeThrowsAttempted"]),
    offensiveRebounds: pick(["offensiveRebounds"]),
    defensiveRebounds: pick(["defensiveRebounds"]),
    turnovers: pick(["turnovers"]),
    assistances: pick(["assistances", "assists"]),
    assists: pick(["assists", "assistances"]),
    steals: pick(["steals"]),
    blocksFavour: pick(["blocksFavour", "blocks"]),
    blocks: pick(["blocks", "blocksFavour"])
  };
  const fg2m = statNum(normalizedTotal, "fieldGoalsMade2");
  const fg3m = statNum(normalizedTotal, "fieldGoalsMade3");
  const fg2a = statNum(normalizedTotal, "fieldGoalsAttempted2");
  const fg3a = statNum(normalizedTotal, "fieldGoalsAttempted3");
  normalizedTotal.fieldGoalsMadeTotal = statNum(existingTotal, "fieldGoalsMadeTotal", "fieldGoalsMade") || fg2m + fg3m;
  normalizedTotal.fieldGoalsAttemptedTotal = statNum(existingTotal, "fieldGoalsAttemptedTotal", "fieldGoalsAttempted") || fg2a + fg3a;
  return exposeTotalStats(side, normalizedTotal);
}

function quarterValuesFromObject(value: any): number[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  return Object.entries(value)
    .map(([key, raw]) => {
      const match = String(key).match(/^partials?(\d+)$/i);
      if (!match) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? {period:Number(match[1]), value:n} : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.period - b.period)
    .map((row: any) => row.value);
}

function quarterValues(side: any): number[] {
  const direct = side?.score?.byQuarter;
  if (Array.isArray(direct) && direct.length >= 4) return direct.map(Number).filter(Number.isFinite);
  const candidates = [side?.partials, side?.score?.partials, side, side?.score];
  for (const candidate of candidates) {
    const values = quarterValuesFromObject(candidate);
    if (values.length >= 4) return values;
  }
  return [];
}

function normalizeGameSide(side: any): any {
  if (!side || typeof side !== "object") return side;
  const byQuarter = quarterValues(side);
  if (byQuarter.length < 4) return side;
  const score = side?.score && typeof side.score === "object" ? side.score : {};
  return {...side, score:{...score, byQuarter}};
}

async function normalizedJsonResponse(res: Response, route: "stats" | "game"): Promise<Response> {
  if (!res.ok) return res;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("json")) return res;
  try {
    const body = await res.json();
    if (!body || typeof body !== "object") return new Response(JSON.stringify(body), {status: res.status, headers: res.headers});
    const normalized = route === "stats"
      ? {...body, local: normalizeEuroleagueSide(body.local), road: normalizeEuroleagueSide(body.road)}
      : {...body, local: normalizeGameSide(body.local), road: normalizeGameSide(body.road)};
    const headers = new Headers(res.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("X-CourtIQ-EuroLeague-Normalized", route === "stats" ? "stats-v2" : "quarters-v2");
    return new Response(JSON.stringify(normalized), {status: res.status, headers});
  } catch (_) {
    return res;
  }
}

async function normalizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const method = requestMethod(input, init);
  const route = method === "GET" ? euroleagueV2Route(url) : null;
  const response = await upstreamFetch(input, init);
  return route ? normalizedJsonResponse(response, route) : response;
}

Object.defineProperty(globalThis, "fetch", {value: normalizedFetch, configurable: true, writable: true});
