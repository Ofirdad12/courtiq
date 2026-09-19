# CourtIQ — 48 Hour Pilot Sprint

Start: 2026-09-19
Goal: turn the public prototype into a pilot-ready club workflow for women's basketball.

## Hour 0–1 — DONE / in progress
- [x] Israel Women's League ingestion adapter
- [x] EuroCup Women / FIBA ingestion adapter
- [x] Unified CourtIQ game schema
- [x] Validation before analytics
- [x] Browser `+ IMPORT GAME` pilot flow
- [x] CSV -> deterministic Four Factors -> dashboard
- [x] Frontend asset cache busting

## Hours 1–6
- [ ] Replace hard-coded game rendering with a shared game JSON loader
- [ ] Persist imported pilot games in browser storage for demo continuity
- [ ] Add explicit data-confidence labels to imported games
- [ ] Add download/export of normalized CourtIQ JSON
- [ ] Add pilot club workspace shell (club name, season, games)

## Hours 6–18
- [ ] Add player boxscore ingestion
- [ ] Add TS%, AST/TO and ORtg/DRtg where source fields support them
- [ ] Add quarter scoring when supplied
- [ ] Add source/audit panel showing provider and validation status
- [ ] Add robust CSV validation/error messages

## Hours 18–30
- [ ] Add PBP ingestion schema
- [ ] Derive transition / points-off-turnover fields only when supported
- [ ] Add evidence hierarchy: DATA / PBP / VIDEO REQUIRED
- [ ] Generate Video Investigation questions from verified findings

## Hours 30–42
- [ ] Create Maccabi Bnot Ashdod pilot workspace
- [ ] Create Israeli Women's Winner Cup test workspace
- [ ] Test with multiple synthetic/known boxscores
- [ ] Mobile QA

## Hours 42–48
- [ ] Freeze Pilot Build
- [ ] Prepare coach-facing 3-minute onboarding
- [ ] Prepare import template
- [ ] Run pre-game readiness checklist for 23/9 test
- [ ] Document known limitations and no-invention rules

## Pilot-ready definition
A coach can open CourtIQ, import an official game export, receive verified metrics and findings, reopen the game, and understand what requires video verification — without editing source code.
