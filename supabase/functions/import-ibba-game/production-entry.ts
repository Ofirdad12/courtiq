// CourtIQ production importer bootstrap.
// Hardens IBBA fetching and normalizes IBBA placeholder cells before the
// parser sees them. Other providers pass through to the official importer.

const nativeFetch = globalThis.fetch.bind(globalThis);
const DIRECT_TIMEOUT_MS = 4200;
const ALIAS_TIMEOUT_MS = 2500;
const PROXY_TIMEOUT_MS = 6500;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function isIbbaPublicPage(raw: string): boolean {
  try {
    const u = new URL(raw);
    return /^(?:www\.)?ibasketball\.co\.il$/i.test(u.hostname) && /^\/match\/[a-z0-9-]+\/?$/i.test(u.pathname);
  } catch (_) {
    return false;
  }
}

function browserHeaders(referer: string): HeadersInit {
  return {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Referer": referer,
    "Upgrade-Insecure-Requests": "1"
  };
}

function officialVariants(raw: string): string[] {
  const u = new URL(raw);
  const path = u.pathname.endsWith("/") ? u.pathname : u.pathname + "/";
  const bare = path.slice(0, -1);
  return [...new Set([
    `https://www.ibasketball.co.il${path}`,
    `https://ibasketball.co.il${path}`,
    `https://www.ibasketball.co.il${bare}`,
    `https://ibasketball.co.il${bare}`
  ].filter(v => v !== raw))];
}

function looksLikeIbbaHtml(html: string): boolean {
  if (!html || html.length < 1000) return false;
  const hasDoc = /<(?:html|body|table|tbody|tr)\b/i.test(html);
  const hasBasketballShape = /data-key=["'](?:fgs|threeps|fts|pts|ast|to)["']/i.test(html)
    || /data-player-id=/i.test(html)
    || /(?:2\s*נק|3\s*נק|סך\s*הכל|נק['׳])/i.test(html);
  return hasDoc && hasBasketballShape;
}

function normalizeIbbaPlaceholders(html: string): string {
  return html.replace(/(<(?:td|th)\b[^>]*>)([\s\u00a0]*[-–—][\s\u00a0]*)(<\/(?:td|th)>)/gi, "$10$3")
    .replace(/(<(?:td|th)\b[^>]*\bdata-key=["'](?:fgs|threeps|fts)["'][^>]*>)([\s\u00a0]*0[\s\u00a0]*)(<\/(?:td|th)>)/gi, "$10-0$3");
}

function abortControllerFor(timeoutMs: number, upstream?: AbortSignal | null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("CourtIQ fetch timeout", "TimeoutError")), timeoutMs);
  if (upstream) {
    if (upstream.aborted) controller.abort(upstream.reason);
    else upstream.addEventListener("abort", () => controller.abort(upstream.reason), {once: true});
  }
  return {controller, timer};
}

async function timedFetch(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const {controller, timer} = abortControllerFor(timeoutMs, init?.signal);
  try {
    return await nativeFetch(url, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
}

async function validatedHtml(res: Response, route: string): Promise<Response | null> {
  if (!res.ok) return null;
  const raw = await res.text();
  if (!looksLikeIbbaHtml(raw)) return null;
  const html = normalizeIbbaPlaceholders(raw);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-CourtIQ-Fetch-Route": route,
      "X-CourtIQ-IBBA-Normalized": "1"
    }
  });
}

async function attempt(route: string, url: string, timeoutMs: number, statuses: string[], init?: RequestInit): Promise<Response | null> {
  try {
    const res = await timedFetch(url, init, timeoutMs);
    statuses.push(`${route}=${res.status}`);
    const hit = await validatedHtml(res, route);
    if (hit) console.log(`[CourtIQ] IBBA fetch succeeded via ${route}; ${statuses.join(", ")}`);
    return hit;
  } catch (error) {
    const kind = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "exception";
    statuses.push(`${route}=${kind}`);
    return null;
  }
}

async function firstValid(candidates: Array<{route:string;url:string;timeoutMs:number;init?:RequestInit}>, statuses: string[]): Promise<Response | null> {
  const results = await Promise.all(candidates.map(c => attempt(c.route, c.url, c.timeoutMs, statuses, c.init)));
  return results.find(Boolean) || null;
}

async function fetchIbba(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const method = requestMethod(input, init);
  if (method !== "GET" || !isIbbaPublicPage(url)) return nativeFetch(input, init);

  const statuses: string[] = [];
  const direct = await attempt("direct", url, DIRECT_TIMEOUT_MS, statuses, {
    ...init,
    method: "GET",
    redirect: "follow",
    headers: browserHeaders("https://www.ibasketball.co.il/")
  });
  if (direct) return direct;

  const aliases = officialVariants(url).map(variant => ({
    route: "official-alias",
    url: variant,
    timeoutMs: ALIAS_TIMEOUT_MS,
    init: {method:"GET", redirect:"follow" as RequestRedirect, headers:browserHeaders("https://www.ibasketball.co.il/")}
  }));
  const aliasHit = await firstValid(aliases, statuses);
  if (aliasHit) return aliasHit;

  const encoded = encodeURIComponent(url);
  const proxies = [
    {route:"allorigins", url:`https://api.allorigins.win/raw?url=${encoded}`, timeoutMs:PROXY_TIMEOUT_MS, init:{method:"GET",headers:{"Accept":"text/html,*/*"}}},
    {route:"corsdev-path", url:`https://proxy.cors.dev/${url}`, timeoutMs:PROXY_TIMEOUT_MS, init:{method:"GET",headers:{"Accept":"text/html,application/xhtml+xml,*/*;q=0.8"}}},
    {route:"corsdev-query", url:`https://proxy.cors.dev/?url=${encoded}`, timeoutMs:PROXY_TIMEOUT_MS, init:{method:"GET",headers:{"Accept":"text/html,application/xhtml+xml,*/*;q=0.8"}}},
    {route:"jina", url:`https://r.jina.ai/${url}`, timeoutMs:PROXY_TIMEOUT_MS, init:{method:"GET",headers:{"Accept":"text/plain","X-Respond-With":"html","X-Timeout":"6","X-Locale":"he-IL"}}}
  ];
  const proxyHit = await firstValid(proxies, statuses);
  if (proxyHit) return proxyHit;

  console.warn(`[CourtIQ] IBBA fetch failed: ${statuses.join(", ")}`);
  return new Response("The official IBBA source is blocking the server fetch and no verified relay returned the official game HTML.", {
    status: 504,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-CourtIQ-Fetch-Route": "blocked",
      "X-CourtIQ-Fetch-Diagnostics": statuses.join(";").slice(0,900)
    }
  });
}

Object.defineProperty(globalThis, "fetch", {
  value: fetchIbba,
  configurable: true,
  writable: true
});

await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/da7b0eed8222d5fd426f9e4adf64ed9ea1e36092/supabase/functions/import-ibba-game/index.ts");
