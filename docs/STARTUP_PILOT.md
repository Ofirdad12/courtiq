# CourtIQ Startup Pilot

## Product hypothesis
Basketball coaches do not need more dashboards. They need a faster path from official game data to a decision they can use in preparation, with clear evidence and uncertainty.

CourtIQ's pilot loop is therefore:

`Official game -> verified metrics -> 3 tendencies -> 3 decisions -> evidence check -> coach feedback`

## Initial customer profile
- Women's top-division basketball clubs
- Head coach / assistant coach / video coordinator / analyst
- Teams with official box score and/or play-by-play data but limited analytics capacity

## Pilot promise
After an official game is imported, CourtIQ should produce a short decision brief that a coach can understand in under two minutes and investigate further through PBP/video when tactical causation is not yet verified.

## What the pilot must validate
1. **Reliability** — official data imports correctly and deterministic calculations are trusted.
2. **Decision value** — the brief changes or sharpens a coaching question, not just describes the score.
3. **Repeat use** — the coach says they would use the workflow before the next game.
4. **Evidence depth** — when a claim requires tactical causation, the product clearly requests PBP/video verification.
5. **Workflow fit** — the output is short enough for staff preparation and specific enough to trigger video review.

## Core product KPIs
- Verified games imported
- Coach feedback sessions
- Average usefulness score (1-5)
- Percentage of sessions where the coach would use CourtIQ again
- Missing-evidence requests: PBP, lineup context, video clips, opponent splits
- Time from import to decision brief

## Interview prompt after every brief
Do not ask whether the dashboard looks good. Ask:

- What decision would you make differently after seeing this?
- Which statement do you not trust yet?
- What evidence would you need before showing this to the head coach?
- Would you use this before the next game?
- What is the one missing capability that would make this part of your weekly workflow?

## MVP scope
### Must work
- Official game import
- Deterministic team metrics
- Player and lineup context when available
- 3 verified tendencies
- 3 coach decisions
- Evidence status
- Coach feedback capture

### Not required for the first pilot
- Fully automated video tagging for every action
- Predictive win models
- Large public league database
- Complex AI chat features without traceable evidence

## Pilot success definition
The first pilot is successful when coaches repeatedly use the product for preparation and can point to specific decisions, video questions, or opponent tendencies that CourtIQ helped them reach faster.

The product should optimize for repeated coaching value before optimizing for feature count.