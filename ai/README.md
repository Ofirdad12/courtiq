# CourtIQ AI Tactical Detection

This folder is the first production-oriented contract for automatic basketball tactic detection.

## Pipeline

1. A vision service produces normalized player/ball tracks for each possession.
2. `pnr_detector.py` detects screen interactions and classifies the defensive response.
3. The detector emits CourtIQ tactical events with video timestamps, confidence and `verification: "ai"`.
4. The existing Video Room consumes those events directly and links analytics to evidence.

The detector is deliberately model-agnostic. It does **not** claim to identify players from raw pixels yet; it consumes tracking output so detector/tracker models can be upgraded independently.

## Input

JSON with `fps`, optional `video_offset`, and `possessions`. Each possession contains frames. Each frame contains a ball position and players with stable track IDs, team side, x/y court coordinates and optional `has_ball`.

## Output

`events[]` containing `pick_and_roll`, coverage (`switch/drop/hedge_show/under/ice/trap`), timestamps, participants, confidence, evidence features and `verification: "ai"`.

Run:

```
python ai/pnr_detector.py input.json > events.json
```

This is a heuristic baseline and data contract, not a trained vision model. Validate it on labeled film before treating confidence as calibrated probability.
