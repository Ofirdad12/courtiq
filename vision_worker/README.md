# CourtIQ Vision Worker v234

This worker is the compute layer behind CourtIQ video auto-tagging.

## End-to-end contract
1. Accept an MP4 / authorized media asset.
2. Probe and prepare the media with ffmpeg.
3. A detector adapter produces stable player IDs, ball observations and court homography.
4. CourtIQ normalizes tracks to 94x50 court coordinates.
5. Possessions are segmented.
6. The v234 tactical engine emits multiple basketball layers per possession.
7. Confidence gates route strong detections to AI-accepted and uncertain detections to analyst review.

## Tactical engine scope
The taxonomy covers restart/phase, ball screens, handoffs, cuts, off-ball screens, isolation, post play, transition, BLOB/SLOB, man/zone structures, pressure/traps, PnR coverages and help/rotation concepts. The taxonomy is deliberately larger than the current automatic detector set so new classifiers can plug in without changing the storage/UI contract.

Examples include:
- BLOB / SLOB
- Transition / early offense / halfcourt
- PnR + Drop / Switch / ICE / Hedge / Trap / Under
- Handoff, Cut, Off-ball screen, Isolation, Post-up
- Man, 2-3, 3-2, 1-3-1 zone
- Full-court / half-court pressure and traps
- Help-and-recover / rotation evidence
- Reviewable future labels such as Spain PnR, Hammer, Zoom, Chicago, Scram switch, Peel switch and Top-lock

## Detector boundary
The tactical engine cannot truthfully infer these concepts from raw pixels until a real player + ball detector/tracker and court mapper are configured. When no adapter exists the worker returns `awaiting_detector`; it does **not** fabricate tactical labels.

For deterministic end-to-end QA, pass a validated tracking payload:

```bash
python vision_worker/worker.py game.mp4 --out output --detection-json tracking.json
```

For media preparation only:

```bash
python vision_worker/worker.py game.mp4 --out output
```

A production runner should claim a queued `video_analysis_jobs` row, download its authorized video asset, run the selected detector adapter, persist accepted + review tactical events, and update the job state.
