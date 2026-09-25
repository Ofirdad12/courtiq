# Coach preparation workflow

## 1. Official schedule coverage

Sign in with a club admin or analyst account. Open **Coach Prep → Source coverage** and import a CSV with these exact columns:

`date,competition,season,provider,home_team,away_team,source_url,status`

Use `YYYY-MM-DD` and one official HTTPS game URL per row. Status is `scheduled`, `final`, or `cancelled`. The schedule is supplied by staff; CourtIQ does not claim that a partial CSV covers an entire league. A final row without a matching saved URL is flagged as unmatched and can be imported from the same panel. Re-import an existing official URL to refresh its box score. Material source changes are recorded in `game_revisions`; a timestamp-only refresh is not recorded as a correction.

## 2. Coach sheet

Select the team, venue and prior opponent. The three cards show TOV%, eFG% and ORB% calculated from the imported games in that exact sample. Each card displays its own available game count and a question for the coaching staff. Player rows can be narrowed by minimum minutes and starter/bench role. Do not interpret the three cards as a tactical cause or a stable tendency from a small sample.

## 3. Video evidence

Add only video URLs your club has permission to use. Select a saved game and a card; enter clip start/end, a possession note, and mark whether it supports or contradicts the proposed observation. A blank counterexample list means no clip was annotated, not that exceptions do not exist. The link opens the external video at the selected timestamp where the player supports timestamp parameters.

Video clips are staff annotations. Box scores do not reveal PnR coverage, transition frequency, lineup combinations or on/off effects. These require a complete play-by-play/substitution feed or manually tagged possessions. Do not compute lineup ratings from the starter flag.

## 4. Review and source changes

Generated game reports are internal drafts until a club analyst/admin reviews the current version in Coach Prep. A new generated report timestamp requires a new review. The database keeps report review events, source-change snapshots, validation runs and game provenance separately. Approval confirms human review of a report version; it does not certify video claims without clips.

## Acceptance checks

- An unsigned visitor sees the sign-in gate rather than club evidence.
- A coach can read the club schedule and evidence but cannot add/modify them; admin/analyst can.
- A final listed URL that was never imported is shown as unmatched, not fabricated as a game.
- Re-importing a source with changed payload adds a revision; changing only `imported_at` does not.
- Each coach card gives sample size, source-based metric, supporting clips, counterexamples and an in-game observation task.
- Lineup metrics remain unavailable until lineup-level observations are provided.
