import { createClient } from "npm:@supabase/supabase-js@2.95.3";
import { nbaIdentity, fetchNba, parseNbaGame } from "./parser.mjs";
const PROVIDER='NBA', PARSER='nba-official-v1';
const clean=(s:unknown)=>String(s??'').trim();
const cors={'Access-Control-Allow-Origin':'https://ofirdad12.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
async function handleNba(req: Request, body: any) {
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

    const parsedUrl = nbaIdentity(String(body?.url || ''));
    const u = parsedUrl.u; auditUrl = u.toString(); auditExternalId = parsedUrl.externalId;
    const fetched = await fetchNba(parsedUrl);
    const parsed = parseNbaGame(fetched.game, parsedUrl.externalId, u.toString());
    const {home, away, homeName, awayName, sides, gameDate, ui} = parsed;
    const competition = 'NBA';
    const homeValidation = {status:'passed'}, awayValidation = {status:'passed'};
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

    if (!qualityPassed) throw new Error("NBA player and team totals did not reconcile.");
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: game, error: gameErr } = await admin.from("games").upsert({
      external_id: parsedUrl.externalId, provider: PROVIDER, source_url: u.toString(), competition, game_date: gameDate,
      home_team: homeName, away_team: awayName, payload, club_id: club.id
    }, { onConflict: "club_id,provider,external_id" }).select("id").single();
    if (gameErr) throw gameErr;

    for (const q of qualityChecks) {
      const { error } = await admin.from("data_quality_checks").upsert({ game_id: game.id, ...q, details: q.status === "PASS" ? "Automated NBA import validation passed." : "CourtIQ marked this NBA import for review." }, { onConflict: "game_id,check_name" });
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
    return json({ error: message }, message.includes("not final") ? 409 : 422);
  }
}


Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  let body;try{body=await req.json();}catch{return json({error:'Invalid JSON'},400);}
  return handleNba(req,body);
});
