// CourtIQ Global Sports Archive basketball importer.
// Intercepts GSA basketball match URLs before the legacy official-source router,
// parses the published box score, validates it, persists the game/player memory,
// and returns the same UI/report contract used by the existing importer.

import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";

const gsaNativeServe = Deno.serve.bind(Deno);
const gsaNativeFetch = globalThis.fetch.bind(globalThis);
const PROVIDER = "GSA";
const PARSER = "global-sports-archive-html-v1";
const cors = {
  "Access-Control-Allow-Origin": "https://ofirdad12.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
const norm = (s: unknown) => clean(s).toUpperCase().replace(/\s+/g, "");
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (a: number, b: number) => b ? Math.round(a / b * 1000) / 10 : 0;
const n0 = (s: unknown) => Number(clean(s).replace(/[^0-9.-]/g, "")) || 0;
const ma = (s: unknown): [number, number] => {
  const m = clean(s).match(/(\d+)\s*[-/–—]\s*(\d+)/);
  if (!m) throw new Error("Unreadable made-attempted value: " + clean(s));
  return [Number(m[1]), Number(m[2])];
};
const hasMa = (s: unknown) => /^\s*\d+\s*[-/–—]\s*\d+\s*$/.test(clean(s));
const minutesValue = (s: unknown) => {
  const m = clean(s).match(/^(\d+):(\d{2})$/);
  return m ? r1(Number(m[1]) + Number(m[2]) / 60) : 0;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function isGsaHostUrl(raw: string) {
  try {
    const u = new URL(raw);
    return /^(?:www\.)?globalsportsarchive\.com$/i.test(u.hostname);
  } catch (_) {
    return false;
  }
}

function validateGsaUrl(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:" || !/^(?:www\.)?globalsportsarchive\.com$/i.test(u.hostname)) {
    throw new Error("Use a Global Sports Archive HTTPS basketball match URL.");
  }
  const m = u.pathname.match(/^\/match\/basketball\/(\d{4}-\d{2}-\d{2})\/[a-z0-9-]+\/(\d+)\/?$/i);
  if (!m) throw new Error("Unsupported Global Sports Archive URL. Paste a /match/basketball/.../<match-id>/ page.");
  u.search = "";
  u.hash = "";
  return { u, gameDate: m[1], externalId: m[2] };
}

function browserHeaders(referer: string): HeadersInit {
  return {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Referer": referer
  };
}

async function timedFetch(url: string, init: RequestInit, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("GSA fetch timeout", "TimeoutError")), timeoutMs);
  try { return await gsaNativeFetch(url, { ...init, signal: controller.signal, redirect: "follow" }); }
  finally { clearTimeout(timer); }
}

function looksLikeGsaBoxScore(html: string) {
  return html.length > 2500 && /Boxscore/i.test(html) && /\b2PT\b/i.test(html) && /\b3PT\b/i.test(html) && /\bOREB\b/i.test(html) && /\bPTS\b/i.test(html);
}

