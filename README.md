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

## Next
Schedule/game discovery -> team metadata -> player stats -> play-by-play -> generated game JSON -> frontend ingestion -> AI Analyst.
