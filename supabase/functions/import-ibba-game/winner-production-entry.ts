// CourtIQ Winner League fetch hardening.
// basket.co.il game pages can intermittently stall even when the completed
// box score is available. Bound those upstream waits and retry the official
// page through the alternate official hostname before the core parser runs.

const winnerNativeFetch = globalThis.fetch.bind(globalThis);
const WINNER_DIRECT_TIMEOUT_MS = 6500;
const WINNER_ALIAS_TIMEOUT_MS = 6500;
const WINNER_RETRY_DELAY_MS = 350;

function winnerRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function winnerRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

function isWinnerGamePage(raw: string): boolean {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    return host === 'basket.co.il'
      && /^\/game-zone\.asp$/i.test(u.pathname)
      && /^\d+$/.test(String(u.searchParams.get('GameId') || ''));
  } catch (_) {
    return false;
  }
}

function winnerHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers || undefined);
  headers.set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36');
  headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
  headers.set('Accept-Language', 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7');
  headers.set('Cache-Control', 'no-cache');
  headers.set('Pragma', 'no-cache');
  headers.set('Referer', 'https://basket.co.il/');
  return headers;
}

function winnerAlias(raw: string): string | null {
  try {
    const u = new URL(raw);
    const bare = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (bare !== 'basket.co.il') return null;
    u.hostname = u.hostname.toLowerCase().startsWith('www.') ? 'basket.co.il' : 'www.basket.co.il';
    return u.toString();
  } catch (_) {
    return null;
  }
}

function winnerController(timeoutMs: number, upstream?: AbortSignal | null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('CourtIQ Winner fetch timeout', 'TimeoutError')), timeoutMs);
  if (upstream) {
    if (upstream.aborted) controller.abort(upstream.reason);
    else upstream.addEventListener('abort', () => controller.abort(upstream.reason), {once: true});
  }
  return {controller, timer};
}

async function winnerTimedFetch(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const {controller, timer} = winnerController(timeoutMs, init?.signal);
  try {
    return await winnerNativeFetch(url, {
      ...init,
      method: 'GET',
      redirect: 'follow',
      headers: winnerHeaders(init),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeWinnerGameHtml(html: string, requestedUrl: string): boolean {
  if (!html || html.length < 5000) return false;
  const requestedId = (() => {
    try { return String(new URL(requestedUrl).searchParams.get('GameId') || ''); }
    catch (_) { return ''; }
  })();
  const hasStats = /class=["'][^"']*stats_tbl/i.test(html) || /stats_tbl/i.test(html);
  const hasGameShape = /game-zone/i.test(html) || /סטטיסטיקה|Box\s*Score|PLAYER\s*NAME/i.test(html);
  const idMatches = !requestedId || html.includes(`GameId=${requestedId}`) || html.includes(`GameId%3D${requestedId}`) || hasStats;
  return hasStats && hasGameShape && idMatches;
}

async function winnerAttempt(route: string, url: string, init: RequestInit | undefined, timeoutMs: number, statuses: string[]): Promise<Response | null> {
  try {
    const res = await winnerTimedFetch(url, init, timeoutMs);
    statuses.push(`${route}=${res.status}`);
    if (!res.ok) return null;
    const html = await res.text();
    if (!looksLikeWinnerGameHtml(html, url)) {
      statuses.push(`${route}=invalid-html`);
      return null;
    }
    console.log(`[CourtIQ] Winner League fetch succeeded via ${route}; ${statuses.join(', ')}`);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-CourtIQ-Fetch-Route': route,
        'X-CourtIQ-Winner-Hardened': '1'
      }
    });
  } catch (error) {
    const timeout = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
    statuses.push(`${route}=${timeout ? 'timeout' : 'exception'}`);
    return null;
  }
}

async function winnerAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = winnerRequestUrl(input);
  if (winnerRequestMethod(input, init) !== 'GET' || !isWinnerGamePage(url)) {
    return winnerNativeFetch(input, init);
  }

  const statuses: string[] = [];
  const direct = await winnerAttempt('winner-direct', url, init, WINNER_DIRECT_TIMEOUT_MS, statuses);
  if (direct) return direct;

  await new Promise(resolve => setTimeout(resolve, WINNER_RETRY_DELAY_MS));
  const alias = winnerAlias(url);
  if (alias) {
    const alternate = await winnerAttempt('winner-official-alias', alias, init, WINNER_ALIAS_TIMEOUT_MS, statuses);
    if (alternate) return alternate;
  }

  console.warn(`[CourtIQ] Winner League fetch failed: ${statuses.join(', ')}`);
  return new Response('The official Winner League source did not respond with a readable game box score within the CourtIQ timeout.', {
    status: 504,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-CourtIQ-Fetch-Route': 'winner-timeout',
      'X-CourtIQ-Fetch-Diagnostics': statuses.join(';').slice(0, 700)
    }
  });
}

Object.defineProperty(globalThis, 'fetch', {
  value: winnerAwareFetch,
  configurable: true,
  writable: true
});
