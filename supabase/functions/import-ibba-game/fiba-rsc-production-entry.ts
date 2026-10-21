// CourtIQ FIBA production compatibility layer.
// FIBA's current game pages expose authoritative game data through the
// Next.js React Server Components (RSC / Flight) response. This adapter
// requests that official payload, understands both direct and JSON-string
// encoded Flight chunks, and presents the resolved objects to the existing
// verified CourtIQ parser. Other providers pass through unchanged.

const nativeFetch = globalThis.fetch.bind(globalThis);
const nativeServe = Deno.serve.bind(Deno);
const FIBA_ATTEMPTS = 3;
const FIBA_RETRY_MS = 1200;

function sleep(ms:number){ return new Promise(resolve=>setTimeout(resolve,ms)); }
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
  } catch (_) { return false; }
}

function jsonEnd(text: string, start: number): number {
  let depth = 0, inString = false, escaped = false;
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
    if (end < 0) { from = hit + anchor.length; continue; }
    try {
      const value = JSON.parse(text.slice(start, end + 1));
      if (key === "game" && wantedGameId && Number(value?.gameId) !== wantedGameId) {
        from = end + 1;
        continue;
      }
      return value;
    } catch (_) { from = end + 1; }
  }
  return undefined;
}

function decodedFlightSources(text:string): string[] {
  const sources=[text];
  // Some Next.js builds embed useful Flight chunks as JSON string literals.
  // Decode those strings exactly once, preserving the raw response as source 0.
  const tokens=text.match(/"(?:\\.|[^"\\])*"/g)||[];
  for(const token of tokens){
    try{
      const decoded=JSON.parse(token);
      if(typeof decoded==="string" && /"(?:game|gameDetails|playersTeamA|playersTeamB|playByPlay)"\s*:/.test(decoded)) sources.push(decoded);
    }catch(_){}
  }
  return sources;
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
    } else if (target && typeof target === "object" && part in target) target = target[part];
    else throw new Error(`FIBA RSC dangling object reference: ${value}`);
  }
  return resolveFlight(target, roots, depth + 1);
}

function extractFibaRsc(text: string, gameId: number) {
  const keys = ["game", "playByPlay", "gameDetails", "playersTeamA", "playersTeamB"];
  const raw: Record<string, any> = {};
  const sources=decodedFlightSources(text);
  for (const key of keys) {
    for(const source of sources){
      const value = extractRoot(source, key, key === "game" ? gameId : undefined);
      if (value !== undefined) { raw[key] = value; break; }
    }
  }
  if (!raw.game) throw new Error(`FIBA_RSC_NO_GAME:${gameId}`);
  if (!raw.gameDetails || !Array.isArray(raw.playersTeamA) || !Array.isArray(raw.playersTeamB)) {
    const have=keys.filter(k=>raw[k]!==undefined).join(",");
    throw new Error(`FIBA_BOX_SCORE_PENDING:${have}`);
  }
  const resolved = resolveFlight(raw, raw);
  const teams = resolved?.gameDetails?.c || resolved?.gameData?.c || resolved?.gameData?.gameDetails?.c;
  if (!Array.isArray(teams) || teams.length < 2) throw new Error("FIBA_BOX_SCORE_PENDING:teams");
  if (!Array.isArray(resolved.playersTeamA) || !Array.isArray(resolved.playersTeamB)) throw new Error("FIBA_BOX_SCORE_PENDING:players");
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

  let lastError="";
  for(let attempt=1;attempt<=FIBA_ATTEMPTS;attempt++){
    try {
      const rsc = await nativeFetch(url, {...init, method:"GET", redirect:"follow", headers:rscHeaders(init)});
      const type = String(rsc.headers.get("content-type") || "").toLowerCase();
      if (rsc.ok && type.includes("x-component")) {
        const text = await rsc.text();
        const data = extractFibaRsc(text, gameId);
        const html = `<!doctype html><html><body><script>self.__next_f=${JSON.stringify(data)}</script></body></html>`;
        console.log(`[CourtIQ] FIBA game ${gameId} loaded from official RSC payload on attempt ${attempt}.`);
        return new Response(html,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","X-CourtIQ-FIBA-Route":"official-rsc","X-CourtIQ-FIBA-Game":String(gameId)}});
      }
      lastError=`HTTP ${rsc.status}, ${type||"no content type"}`;
    } catch (error) {
      lastError=error instanceof Error?error.message:String(error);
      console.warn(`[CourtIQ] FIBA RSC attempt ${attempt}/${FIBA_ATTEMPTS} for game ${gameId}: ${lastError}`);
      if(!lastError.startsWith("FIBA_BOX_SCORE_PENDING")) break;
    }
    if(attempt<FIBA_ATTEMPTS) await sleep(FIBA_RETRY_MS);
  }
  console.warn(`[CourtIQ] FIBA RSC route not ready for game ${gameId}: ${lastError}`);
  // Preserve legacy HTML as a final compatibility path. The response wrapper
  // below turns the legacy parser's generic error into a precise pending state.
  return nativeFetch(input, init);
}

Object.defineProperty(globalThis,"fetch",{value:fibaAwareFetch,configurable:true,writable:true});

// Wrap CourtIQ's normal request handler only to improve the user-facing FIBA
// error state. We never fabricate partial stats: if the official box score is
// not complete, the import remains blocked until verified team/player data exist.
Object.defineProperty(Deno,"serve",{
  configurable:true,
  writable:true,
  value:(handler:any)=>nativeServe(async(req:Request)=>{
    let isFiba=false;
    try{
      if(req.method==="POST"){
        const body=await req.clone().json();
        isFiba=isFibaGamePage(String(body?.url||""));
      }
    }catch(_){}
    const response=await handler(req);
    if(!isFiba || response.status<400) return response;
    try{
      const payload=await response.clone().json();
      const message=String(payload?.error||"");
      if(message.includes("FIBA box score payload was not readable") || message.includes("FIBA page data is incomplete")){
        return new Response(JSON.stringify({
          error:"FIBA has not published the complete official box score for this game yet. CourtIQ will import it once the official team and player statistics are available.",
          code:"FIBA_BOX_SCORE_PENDING"
        }),{status:409,headers:response.headers});
      }
    }catch(_){}
    return response;
  })
});

// Keep the currently verified production importer and IBBA hardening intact.
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/f7c4dd2c54466c50328aa8827ac78223d236e14b/supabase/functions/import-ibba-game/production-entry.ts");
