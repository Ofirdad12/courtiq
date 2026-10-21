// CourtIQ FIBA production compatibility layer.
// FIBA's current game pages expose the authoritative box score in the
// Next.js React Server Components (RSC / Flight) response. The legacy CourtIQ
// importer parses the same game objects from HTML script tags. This adapter
// requests the official RSC payload, resolves the Flight references used by
// the game objects, then presents a tiny synthetic HTML document to the
// existing verified parser. Other providers pass through unchanged.

const nativeFetch = globalThis.fetch.bind(globalThis);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function isFibaGamePage(raw: string): boolean {
  try {
    const u = new URL(raw);
    return /^(?:www\.)?fiba\.basketball$/i.test(u.hostname) && /\/games\/\d+-[^/]+-[^/?#]+\/?$/i.test(u.pathname);
  } catch (_) {
    return false;
  }
}

function jsonEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractRoot(text: string, key: string, wantedGameId?: number): any {
  const anchor = `"${key}":`;
  let from = 0;
  while (from < text.length) {
    const hit = text.indexOf(anchor, from);
    if (hit < 0) return undefined;
    let start = hit + anchor.length;
    while (/\s/.test(text[start] || "")) start++;
    if (text[start] !== "{" && text[start] !== "[") {
      from = hit + anchor.length;
      continue;
    }
    const end = jsonEnd(text, start);
    if (end < 0) {
      from = hit + anchor.length;
      continue;
    }
    try {
      const value = JSON.parse(text.slice(start, end + 1));
      if (key === "game" && wantedGameId && Number(value?.gameId) !== wantedGameId) {
        from = end + 1;
        continue;
      }
      return value;
    } catch (_) {
      from = end + 1;
    }
  }
  return undefined;
}

function resolveFlight(value: any, roots: Record<string, any>, depth = 0): any {
  if (depth > 50) throw new Error("FIBA RSC reference chain is too deep.");
  if (Array.isArray(value)) return value.map(v => resolveFlight(v, roots, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveFlight(v, roots, depth + 1);
    return out;
  }
  if (typeof value !== "string" || !value.startsWith("$")) return value;
  if (value === "$undefined") return null;
  if (value.startsWith("$$")) return value.slice(1);
  if (value.startsWith("$D")) return value.slice(2);

  const m = value.match(/^\$[0-9a-fA-F]+:(.+)$/);
  if (!m) return value;
  const parts = m[1].split(":");
  if (parts.length < 2 || parts[0] !== "props" || !(parts[1] in roots)) return value;

  let target: any = roots[parts[1]];
  for (const part of parts.slice(2)) {
    if (Array.isArray(target) && /^\d+$/.test(part)) {
      const i = Number(part);
      if (i < 0 || i >= target.length) throw new Error(`FIBA RSC dangling array reference: ${value}`);
      target = target[i];
    } else if (target && typeof target === "object" && part in target) {
      target = target[part];
    } else {
      throw new Error(`FIBA RSC dangling object reference: ${value}`);
    }
  }
  return resolveFlight(target, roots, depth + 1);
}

function extractFibaRsc(text: string, gameId: number) {
  const keys = ["game", "playByPlay", "gameDetails", "playersTeamA", "playersTeamB"];
  const raw: Record<string, any> = {};
  for (const key of keys) {
    const value = extractRoot(text, key, key === "game" ? gameId : undefined);
    if (value !== undefined) raw[key] = value;
  }
  if (!raw.game) throw new Error(`FIBA RSC does not contain game ${gameId}.`);
  if (!raw.gameDetails || !Array.isArray(raw.playersTeamA) || !Array.isArray(raw.playersTeamB)) {
    throw new Error("FIBA RSC does not contain a complete box score yet.");
  }

  const resolved = resolveFlight(raw, raw);
  const teams = resolved?.gameDetails?.c || resolved?.gameData?.c || resolved?.gameData?.gameDetails?.c;
  if (!Array.isArray(teams) || teams.length < 2) throw new Error("FIBA RSC team box score is incomplete.");
  if (!Array.isArray(resolved.playersTeamA) || !Array.isArray(resolved.playersTeamB)) {
    throw new Error("FIBA RSC player rosters are incomplete.");
  }
  return resolved;
}

function rscHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers || undefined);
  headers.set("RSC", "1");
  headers.set("Accept", "text/x-component, */*;q=0.8");
  headers.set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36");
  headers.set("Accept-Language", "en-US,en;q=0.9");
  headers.set("Cache-Control", "no-cache");
  headers.set("Pragma", "no-cache");
  return headers;
}

async function fibaAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  if (requestMethod(input, init) !== "GET" || !isFibaGamePage(url)) return nativeFetch(input, init);

  const gameId = Number(new URL(url).pathname.match(/\/games\/(\d+)-/i)?.[1] || 0);
  if (!gameId) return nativeFetch(input, init);

  try {
    const rsc = await nativeFetch(url, {
      ...init,
      method: "GET",
      redirect: "follow",
      headers: rscHeaders(init)
    });
    const type = String(rsc.headers.get("content-type") || "").toLowerCase();
    if (rsc.ok && type.includes("x-component")) {
      const text = await rsc.text();
      const data = extractFibaRsc(text, gameId);
      const html = `<!doctype html><html><body><script>self.__next_f=${JSON.stringify(data)}</script></body></html>`;
      console.log(`[CourtIQ] FIBA game ${gameId} loaded from official RSC payload.`);
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-CourtIQ-FIBA-Route": "official-rsc",
          "X-CourtIQ-FIBA-Game": String(gameId)
        }
      });
    }
    console.warn(`[CourtIQ] FIBA RSC route unavailable for game ${gameId}: HTTP ${rsc.status}, ${type || "no content type"}.`);
  } catch (error) {
    console.warn(`[CourtIQ] FIBA RSC adapter failed for game ${gameId}: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Preserve the legacy HTML path as a fail-safe for older FIBA pages.
  return nativeFetch(input, init);
}

Object.defineProperty(globalThis, "fetch", {
  value: fibaAwareFetch,
  configurable: true,
  writable: true
});

// Keep the currently verified production importer and its IBBA hardening intact.
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/f7c4dd2c54466c50328aa8827ac78223d236e14b/supabase/functions/import-ibba-game/production-entry.ts");
