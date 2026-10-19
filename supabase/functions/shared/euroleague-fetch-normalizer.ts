// Preserve the production EuroLeague v2 team-total normalization before the
// legacy importer consumes the official stats response.

const upstreamFetch = globalThis.fetch.bind(globalThis);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function isEuroleagueStatsFeed(raw: string): boolean {
  try {
    const u = new URL(raw);
    return /^api-live\.euroleague\.net$/i.test(u.hostname)
      && /^\/v2\/competitions\/[EU]\/seasons\/[EU]\d{4}\/games\/\d+\/stats\/?$/i.test(u.pathname);
  } catch (_) {
    return false;
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

function normalizeEuroleagueSide(side: any): any {
  if (!side || typeof side !== "object") return side;
  const existingTotal = side?.total?.stats || side?.total || {};
  if (fgaOf(existingTotal) > 0) return side;

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

  const normalizedTotal = {
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
  return {...side, total: normalizedTotal};
}

async function normalizeEuroleagueResponse(res: Response): Promise<Response> {
  if (!res.ok) return res;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("json")) return res;
  try {
    const body = await res.json();
    if (!body || typeof body !== "object") return new Response(JSON.stringify(body), {status: res.status, headers: res.headers});
    const normalized = {...body, local: normalizeEuroleagueSide(body.local), road: normalizeEuroleagueSide(body.road)};
    const headers = new Headers(res.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("X-CourtIQ-EuroLeague-Normalized", "1");
    return new Response(JSON.stringify(normalized), {status: res.status, headers});
  } catch (_) {
    return res;
  }
}

async function normalizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const method = requestMethod(input, init);
  const response = await upstreamFetch(input, init);
  return method === "GET" && isEuroleagueStatsFeed(url) ? normalizeEuroleagueResponse(response) : response;
}

Object.defineProperty(globalThis, "fetch", {value: normalizedFetch, configurable: true, writable: true});
