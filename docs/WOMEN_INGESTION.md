# CourtIQ Women's Basketball Ingestion

CourtIQ now has two additional ingestion adapters:

1. **Israeli Women's Premier League / Winner Cup** — official IBBA/SWISH CSV or JSON team boxscore export.
2. **EuroCup Women** — official FIBA LiveStats/GDAP JSON export.

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

## Why file ingestion first?

IBBA says its SWISH rollout provides online score, play-by-play, boxscore and statistics, but CourtIQ does not rely on an undocumented private endpoint.

FIBA GDAP provides official API data but requires authenticated access to subscribed product APIs. Until CourtIQ has those credentials/rights, the adapter consumes an official export rather than scraping.

Once authorized API credentials are available, only the fetch layer changes. The normalized CourtIQ schema, validation, metrics, dashboard and AI layer stay the same.
