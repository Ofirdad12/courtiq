# CourtIQ V0.2 Data Engine

This is the first real ingestion/calculation layer for CourtIQ.

## Pipeline

EuroLeague API -> raw Stats payload -> normalization -> validation -> deterministic basketball calculations -> CourtIQ JSON.

The LLM is intentionally **not** used to calculate basketball statistics.

## Install

```bash
pip install -r requirements.txt
```

## Run

```bash
python -m data_engine.pipeline --competition E --season 2025 --game 1
```

Write JSON for the frontend:

```bash
python -m data_engine.pipeline --competition E --season 2025 --game 1 --out data/game_E2025_1.json
```

Use `U` instead of `E` for EuroCup.

## V0.2 output

Each game returns:
- normalized raw team totals
- estimated possessions
- eFG%
- TOV%
- ORB%
- FTr
- validation status

## Important

The upstream package/API may change field names. `normalize.py` deliberately centralizes aliases and fails with the available API fields when a required value cannot be mapped. We do not silently invent missing data.

Next step: schedule/game discovery, metadata/team names, player stats, PBP ingestion, and frontend loading from generated game JSON.
