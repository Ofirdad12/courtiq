# CourtIQ Pilot Product Contract — 23/09/2026

## Primary user
Assistant coach / coaching staff, Maccabi Bnot Ashdod.

## Core promise
Paste an official basketball box-score URL. CourtIQ ingests the game, verifies the available statistics, calculates deterministic metrics, saves the game, and opens a coaching-oriented analysis.

## Golden path
1. Paste official Box Score URL.
2. CourtIQ identifies the provider (IBBA or FIBA).
3. Server-side fetcher downloads the source page/data.
4. Provider adapter normalizes teams, players, quarter scores and supported game statistics.
5. Validation blocks incomplete/impossible records.
6. Deterministic engine calculates possessions, ORtg, eFG%, TS%, TOV%, ORB%, FTr and AST/TO when fields are available.
7. Intelligence layer produces findings using only verified values.
8. Game is saved to the club workspace.
9. Staff can open the game later or add it to Team Comparison.

## Evidence contract
- DATA CONFIRMED: directly supplied or deterministically calculated from verified source fields.
- PBP SUPPORTED: supported by imported play-by-play.
- VIDEO SUPPORTED: supported by reviewed video.
- VIDEO VERIFICATION REQUIRED: tactical/causal question not established by box score/PBP.

CourtIQ never invents missing fields and never lets the LLM calculate statistics.

## Team Comparison
Staff selects:
- Team A
- Team B
- sample for each team (single game, selected games, or last N imported games)

CourtIQ compares only metrics available across the selected sample:
- Pace / estimated possessions
- ORtg / DRtg where opponent data is sufficient
- eFG%
- TOV%
- ORB%
- FTr
- TS%
- AST/TO
- quarter scoring
- player leaders / usage proxies where supported

Output:
- side-by-side metric table
- sample size and dates
- largest verified differences
- matchup questions
- video investigation list

No ranking or tactical causation is inferred from unsupported data.

## 23/09 acceptance test
A staff member who has not edited CourtIQ code can:
1. Open CourtIQ.
2. Paste a supported official box-score link.
3. Receive a validated game dashboard.
4. Reopen the saved game.
5. Import another game.
6. Compare two teams / samples.
7. See exactly which findings are confirmed and which require video.

## Source priority
1. IBBA match pages — Israeli women's basketball.
2. FIBA game pages / approved FIBA data path — EuroCup Women.
3. CSV/JSON upload remains a fallback, not the primary coach workflow.

## Architecture required
Static GitHub Pages is the frontend demo only. URL ingestion requires a server-side fetch/parse API plus persistent storage. Do not fake URL ingestion in the browser.

Target API:
- POST /api/import-url
- GET /api/games
- GET /api/games/{id}
- POST /api/compare

Target entities:
clubs, users, teams, games, team_game_stats, player_game_stats, source_records, findings.
