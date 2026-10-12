// Production bootstrap for the CourtIQ official-game importer.
//
// IBBA can reject requests from serverless datacenter IP ranges with HTTP 403.
// Keep the official URL as the source of truth, but when that direct public-page
// fetch is blocked, retry the same public URL through Jina Reader's browser
// renderer and request rendered HTML. The existing deterministic IBBA parser and
// all downstream validation remain unchanged.

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

async function fetchWithIbbaFallback(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const direct = await nativeFetch(input, init);
  const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

  if (method !== "GET" || !isIbbaPublicPage(url) || ![403, 429, 503].includes(direct.status)) {
    return direct;
  }

  try {
    const readerUrl = `https://r.jina.ai/${url}`;
    const fallback = await nativeFetch(readerUrl, {
      method: "GET",
      headers: {
        "Accept": "text/plain",
        "X-Respond-With": "html",
        "X-Timeout": "20",
        "X-Locale": "he-IL"
      }
    });

    if (!fallback.ok) {
      console.warn(`[CourtIQ] IBBA fallback failed: direct=${direct.status}, reader=${fallback.status}`);
      return direct;
    }

    const html = await fallback.text();
    // Never pass a Reader error/markdown page into the official parser. We only
    // accept rendered HTML that still contains a usable document/table shape.
    if (!html || !/<(?:html|body|table|tbody|tr)\b/i.test(html)) {
      console.warn(`[CourtIQ] IBBA fallback returned non-HTML content after direct ${direct.status}`);
      return direct;
    }

    console.log(`[CourtIQ] IBBA direct fetch returned ${direct.status}; rendered HTML fallback activated.`);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-CourtIQ-Fetch-Route": "ibba-rendered-fallback"
      }
    });
  } catch (error) {
    console.warn("[CourtIQ] IBBA rendered fallback exception", error);
    return direct;
  }
}

Object.defineProperty(globalThis, "fetch", {
  value: fetchWithIbbaFallback,
  configurable: true,
  writable: true
});

// Keep production pinned to the currently validated importer engine. Future
// engine upgrades should change this SHA explicitly after validation.
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/da7b0eed8222d5fd426f9e4adf64ed9ea1e36092/supabase/functions/import-ibba-game/index.ts");
