// Production bootstrap for the CourtIQ official-game importer.
//
// IBBA intermittently rejects serverless requests with HTTP 403. Before giving
// up, retry only equivalent official IBBA URL variants (www/non-www and slash
// normalization). If those official routes also fail, try the existing rendered
// reader fallback. The deterministic parser and validation engine stay unchanged.

const nativeFetch = globalThis.fetch.bind(globalThis);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isIbbaPublicPage(raw: string): boolean {
  try {
    const u = new URL(raw);
    return /^(?:www\.)?ibasketball\.co\.il$/i.test(u.hostname) && /^\/match\//i.test(u.pathname);
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
  const bare = path.endsWith("/") ? path.slice(0, -1) : path;
  const variants = [
    `https://www.ibasketball.co.il${path}`,
    `https://ibasketball.co.il${path}`,
    `https://www.ibasketball.co.il${bare}`,
    `https://ibasketball.co.il${bare}`
  ];
  return [...new Set(variants.filter(v => v !== raw))];
}

async function usableHtml(res: Response): Promise<Response | null> {
  if (!res.ok) return null;
  const html = await res.text();
  if (!html || !/<(?:html|body|table|tbody|tr)\b/i.test(html)) return null;
  return new Response(html, {
    status: 200,
    headers: {"Content-Type": "text/html; charset=utf-8"}
  });
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
    try {
      const res = await nativeFetch(variant, {
        method: "GET",
        redirect: "follow",
        headers: browserHeaders("https://www.ibasketball.co.il/")
      });
      statuses.push(`${new URL(variant).hostname}${new URL(variant).pathname.endsWith("/") ? "/" : ""}=${res.status}`);
      const htmlRes = await usableHtml(res);
      if (htmlRes) {
        htmlRes.headers.set("X-CourtIQ-Fetch-Route", "ibba-official-alias");
        console.log(`[CourtIQ] IBBA fallback activated via official alias after ${statuses.join(", ")}`);
        return htmlRes;
      }
    } catch (error) {
      statuses.push(`official-alias=exception`);
      console.warn("[CourtIQ] IBBA official alias exception", error);
    }
  }

  try {
    const readerTargets = [
      `https://r.jina.ai/${url}`,
      `https://r.jina.ai/http://www.ibasketball.co.il${new URL(url).pathname}`
    ];
    for (const readerUrl of readerTargets) {
      const fallback = await nativeFetch(readerUrl, {
        method: "GET",
        headers: {
          "Accept": "text/plain",
          "X-Respond-With": "html",
          "X-Timeout": "20",
          "X-Locale": "he-IL"
        }
      });
      statuses.push(`reader=${fallback.status}`);
      const htmlRes = await usableHtml(fallback);
      if (htmlRes) {
        htmlRes.headers.set("X-CourtIQ-Fetch-Route", "ibba-rendered-fallback");
        console.log(`[CourtIQ] IBBA rendered fallback activated after ${statuses.join(", ")}`);
        return htmlRes;
      }
    }
  } catch (error) {
    statuses.push("reader=exception");
    console.warn("[CourtIQ] IBBA rendered fallback exception", error);
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
