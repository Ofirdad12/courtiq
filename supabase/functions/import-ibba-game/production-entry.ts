// Production bootstrap for the CourtIQ official-game importer.
//
// IBBA blocks many datacenter IPs with HTTP 403. Keep the official IBBA URL as
// the source of truth, but retry through a small set of public read-through
// routes when the direct request is blocked. Every successful response is still
// parsed and validated by the existing deterministic CourtIQ engine.

const nativeFetch = globalThis.fetch.bind(globalThis);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
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
  if (!html || html.length < 1000) return false;
  const hasDoc = /<(?:html|body|table|tbody|tr)\b/i.test(html);
  const hasBasketballShape = /data-key=["'](?:fgs|threeps|fts|pts|ast|to)["']/i.test(html)
    || /data-player-id=/i.test(html)
    || /(?:2\s*נק|3\s*נק|סך\s*הכל|נק['׳])/i.test(html);
  return hasDoc && hasBasketballShape;
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

async function tryFetch(url: string, route: string, statuses: string[], init?: RequestInit): Promise<Response | null> {
  try {
    const res = await nativeFetch(url, init);
    statuses.push(`${route}=${res.status}`);
    const parsed = await htmlResponse(res, route);
    if (parsed) {
      console.log(`[CourtIQ] IBBA fetch succeeded via ${route} after ${statuses.join(", ")}`);
      return parsed;
    }
  } catch (error) {
    statuses.push(`${route}=exception`);
    console.warn(`[CourtIQ] IBBA ${route} exception`, error);
  }
  return null;
}

async function fetchWithIbbaFallback(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const direct = await nativeFetch(input, init);
  const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

  if (method !== "GET" || !isIbbaPublicPage(url) || ![403, 429, 503].includes(direct.status)) {
    return direct;
  }

  const statuses: string[] = [`direct=${direct.status}`];

  for (const variant of officialVariants(url)) {
    const hit = await tryFetch(
      variant,
      "official-alias",
      statuses,
      {method: "GET", redirect: "follow", headers: browserHeaders("https://www.ibasketball.co.il/")}
    );
    if (hit) return hit;
  }

  const encoded = encodeURIComponent(url);
  const u = new URL(url);
  const routes = [
    {
      route: "allorigins",
      url: `https://api.allorigins.win/raw?url=${encoded}`,
      init: {method: "GET", headers: {"Accept": "text/html,*/*"}}
    },
    {
      route: "codetabs",
      url: `https://api.codetabs.com/v1/proxy?quest=${encoded}`,
      init: {method: "GET", headers: {"Accept": "text/html,*/*"}}
    },
    {
      route: "corsproxy",
      url: `https://corsproxy.io/?url=${encoded}`,
      init: {method: "GET", headers: {"Accept": "text/html,*/*"}}
    },
    {
      route: "jina-https",
      url: `https://r.jina.ai/${url}`,
      init: {method: "GET", headers: {"Accept": "text/plain", "X-Respond-With": "html", "X-Timeout": "20", "X-Locale": "he-IL"}}
    },
    {
      route: "jina-http",
      url: `https://r.jina.ai/http://www.ibasketball.co.il${u.pathname}`,
      init: {method: "GET", headers: {"Accept": "text/plain", "X-Respond-With": "html", "X-Timeout": "20", "X-Locale": "he-IL"}}
    }
  ];

  for (const candidate of routes) {
    const hit = await tryFetch(candidate.url, candidate.route, statuses, candidate.init);
    if (hit) return hit;
  }

  console.warn(`[CourtIQ] IBBA all fetch routes failed: ${statuses.join(", ")}`);
  return direct;
}

Object.defineProperty(globalThis, "fetch", {
  value: fetchWithIbbaFallback,
  configurable: true,
  writable: true
});

await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/da7b0eed8222d5fd426f9e4adf64ed9ea1e36092/supabase/functions/import-ibba-game/index.ts");
