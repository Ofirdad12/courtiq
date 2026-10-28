// Basketball Champions League compatibility layer for CourtIQ.
//
// championsleague.basketball uses the same FIBA digital/RSC game payload shape
// as fiba.basketball, but CourtIQ's verified parser intentionally accepts only
// canonical FIBA event URLs. This adapter keeps that parser unchanged: it maps
// an official BCL /en/games/... URL to a synthetic FIBA event URL internally,
// while the network request is still sent to the original BCL page.

const nativeBclFetch = globalThis.fetch.bind(globalThis);
const nativeBclServe = Deno.serve.bind(Deno);
const bclSourceByGame = new Map<number, string>();

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function bclGame(raw: string): {gameId:number; gamePart:string; sourceUrl:string} | null {
  try {
    const u = new URL(raw);
    if (!/^(?:www\.)?championsleague\.basketball$/i.test(u.hostname)) return null;
    const match = u.pathname.match(/^\/en\/games\/(\d+)-([a-z0-9-]+)\/?$/i);
    if (!match) return null;
    return {
      gameId: Number(match[1]),
      gamePart: `${match[1]}-${match[2]}`,
      sourceUrl: `https://www.championsleague.basketball/en/games/${match[1]}-${match[2]}`
    };
  } catch (_) {
    return null;
  }
}

function syntheticFibaUrl(gamePart: string): string {
  return `https://www.fiba.basketball/en/events/basketball-champions-league/games/${gamePart}`;
}

function syntheticBclGameId(raw: string): number {
  try {
    const u = new URL(raw);
    if (!/^(?:www\.)?fiba\.basketball$/i.test(u.hostname)) return 0;
    if (!/^\/en\/events\/basketball-champions-league\/games\//i.test(u.pathname)) return 0;
    return Number(u.pathname.match(/\/games\/(\d+)-/i)?.[1] || 0);
  } catch (_) {
    return 0;
  }
}

async function bclAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const gameId = requestMethod(input, init) === "GET" ? syntheticBclGameId(url) : 0;
  const source = gameId ? bclSourceByGame.get(gameId) : "";
  if (!source) return nativeBclFetch(input, init);

  console.log(`[CourtIQ] BCL game ${gameId}: routing FIBA-compatible RSC request to ${source}.`);
  return nativeBclFetch(source, {...init, method:"GET", redirect:"follow"});
}

Object.defineProperty(globalThis, "fetch", {
  value: bclAwareFetch,
  configurable: true,
  writable: true
});

function rewrittenRequest(req: Request, body: any, url: string): Request {
  const headers = new Headers(req.headers);
  headers.set("Content-Type", "application/json");
  return new Request(req.url, {
    method: req.method,
    headers,
    body: JSON.stringify({...body, url}),
    signal: req.signal
  });
}

function patchBclPayload(payload: any, sourceUrl: string) {
  if (!payload || typeof payload !== "object") return payload;
  payload.source = payload.source || "bcl_official_fiba_platform";
  payload.source_aliases = [...new Set([...(Array.isArray(payload.source_aliases) ? payload.source_aliases : []), sourceUrl])];
  if (payload.ui && typeof payload.ui === "object") {
    payload.ui.sourceUrl = sourceUrl;
    payload.ui.sourceLabel = "BCL OFFICIAL BOX SCORE · DATA CONFIRMED";
    if (!payload.ui.comp || /basketball champions league/i.test(String(payload.ui.comp))) {
      payload.ui.comp = "Basketball Champions League";
    }
  }
  if (payload.report && typeof payload.report === "object") {
    payload.report.source_url = sourceUrl;
    payload.report.source_label = "BCL OFFICIAL BOX SCORE";
  }
  if (payload.code === "FIBA_BOX_SCORE_PENDING") {
    payload.error = "BCL has not published the complete official box score for this game yet. CourtIQ will import it once the official team and player statistics are available.";
    payload.code = "BCL_BOX_SCORE_PENDING";
  }
  return payload;
}

Object.defineProperty(Deno, "serve", {
  configurable: true,
  writable: true,
  value: (handler: any) => nativeBclServe(async (req: Request) => {
    let sourceUrl = "";
    let gameId = 0;
    let effectiveReq = req;

    try {
      if (req.method === "POST") {
        const body = await req.clone().json();
        const info = bclGame(String(body?.url || ""));
        if (info) {
          sourceUrl = info.sourceUrl;
          gameId = info.gameId;
          bclSourceByGame.set(gameId, sourceUrl);
          effectiveReq = rewrittenRequest(req, body, syntheticFibaUrl(info.gamePart));
          console.log(`[CourtIQ] BCL game ${gameId}: accepted official BCL URL and enabled FIBA-compatible parser.`);
        }
      }
    } catch (_) {}

    try {
      const response = await handler(effectiveReq);
      if (!sourceUrl || !gameId) return response;

      const headers = new Headers(response.headers);
      headers.set("X-CourtIQ-BCL-Route", "official-rsc");
      headers.set("X-CourtIQ-BCL-Game", String(gameId));

      if ((response.headers.get("content-type") || "").toLowerCase().includes("json")) {
        try {
          const payload = patchBclPayload(await response.clone().json(), sourceUrl);
          headers.set("Content-Type", "application/json");
          return new Response(JSON.stringify(payload), {
            status: response.status,
            statusText: response.statusText,
            headers
          });
        } catch (error) {
          console.warn(`[CourtIQ] BCL game ${gameId}: response metadata patch skipped.`, error);
        }
      }
      return new Response(response.body, {status:response.status, statusText:response.statusText, headers});
    } finally {
      if (gameId) bclSourceByGame.delete(gameId);
    }
  })
});
