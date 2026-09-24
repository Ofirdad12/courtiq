# CourtIQ Women's Basketball Ingestion

CourtIQ supports two official women's basketball ingestion routes:

1. **Israeli Women's Premier League / Winner Cup** — official IBBA/SWISH CSV or JSON team boxscore export.
2. **EuroCup Women** — an official FIBA game-page URL after the final box score is published, or a LiveStats/GDAP JSON export.

Both normalize into the same CourtIQ schema and use the same validation and deterministic calculation engine.

## Israel women

```bash
python -m data_engine.ingest \
  --source israel-women \
  --input path/to/boxscore.csv \
  --competition "Winner Cup Women" \
  --season 2026-27 \
  --game-id TEST-001 \
  --date 2026-09-23 \
  --out data/israel_test_001.json
```

Required team totals: PTS, FGM/FGA (or 2PM/2PA + 3PM/3PA), 3PM/3PA, FTM/FTA, OREB, DREB, TOV.

## EuroCup Women

### CourtIQ website

Open **Import Official Game** and paste an official game URL such as:

```text
https://www.fiba.basketball/en/events/eurocup-women-26-27/games/135266-ASHD-DSK
```

Before tip-off, CourtIQ reports that the official box score is not published yet. After FIBA publishes the final Boxscore, the same URL imports:

- Team Stats and deterministic advanced metrics
- Player Stats, including eFG%, TS%, per-40 production and box impact
- starters/bench split
- Play-by-Play
- points off turnovers, paint, second-chance and fast-break points when published
- a saved game report and verified single-game samples for matched Ashdod roster players

### Official JSON export

```bash
python -m data_engine.ingest \
  --source fiba-women \
  --input path/to/fiba_game.json \
  --competition "EuroCup Women" \
  --season 2026-27 \
  --game-id FIBA-GAME-ID \
  --out data/eurocup_women_game.json
```

The FIBA adapter recognizes the documented LiveStats/GDAP `s*` team-stat fields, including `sPoints`, `sFieldGoalsMade`, `sThreePointersMade`, `sReboundsOffensive`, and `sTurnovers`.

## Data-access boundary

IBBA says its SWISH rollout provides online score, play-by-play, boxscore and statistics, but CourtIQ does not rely on an undocumented private endpoint.

FIBA GDAP provides official API data but requires authenticated access to subscribed product APIs. CourtIQ does not call a private or credentialed endpoint without authorization. The URL importer reads the official data embedded in the public FIBA game page after publication; the JSON adapter remains available for authorized exports.

Once authorized API credentials are available, only the fetch layer changes. The normalized CourtIQ schema, validation, metrics, dashboard and AI layer stay the same.


## EuroLeague

CourtIQ also supports EuroLeague ingestion through the existing EuroLeague data engine.
Use competition code `E` with season start year and official game code. The pipeline fetches the public EuroLeague box score, validates team totals, and calculates deterministic metrics before saving output.

Games stored with provider `EUROLEAGUE` or a competition containing `EuroLeague` are displayed under **Games → EuroLeague · Euroleague Basketball**.
