// Production bootstrap for the CourtIQ official-game importer.
//
// IBBA can block datacenter IPs with HTTP 403. Keep the official IBBA URL as
// the source of truth, but use tightly bounded fallback fetches so an import
// never sits on slow proxy routes for tens of seconds. When the browser sends
// a saved official IBBA HTML page, use that HTML for this request instead of
// going back to the network.

const nativeFetch = globalThis.fetch.bind(globalThis);
const nativeServe: any = Deno.serve.bind(Deno);
const DIRECT_TIMEOUT_MS = 4500;
const ALIAS_TIMEOUT_MS = 2500;
const PROXY_TIMEOUT_MS = 5500;
const MAX_SOURCE_HTML_CHARS = 5_000_000;
const uploadedIbbaHtml = new Map<string, string>();

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function normalizeUrl(raw: string): string {
  try {
    return new URL(String(raw || "").trim()).toString();
  } catch (_) {
    return String(raw || "").trim();
  }
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
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
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
  if (!html || html.length < 1000 || html.length > MAX_SOURCE_HTML_CHARS) return false;
  const hasDoc = /<(?:html|body|table|tbody|tr)\b/i.test(html);
  const hasBasketballShape = /data-key=["'](?:fgs|threeps|fts|pts|ast|to)["']/i.test(html)
    || /data-player-id=/i.test(html)
    || /(?:2\s*נק|3\s*נק|סך\s*הכל|נק['׳])/i.test(html);
  return hasDoc && hasBasketballShape;
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

async function timedFetch(input: RequestInfo | URL, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const {controller, timer} = abortControllerFor(timeoutMs, init?.signal);
  try {
    return await nativeFetch(input, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
}

async function htmlResponse(res: Response, route: string): Promise<Response | null> {
  if (!res.ok) return null;
  const html = await res.text();
  if (!looksLikeIbbaHtml(html)) return null;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-CourtIQ-Fetch-Route": route
    }
  });
}

async function tryFetch(url: string, route: string, statuses: string[], timeoutMs: number, init?: RequestInit): Promise<Response | null> {
  const {controller, timer} = abortControllerFor(timeoutMs, init?.signal);
  try {
    const res = await nativeFetch(url, {...init, signal: controller.signal});
    statuses.push(`${route}=${res.status}`);
    const parsed = await htmlResponse(res, route);
    if (parsed) {
      console.log(`[CourtIQ] IBBA fetch succeeded via ${route}; ${statuses.join(", ")}`);
      return parsed;
    }
  } catch (error) {
    const kind = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "exception";
    statuses.push(`${route}=${kind}`);
  } finally {
    clearTimeout(timer);
  }
  return null;
}

async function firstValid(candidates: Array<{route: string; url: string; timeoutMs: number; init?: RequestInit}>, statuses: string[]): Promise<Response | null> {
  const results = await Promise.all(candidates.map(c => tryFetch(c.url, c.route, statuses, c.timeoutMs, c.init)));
  return results.find(Boolean) || null;
}

async function fetchWithIbbaFallback(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const method = requestMethod(input, init);

  if (method !== "GET" || !isIbbaPublicPage(url)) return nativeFetch(input, init);

  const uploaded = uploadedIbbaHtml.get(normalizeUrl(url));
  if (uploaded) {
    console.log("[CourtIQ] IBBA fetch satisfied by uploaded official HTML.");
    return new Response(uploaded, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-CourtIQ-Fetch-Route": "browser-upload"
      }
    });
  }

  let direct: Response | null = null;
  try {
    direct = await timedFetch(input, init, DIRECT_TIMEOUT_MS);
    if (direct.ok || ![403, 429, 503].includes(direct.status)) return direct;
  } catch (_) {
    direct = null;
  }

  const statuses: string[] = [`direct=${direct?.status ?? "timeout"}`];
  const aliases = officialVariants(url).map(variant => ({
    route: "official-alias",
    url: variant,
    timeoutMs: ALIAS_TIMEOUT_MS,
    init: {method: "GET", redirect: "follow" as RequestRedirect, headers: browserHeaders("https://www.ibasketball.co.il/")}
  }));
  const aliasHit = await firstValid(aliases, statuses);
  if (aliasHit) return aliasHit;

  const encoded = encodeURIComponent(url);
  const proxies = [
    {
      route: "corsdev-path",
      url: `https://proxy.cors.dev/${url}`,
      timeoutMs: PROXY_TIMEOUT_MS,
      init: {method: "GET", headers: {"Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}}
    },
    {
      route: "corsdev-query",
      url: `https://proxy.cors.dev/?url=${encoded}`,
      timeoutMs: PROXY_TIMEOUT_MS,
      init: {method: "GET", headers: {"Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}}
    },
    {
      route: "allorigins",
      url: `https://api.allorigins.win/raw?url=${encoded}`,
      timeoutMs: PROXY_TIMEOUT_MS,
      init: {method: "GET", headers: {"Accept": "text/html,*/*"}}
    },
    {
      route: "jina",
      url: `https://r.jina.ai/${url}`,
      timeoutMs: PROXY_TIMEOUT_MS,
      init: {method: "GET", headers: {"Accept": "text/plain", "X-Respond-With": "html", "X-Timeout": "5", "X-Locale": "he-IL"}}
    }
  ];
  const proxyHit = await firstValid(proxies, statuses);
  if (proxyHit) return proxyHit;

  console.warn(`[CourtIQ] IBBA bounded fetch failed: ${statuses.join(", ")}`);
  return new Response("The official IBBA source is blocking CourtIQ's server fetch and no verified relay returned the official game HTML.", {
    status: 504,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-CourtIQ-Fetch-Route": "blocked",
      "X-CourtIQ-Fetch-Diagnostics": statuses.join(";").slice(0, 900)
    }
  });
}

// The parser owns Deno.serve. Wrap only the request entrypoint so a selected
// browser file can be attached to the matching IBBA URL for the lifetime of
// that request. This keeps the normal URL importer on the same fast path.
const patchedServe = (...args: any[]) => {
  const handlerIndex = typeof args[0] === "function" ? 0 : 1;
  const handler = args[handlerIndex];
  if (typeof handler !== "function") return nativeServe(...args);

  const wrappedHandler = async (req: Request, info: unknown) => {
    let uploadKey = "";
    if (req.method === "POST") {
      try {
        const body: any = await req.clone().json();
        const candidate = typeof body?.source_html === "string" ? body.source_html : "";
        const candidateUrl = normalizeUrl(String(body?.url || ""));
        if (candidate && isIbbaPublicPage(candidateUrl) && looksLikeIbbaHtml(candidate)) {
          uploadKey = candidateUrl;
          uploadedIbbaHtml.set(uploadKey, candidate);
          console.log("[CourtIQ] IBBA uploaded HTML attached to request.");
        }
      } catch (_) {}
    }

    try {
      return await handler(req, info);
    } finally {
      if (uploadKey) uploadedIbbaHtml.delete(uploadKey);
    }
  };

  const nextArgs = args.slice();
  nextArgs[handlerIndex] = wrappedHandler;
  return nativeServe(...nextArgs);
};

Object.defineProperty(Deno, "serve", {
  value: patchedServe,
  configurable: true,
  writable: true
});

Object.defineProperty(globalThis, "fetch", {
  value: fetchWithIbbaFallback,
  configurable: true,
  writable: true
});

await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/99323917f725574082f5146fc5a8b8eb936831d6/supabase/functions/import-ibba-game/index.ts");