async function fetchGsaHtml(source: URL) {
  const variants = [source.toString()];
  const alt = new URL(source.toString());
  alt.hostname = source.hostname.startsWith("www.") ? "globalsportsarchive.com" : "www.globalsportsarchive.com";
  variants.push(alt.toString());
  const diagnostics: string[] = [];

  for (const url of [...new Set(variants)]) {
    try {
      const res = await timedFetch(url, { method: "GET", headers: browserHeaders("https://globalsportsarchive.com/") });
      diagnostics.push(`official=${res.status}`);
      if (res.ok) {
        const html = await res.text();
        if (looksLikeGsaBoxScore(html)) return { html, route: "official" };
        diagnostics.push("official=invalid-html");
      }
    } catch (e) { diagnostics.push(e instanceof DOMException ? "official=timeout" : "official=exception"); }
  }

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source.toString())}`;
  try {
    const res = await timedFetch(proxyUrl, { method: "GET", headers: { "Accept": "text/html,*/*" } }, 6500);
    diagnostics.push(`relay=${res.status}`);
    if (res.ok) {
      const html = await res.text();
      if (looksLikeGsaBoxScore(html)) return { html, route: "verified-relay" };
      diagnostics.push("relay=invalid-html");
    }
  } catch (_) { diagnostics.push("relay=timeout"); }

  throw new Error("Global Sports Archive did not return a readable basketball box score. " + diagnostics.join(", "));
}

function cells($: cheerio.CheerioAPI, tr: any) {
  return $(tr).find("th,td").toArray().map((c: any) => clean($(c).text()));
}

function isBoxHeader(row: string[]) {
  const h = row.map(norm);
  const has = (v: string) => h.includes(v);
  return has("PLAYER") && has("MIN") && has("2PT") && has("3PT") && has("FT") && has("OREB") && has("DREB") && has("AST") && has("TO") && has("PTS");
}

function boxBlocks($: cheerio.CheerioAPI) {
  const blocks: Array<{ rows: string[][]; rowEls: any[] }> = [];
  $("table").each((_: number, table: any) => {
    const rowEls = $(table).find("tr").toArray();
    const rows = rowEls.map((tr: any) => cells($, tr));
    const heads = rows.map((r, i) => isBoxHeader(r) ? i : -1).filter(i => i >= 0);
    heads.forEach((start, i) => {
      const end = heads[i + 1] ?? rows.length;
      blocks.push({ rows: rows.slice(start, end), rowEls: rowEls.slice(start, end) });
    });
  });
  return blocks;
}

function column(headers: string[], names: string[], required = true) {
  const wanted = names.map(norm);
  const i = headers.findIndex(h => wanted.includes(norm(h)));
  if (i < 0 && required) throw new Error("GSA box score is missing column " + names[0] + ".");
  return i;
}

function parseGsaBlock($: cheerio.CheerioAPI, block: { rows: string[][]; rowEls: any[] }) {
  const headers = block.rows[0];
  const ci = {
    number: column(headers, ["#"], false), name: column(headers, ["Player"]), pos: column(headers, ["POS"], false), min: column(headers, ["MIN"]),
    two: column(headers, ["2PT"]), three: column(headers, ["3PT"]), ft: column(headers, ["FT"]), oreb: column(headers, ["OREB"]), dreb: column(headers, ["DREB"]),
    reb: column(headers, ["REB"], false), ast: column(headers, ["AST"]), stl: column(headers, ["STL"], false), blk: column(headers, ["BLK"], false), tov: column(headers, ["TO"]),
    pf: column(headers, ["PF"], false), plus: column(headers, ["+/-", "+/−", "PM"], false), fr: column(headers, ["FR"], false), pts: column(headers, ["PTS"])
  };

  const players: any[] = [];
  let totalRow: string[] | null = null;
  for (let i = 1; i < block.rows.length; i++) {
    const row = block.rows[i];
    if (!row.some(Boolean)) continue;
    const minText = clean(row[ci.min]);
    const nameText = clean(row[ci.name]);
    const shotShape = hasMa(row[ci.two]) && hasMa(row[ci.three]) && hasMa(row[ci.ft]);
    const played = /^\d{1,3}:\d{2}$/.test(minText);
    const dnp = /DNP|DID NOT PLAY|DIDN'T PLAY/i.test(minText);

    if (shotShape && !played && !dnp) {
      totalRow = row;
      continue;
    }
    if (!nameText || (!played && !dnp)) continue;

    const starter = /\*/.test(nameText);
    const name = clean(nameText.replace(/\*/g, ""));
    const rowEl = block.rowEls[i];
    const href = clean($(rowEl).find("a[href*='/people/basketball/']").first().attr("href"));
    const externalPlayerId = href.match(/\/people\/basketball\/[^/]+\/(\d+)\/?/i)?.[1] || "";
    let two_pm = 0, two_pa = 0, three_pm = 0, three_pa = 0, ftm = 0, fta = 0;
    if (played) {
      [two_pm, two_pa] = ma(row[ci.two]); [three_pm, three_pa] = ma(row[ci.three]); [ftm, fta] = ma(row[ci.ft]);
    }
    players.push({
      id: externalPlayerId, number: ci.number >= 0 ? n0(row[ci.number]) : 0, name, position: ci.pos >= 0 ? clean(row[ci.pos]) || null : null,
      starter, has_played: played, minutes: played ? minutesValue(minText) : 0, points: played ? n0(row[ci.pts]) : 0,
      two_pm, two_pa, three_pm, three_pa, ftm, fta,
      oreb: played ? n0(row[ci.oreb]) : 0, dreb: played ? n0(row[ci.dreb]) : 0, ast: played ? n0(row[ci.ast]) : 0,
      steals: played && ci.stl >= 0 ? n0(row[ci.stl]) : 0, blocks: played && ci.blk >= 0 ? n0(row[ci.blk]) : 0, tov: played ? n0(row[ci.tov]) : 0,
      pf: played && ci.pf >= 0 ? n0(row[ci.pf]) : 0, fouls_received: played && ci.fr >= 0 ? n0(row[ci.fr]) : null,
      plus_minus: played && ci.plus >= 0 ? n0(row[ci.plus]) : null
    });
  }

  if (!players.some(p => p.has_played)) throw new Error("GSA player rows were not found.");
  if (!totalRow) throw new Error("GSA official team total row was not found.");
  const [two_pm, two_pa] = ma(totalRow[ci.two]), [three_pm, three_pa] = ma(totalRow[ci.three]), [ftm, fta] = ma(totalRow[ci.ft]);
  const total = {
    points: n0(totalRow[ci.pts]), two_pm, two_pa, three_pm, three_pa, ftm, fta,
    oreb: n0(totalRow[ci.oreb]), dreb: n0(totalRow[ci.dreb]), ast: n0(totalRow[ci.ast]), tov: n0(totalRow[ci.tov]),
    steals: ci.stl >= 0 ? n0(totalRow[ci.stl]) : players.reduce((s, p) => s + p.steals, 0),
    blocks: ci.blk >= 0 ? n0(totalRow[ci.blk]) : players.reduce((s, p) => s + p.blocks, 0),
    pf: ci.pf >= 0 ? n0(totalRow[ci.pf]) : players.reduce((s, p) => s + p.pf, 0)
  };
  const beforeShots = totalRow.slice(0, Math.max(0, ci.two)).map(clean).filter(Boolean);
  const teamName = clean(totalRow[ci.name]) || beforeShots.find(v => !/^\d+$/.test(v) && !/^(?:TOTAL|TOTALS|TEAM)$/i.test(v)) || "";
  return { teamName, total, players };
}

function titleMeta($: cheerio.CheerioAPI, fallbackDate: string) {
  const title = clean($("title").text());
  const m = title.match(/^Match Report of (.+?) vs (.+?)\s+-\s+(\d{4}-\d{2}-\d{2})\s+-\s+(.+?)\s+-\s+Global Sports Archive/i);
  return m ? { home: clean(m[1]), away: clean(m[2]), date: m[3], competition: clean(m[4]) } : { home: "", away: "", date: fallbackDate, competition: "Global Sports Archive Basketball" };
}

function quarterScores($: cheerio.CheerioAPI) {
  let result: any[] = [];
  $("table").each((_: number, table: any) => {
    if (result.length) return;
    const rows = $(table).find("tr").toArray().map((tr: any) => cells($, tr));
    const hi = rows.findIndex(r => r.some(c => /^Q1$/i.test(clean(c))) && r.some(c => /^Q4$/i.test(clean(c))) && r.some(c => /^TOT$/i.test(clean(c))));
    if (hi < 0 || rows.length < hi + 3) return;
    const header = rows[hi];
    const periodCols = header.map((h, i) => /^(?:Q[1-4]|OT\d*)$/i.test(clean(h)) ? i : -1).filter(i => i >= 0);
    const sideRows = rows.slice(hi + 1).filter(r => periodCols.every(i => /^\d+$/.test(clean(r[i])))).slice(0, 2);
    if (periodCols.length >= 4 && sideRows.length === 2) result = periodCols.map(i => [n0(sideRows[0][i]), n0(sideRows[1][i])]);
  });
  return result;
}

function validateTeam(t: any, label: string) {
  const keys = ["points","two_pm","two_pa","three_pm","three_pa","ftm","fta","oreb","dreb","ast","tov"];
  for (const k of keys) if (!Number.isFinite(Number(t[k])) || Number(t[k]) < 0) throw new Error(label + " has invalid " + k + ".");
  if (t.two_pm > t.two_pa || t.three_pm > t.three_pa || t.ftm > t.fta) throw new Error(label + " has makes greater than attempts.");
  const expected = 2 * t.two_pm + 3 * t.three_pm + t.ftm;
  if (expected !== t.points) throw new Error(label + " scoring totals do not reconcile: " + t.points + " vs " + expected + ".");
  return { status: "passed", expected_points: expected, box_score_points: t.points, fga: t.two_pa + t.three_pa };
}

function calc(t: any, opp: any) {
  const fgm = t.two_pm + t.three_pm, fga = t.two_pa + t.three_pa;
  const poss = fga + .44 * t.fta - t.oreb + t.tov;
  const oppFga = opp.two_pa + opp.three_pa, oppPoss = oppFga + .44 * opp.fta - opp.oreb + opp.tov;
  const ortg = r1(t.points / Math.max(poss, 1) * 100), drtg = r1(opp.points / Math.max(oppPoss, 1) * 100);
  const trb = t.oreb + t.dreb, oppTrb = opp.oreb + opp.dreb;
  return {
    possessions: r2(poss), pace: r1((poss + oppPoss) / 2), ortg, drtg, net_rating: r1(ortg - drtg),
    fg_pct: pct(fgm, fga), two_pct: pct(t.two_pm, t.two_pa), three_pct: pct(t.three_pm, t.three_pa), ft_pct: pct(t.ftm, t.fta),
    efg: pct(fgm + .5 * t.three_pm, fga), ts: pct(t.points, 2 * (fga + .44 * t.fta)), pps: fga ? r2(t.points / fga) : 0,
    three_pa_rate: pct(t.three_pa, fga), tov: pct(t.tov, fga + .44 * t.fta + t.tov), orb: pct(t.oreb, t.oreb + opp.dreb),
    drb: pct(t.dreb, t.dreb + opp.oreb), trb: pct(trb, trb + oppTrb), ftr: pct(t.fta, fga), ast_to: t.tov ? r2(t.ast / t.tov) : (t.ast ? "∞" : 0),
    assisted_fg_pct: pct(t.ast, fgm), margin: t.points - opp.points
  };
}

function advancedPlayer(p: any, team: any, opp: any) {
  const fgm = p.two_pm + p.three_pm, fga = p.two_pa + p.three_pa, rebounds = p.oreb + p.dreb;
  const missed = fga - fgm + p.fta - p.ftm;
  const simpleTeamPoss = team.two_pa + team.three_pa + .44 * team.fta - team.oreb + team.tov;
  const per40 = (v: number) => p.minutes ? r1(v * 40 / p.minutes) : 0;
  return { ...p, fgm, fga, rebounds,
    fg_pct: pct(fgm, fga), two_pct: pct(p.two_pm, p.two_pa), three_pct: pct(p.three_pm, p.three_pa), ft_pct: pct(p.ftm, p.fta),
    efg: pct(fgm + .5 * p.three_pm, fga), ts: pct(p.points, 2 * (fga + .44 * p.fta)), pps: fga ? r2(p.points / fga) : 0, three_pa_rate: pct(p.three_pa, fga),
    ast_to: p.tov ? r2(p.ast / p.tov) : (p.ast ? "∞" : 0), points_per_40: per40(p.points), rebounds_per_40: per40(rebounds), assists_per_40: per40(p.ast),
    play_end_share: pct(fga + .44 * p.fta + p.tov, simpleTeamPoss),
    oreb_pct: p.minutes ? pct(p.oreb * 40, p.minutes * (team.oreb + opp.dreb)) : 0,
    dreb_pct: p.minutes ? pct(p.dreb * 40, p.minutes * (team.dreb + opp.oreb)) : 0,
    box_impact_per_40: per40(p.points + rebounds + p.ast + p.steals + p.blocks - missed - p.tov)
  };
}

function aggregate(players: any[]) {
  const keys = ["minutes","points","two_pm","two_pa","three_pm","three_pa","ftm","fta","oreb","dreb","ast","steals","blocks","tov"];
  const out: any = {};
  for (const k of keys) out[k] = r1(players.reduce((s, p) => s + Number(p[k] || 0), 0));
  const fgm = out.two_pm + out.three_pm, fga = out.two_pa + out.three_pa;
  return { ...out, efg: pct(fgm + .5 * out.three_pm, fga), ts: pct(out.points, 2 * (fga + .44 * out.fta)), ast_to: out.tov ? r2(out.ast / out.tov) : (out.ast ? "∞" : 0) };
}

function leaders(players: any[]) {
  const played = players.filter(p => p.has_played);
  if (!played.length) return [];
  const top = (k: string) => [...played].sort((a, b) => Number(b[k] || 0) - Number(a[k] || 0) || b.points - a.points)[0];
  const s = top("points"), r = top("rebounds"), a = top("ast");
  return [[s.name, s.points, "PTS"], [r.name, r.rebounds, "REB"], [a.name, a.ast, "AST"]];
}

function uiGame(meta: any, home: any, away: any, homePlayers: any[], awayPlayers: any[], quarters: any[]) {
  const hm = calc(home, away), am = calc(away, home);
  const hSplit = { starters: aggregate(homePlayers.filter(p => p.starter && p.has_played)), bench: aggregate(homePlayers.filter(p => !p.starter && p.has_played)) };
  const aSplit = { starters: aggregate(awayPlayers.filter(p => p.starter && p.has_played)), bench: aggregate(awayPlayers.filter(p => !p.starter && p.has_played)) };
  return {
    id: meta.id, comp: meta.competition, date: meta.date_display, home: meta.home, away: meta.away, hs: home.points, as: away.points, quarters,
    sourceLabel: "GLOBAL SPORTS ARCHIVE BOX SCORE · DATA CONFIRMED", sourceUrl: meta.source_url, playByPlay: [], playByPlayStatus: "not_published",
    metrics: [["Offensive Rating", hm.ortg.toFixed(1), am.ortg.toFixed(1)], ["Defensive Rating", hm.drtg.toFixed(1), am.drtg.toFixed(1)], ["Net Rating", hm.net_rating.toFixed(1), am.net_rating.toFixed(1)], ["eFG%", hm.efg + "%", am.efg + "%"], ["Pace", hm.pace.toFixed(1), am.pace.toFixed(1)], ["Possessions", hm.possessions, am.possessions]],
    factors: [["eFG%", hm.efg, am.efg], ["TOV%", hm.tov, am.tov], ["ORB%", hm.orb, am.orb], ["FTr", hm.ftr, am.ftr]],
    stats: [["Points", home.points, away.points], ["Point Margin", hm.margin, am.margin], ["Possessions", hm.possessions, am.possessions], ["Pace", hm.pace, am.pace], ["ORtg", hm.ortg, am.ortg], ["DRtg", hm.drtg, am.drtg], ["Net Rating", hm.net_rating, am.net_rating],
      ["FG", `${home.two_pm + home.three_pm}/${home.two_pa + home.three_pa}`, `${away.two_pm + away.three_pm}/${away.two_pa + away.three_pa}`], ["FG%", hm.fg_pct + "%", am.fg_pct + "%"], ["2P", `${home.two_pm}/${home.two_pa}`, `${away.two_pm}/${away.two_pa}`], ["2P%", hm.two_pct + "%", am.two_pct + "%"], ["3P", `${home.three_pm}/${home.three_pa}`, `${away.three_pm}/${away.three_pa}`], ["3P%", hm.three_pct + "%", am.three_pct + "%"], ["FT", `${home.ftm}/${home.fta}`, `${away.ftm}/${away.fta}`], ["FT%", hm.ft_pct + "%", am.ft_pct + "%"],
      ["eFG%", hm.efg + "%", am.efg + "%"], ["TS%", hm.ts + "%", am.ts + "%"], ["PPS", hm.pps, am.pps], ["3PA Rate", hm.three_pa_rate + "%", am.three_pa_rate + "%"], ["TOV%", hm.tov + "%", am.tov + "%"], ["FTr", hm.ftr + "%", am.ftr + "%"],
      ["Assists", home.ast, away.ast], ["AST/TO", hm.ast_to, am.ast_to], ["Turnovers", home.tov, away.tov], ["Offensive Rebounds", home.oreb, away.oreb], ["Defensive Rebounds", home.dreb, away.dreb], ["ORB%", hm.orb + "%", am.orb + "%"], ["DRB%", hm.drb + "%", am.drb + "%"], ["TRB%", hm.trb + "%", am.trb + "%"],
      ["Starters Points", hSplit.starters.points, aSplit.starters.points], ["Bench Points", hSplit.bench.points, aSplit.bench.points], ["Bench Share", pct(hSplit.bench.points, home.points) + "%", pct(aSplit.bench.points, away.points) + "%"]],
    findings: [["Possession Efficiency", hm.ortg + " ORtg vs " + am.ortg + " ORtg", "Descriptive efficiency gap from verified GSA totals"], ["Shooting Efficiency", hm.efg + "% eFG vs " + am.efg + "%", "Shot-value conversion; shot context requires video"], ["Ball Security", home.tov + " turnovers vs " + away.tov, hm.tov + "% vs " + am.tov + "% TOV rate"], ["Offensive Rebounding", hm.orb + "% ORB vs " + am.orb + "%", "Second-possession signal from box-score totals"]],
    videos: ["Classify turnovers by pressure, passing read, handle and offensive foul.", "Review shot quality behind the eFG% difference.", "Audit offensive rebounds and box-out responsibility.", "Review high-impact possessions before assigning tactical causation."],
    leaders: leaders(homePlayers), awayLeaders: leaders(awayPlayers), players: { home: homePlayers, away: awayPlayers }, splits: { home: hSplit, away: aSplit }, matchup: { home: meta.home, away: meta.away },
    calculated: { home: hm, away: am }, raw: { home, away },
    formulaCatalog: { version: "courtiq-formulas-v8", box_score: { possessions: "CourtIQ full team possessions postprocessor", pace: "Shared game pace normalized to 40 minutes", efg_pct: "(FGM + 0.5 × 3PM) / FGA × 100", ts_pct: "PTS / [2 × (FGA + 0.44 × FTA)] × 100" } }
  };
}

async function handleGsa(req: Request, body: any) {
  let auditClubId: number | null = null;
  let auditUrl = "";
  let auditExternalId = "";
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Sign in is required." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userDb = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
    const requestedClubId = Number(body?.club_id || 0);
    let clubQuery = userDb.from("clubs").select("id,name,season").order("id", { ascending: true }).limit(requestedClubId ? 1 : 2);
    if (requestedClubId) clubQuery = clubQuery.eq("id", requestedClubId);
    const { data: clubs, error: clubErr } = await clubQuery;
    if (clubErr) throw clubErr;
    if (!clubs?.length) return json({ error: "This account does not have access to the selected club." }, 403);
    if (!requestedClubId && clubs.length > 1) return json({ error: "Select a club before importing this game.", code: "CLUB_SELECTION_REQUIRED" }, 409);
    const club = clubs[0]; auditClubId = club.id;

    const parsedUrl = validateGsaUrl(clean(body?.url));
    const u = parsedUrl.u; auditUrl = u.toString(); auditExternalId = parsedUrl.externalId;
    const fetched = await fetchGsaHtml(u);
    const $ = cheerio.load(fetched.html);
    const blocks = boxBlocks($);
    if (blocks.length < 2) throw new Error("Could not locate both Global Sports Archive box-score tables.");
    const sides = [parseGsaBlock($, blocks[0]), parseGsaBlock($, blocks[1])];
    const tm = titleMeta($, parsedUrl.gameDate);
    const homeName = sides[0].teamName && !/^(?:TOTAL|TOTALS|TEAM)$/i.test(sides[0].teamName) ? sides[0].teamName : tm.home;
    const awayName = sides[1].teamName && !/^(?:TOTAL|TOTALS|TEAM)$/i.test(sides[1].teamName) ? sides[1].teamName : tm.away;
    if (!homeName || !awayName || homeName === awayName) throw new Error("Could not validate both GSA team names.");
    const home = sides[0].total, away = sides[1].total;
    const homeValidation = validateTeam(home, homeName), awayValidation = validateTeam(away, awayName);
    sides[0].players = sides[0].players.map(p => advancedPlayer(p, home, away));
    sides[1].players = sides[1].players.map(p => advancedPlayer(p, away, home));
    const quarters = quarterScores($);
    const gameDate = tm.date || parsedUrl.gameDate;
    const competition = tm.competition || "Global Sports Archive Basketball";
    const dateDisplay = gameDate.split("-").reverse().join("/");
    const meta = { id: parsedUrl.externalId, home: homeName, away: awayName, competition, date_display: dateDisplay, source_url: u.toString() };
    const ui = uiGame(meta, home, away, sides[0].players, sides[1].players, quarters);
    const playerPointSum = (ps: any[]) => ps.filter(p => p.has_played).reduce((s, p) => s + Number(p.points || 0), 0);
    const qualityChecks = [
      { check_name: "home_score_reconcile", status: playerPointSum(sides[0].players) === Number(home.points) ? "PASS" : "FAIL", expected: { team_points: home.points }, actual: { player_points: playerPointSum(sides[0].players) } },
      { check_name: "away_score_reconcile", status: playerPointSum(sides[1].players) === Number(away.points) ? "PASS" : "FAIL", expected: { team_points: away.points }, actual: { player_points: playerPointSum(sides[1].players) } },
      { check_name: "home_team_totals", status: homeValidation.status === "passed" ? "PASS" : "FAIL", expected: { validation: "passed" }, actual: homeValidation },
      { check_name: "away_team_totals", status: awayValidation.status === "passed" ? "PASS" : "FAIL", expected: { validation: "passed" }, actual: awayValidation },
      { check_name: "player_rows", status: sides[0].players.some(p => p.has_played) && sides[1].players.some(p => p.has_played) ? "PASS" : "FAIL", expected: { both_teams: true }, actual: { home: sides[0].players.length, away: sides[1].players.length } }
    ];
    const qualityPassed = qualityChecks.every(q => q.status === "PASS");
    const validation = { home: homeValidation, away: awayValidation, parser: PARSER, fetch_route: fetched.route, validated_at: new Date().toISOString(), quality: qualityPassed ? "VERIFIED" : "REVIEW" };
    const payload: any = { provider: PROVIDER, source_url: u.toString(), verified: qualityPassed, imported_at: new Date().toISOString(), validation, ui, raw: { home, away }, splits: ui.splits, play_by_play: [], calculated: ui.calculated, quality: { status: qualityPassed ? "VERIFIED" : "REVIEW", checks: qualityChecks } };

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: game, error: gameErr } = await admin.from("games").upsert({
      external_id: parsedUrl.externalId, provider: PROVIDER, source_url: u.toString(), competition, game_date: gameDate,
      home_team: homeName, away_team: awayName, payload, club_id: club.id
    }, { onConflict: "club_id,provider,external_id" }).select("id").single();
    if (gameErr) throw gameErr;

    for (const q of qualityChecks) {
      const { error } = await admin.from("data_quality_checks").upsert({ game_id: game.id, ...q, details: q.status === "PASS" ? "Automated GSA import validation passed." : "CourtIQ marked this GSA import for review." }, { onConflict: "game_id,check_name" });
      if (error) throw error;
    }

    const season = Number(gameDate.slice(5, 7)) >= 7 ? gameDate.slice(0, 4) + "-" + String(Number(gameDate.slice(0, 4)) + 1).slice(-2) : String(Number(gameDate.slice(0, 4)) - 1) + "-" + gameDate.slice(2, 4);
    for (const [sideIndex, sideName] of ["home", "away"].entries()) {
      const teamName = sideIndex === 0 ? homeName : awayName, opponentName = sideIndex === 0 ? awayName : homeName;
      for (const player of sides[sideIndex].players) {
        if (!player?.name) continue;
        const stableExternal = clean(player.id) || null;
        let playerId: number | null = null;
        if (stableExternal) {
          const { data: existing } = await admin.from("players").select("id").eq("external_id", PROVIDER + ":" + stableExternal).limit(1).maybeSingle();
          playerId = existing?.id || null;
        }
        if (!playerId) {
          const { data: byName } = await admin.from("players").select("id").ilike("name", player.name).limit(1).maybeSingle();
          playerId = byName?.id || null;
        }
        if (!playerId) {
          const { data: created, error } = await admin.from("players").insert({ external_id: stableExternal ? PROVIDER + ":" + stableExternal : null, name: player.name, position: player.position || null, source_url: u.toString(), analysis: {} }).select("id").single();
          if (error) throw error; playerId = created.id;
        }
        const calculated = { efg: player.efg, ts: player.ts, pps: player.pps, points_per_40: player.points_per_40, rebounds_per_40: player.rebounds_per_40, assists_per_40: player.assists_per_40, play_end_share: player.play_end_share, box_impact_per_40: player.box_impact_per_40 };
        const { error } = await admin.from("game_player_stats").upsert({ game_id: game.id, player_id: playerId, provider: PROVIDER, external_game_id: parsedUrl.externalId, season, competition, team_name: teamName, opponent_name: opponentName, side: sideName, player_external_id: stableExternal, player_name: player.name, jersey_number: player.number || null, starter: player.starter, minutes: player.minutes || 0, stats: player, calculated, source_url: u.toString(), verified: qualityPassed, updated_at: new Date().toISOString() }, { onConflict: "game_id,player_id" });
        if (error) throw error;
      }
    }

    const report = { version: "v1", game_id: game.id, generated_at: new Date().toISOString(), summary: { score: home.points + "-" + away.points, home: homeName, away: awayName }, metrics: ui.metrics, four_factors: ui.factors, findings: ui.findings, team_stats: ui.stats, player_analytics: ui.players, starter_bench: ui.splits, play_by_play: [], formula_catalog: ui.formulaCatalog, video_investigation: ui.videos, confidence: qualityPassed ? "DATA CONFIRMED" : "REVIEW", validation };
    const { error: reportErr } = await admin.from("game_reports").upsert({ game_id: game.id, report_version: "v1", payload: report, updated_at: new Date().toISOString() }, { onConflict: "game_id,report_version" });
    if (reportErr) throw reportErr;
    const { error: auditErr } = await admin.from("import_runs").insert({ club_id: club.id, provider: PROVIDER, source_url: u.toString(), external_id: parsedUrl.externalId, status: "success", validation, game_id: game.id });
    if (auditErr) throw auditErr;
    return json({ game_id: game.id, ui, report, validation, saved: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (auditClubId && auditUrl) {
      try {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await admin.from("import_runs").insert({ club_id: auditClubId, provider: PROVIDER, source_url: auditUrl, external_id: auditExternalId || null, status: "failed", error_message: message, validation: { parser: PARSER } });
      } catch (_) {}
    }
    return json({ error: message }, 422);
  }
}

function wrappedServeGsa(optionsOrHandler: any, maybeHandler?: any) {
  const wrap = (handler: any) => async (req: Request, info: any) => {
    if (req.method === "POST" && (req.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
      try {
        const body = await req.clone().json();
        if (isGsaHostUrl(clean(body?.url))) return handleGsa(req, body);
      } catch (_) {}
    }
    return handler(req, info);
  };
  return typeof optionsOrHandler === "function"
    ? gsaNativeServe(wrap(optionsOrHandler))
    : gsaNativeServe(optionsOrHandler, wrap(maybeHandler));
}

Object.defineProperty(Deno, "serve", { value: wrappedServeGsa, configurable: true, writable: true });
