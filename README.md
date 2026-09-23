# CourtIQ V0.2

Basketball Intelligence Platform prototype.

## Current product
- Multi-game dashboard
- Verified basketball metrics
- Evidence-based findings
- Video investigation workflow
- Tactical PnR analysis
- Responsive web UI

## V0.2 Data Engine
CourtIQ now includes a Python ingestion/calculation pipeline under `data_engine/`.

Pipeline:

`EuroLeague API -> raw boxscore -> normalization -> validation -> deterministic metrics -> CourtIQ JSON`

Run:

```bash
pip install -r requirements.txt
python -m data_engine.pipeline --competition E --season 2025 --game 1
```

Write a frontend-ready JSON file:

```bash
python -m data_engine.pipeline --competition E --season 2025 --game 1 --out data/game_E2025_1.json
```

`E` = EuroLeague, `U` = EuroCup.

## Calculation policy
The LLM does not calculate statistics. Python computes and validates the metrics; AI interpretation is a later layer.

Current deterministic outputs:
- estimated possessions
- eFG%
- TOV%
- ORB%
- FTr

## Frontend
The existing GitHub Pages dashboard remains available from the repository root. The new data engine is intentionally separated from the live UI until ingestion is validated against real games.

## Women's basketball ingestion
CourtIQ V0.3 now supports normalized ingestion for:
- Israeli Women's Premier League / Winner Cup from official IBBA/SWISH CSV or JSON exports.
- EuroCup Women from official FIBA game URLs after the final box score is published, plus LiveStats/GDAP JSON exports.

Examples and commands: `docs/WOMEN_INGESTION.md`.

Both sources flow into the same verified CourtIQ schema, so the dashboard and AI layer do not need competition-specific calculations.

## Official URL flow
Import Official Game -> verified Team Stats -> Player Stats -> starters/bench -> Play-by-Play -> saved game report -> Player Intelligence samples.
