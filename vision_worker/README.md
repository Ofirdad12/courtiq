# CourtIQ Vision Engine v236

CourtIQ's raw-MP4 vision path now has a reliability layer in front of the v234 tactical engine.

## Pipeline

`authorized MP4 -> player detection/tracking -> ball detection -> short-gap recovery -> court calibration -> team inference -> vision quality gate -> 94x50 normalization -> possessions -> tactical engine -> confidence/review`

The principle in v236 is simple: **tracking output is not automatically basketball truth**. CourtIQ measures whether the video has enough player, ball, handler, team and court evidence before tactical conclusions are treated as production-ready.

## What v236 adds

On top of v235 raw MP4 tracking:

- **TrackTrack is the default tracker** for the pinned Ultralytics runtime, while `--tracker` remains configurable.
- **Dedicated ball model support** via `--ball-model`, so a basketball-specific small-object checkpoint can replace the generic COCO `sports ball` baseline without changing the downstream contract.
- **Short-gap ball recovery**. Missing ball boxes may be linearly interpolated only when they are bounded by real observations and the gap is short. Every recovered observation is marked `source: "interpolated"` and carries reduced confidence.
- **Vision Quality Gate** with explainable metrics for player coverage, visible-player count, real and usable ball coverage, handler coverage, team-assignment coverage and a track-fragmentation proxy.
- **Court calibration QA** using reprojection error in feet. Four/five-point fits are flagged for review because they do not provide enough redundant landmarks to validate generalization.
- **Review-first status routing**. Weak tracking produces `vision_quality_review` or `vision_quality_insufficient` instead of a misleading `completed` result.

## Quality output

`result.json` and `tracking.json` now include `vision_quality`. Example shape:

```json
{
  "tier": "review",
  "score": 0.71,
  "review_required": true,
  "auto_publish": false,
  "warnings": ["low_real_ball_detection_coverage"],
  "metrics": {
    "player_detection_coverage": 0.98,
    "median_visible_players": 10,
    "ball_detection_coverage": 0.48,
    "ball_usable_coverage": 0.72,
    "handler_coverage": 0.66,
    "team_assignment_coverage": 0.91
  }
}
```

`score` is a completeness/reliability gate, **not** a claim that tactical labels are X% accurate.

## Court calibration

Provide at least four matched points. `court_points` use CourtIQ's canonical 94x50-foot coordinates.

```json
{
  "image_points": [[210, 120], [1715, 118], [1840, 975], [80, 980]],
  "court_points": [[0, 0], [94, 0], [94, 50], [0, 50]],
  "play_area_polygon": [[190, 105], [1735, 105], [1860, 995], [60, 995]]
}
```

The matched image points do not have to be the four court corners. Six or more well-distributed landmarks are preferred because v236 can then use redundant correspondences to make the reprojection quality signal more meaningful. RANSAC is used when solving the homography.

## Install the optional CV runtime

```bash
pip install -r vision_worker/requirements-cv.txt
```

`ffmpeg` and `ffprobe` are system dependencies.

## Run raw MP4 analysis

Generic baseline:

```bash
python vision_worker/worker.py game.mp4 \
  --out output \
  --adapter ultralytics \
  --court-calibration calibration.json \
  --model yolo26n.pt \
  --tracker tracktrack.yaml \
  --imgsz 1280
```

Production-oriented player + dedicated basketball-ball models:

```bash
python vision_worker/worker.py game.mp4 \
  --out output \
  --adapter ultralytics \
  --court-calibration calibration.json \
  --model models/courtiq-players.pt \
  --ball-model models/courtiq-ball.pt \
  --player-class-id 0 \
  --ball-class-id 0 \
  --tracker tracktrack.yaml \
  --max-ball-gap 4
```

A dedicated ball model is especially valuable because a basketball is small, fast, frequently occluded and visually very different from the generic sports-ball training distribution.

The worker writes:

- `output/tracking.json` — detector/tracker, recovered-ball provenance, homography, team and vision-quality evidence;
- `output/result.json` — vision quality, possessions, accepted/review tactical events and capabilities.

## Deterministic QA mode

```bash
python vision_worker/worker.py game.mp4 --out output --detection-json tracking.json
```

## Media-preparation-only mode

```bash
python vision_worker/worker.py game.mp4 --out output
```

Without a detector, the result remains `awaiting_detector`; CourtIQ does not fabricate tracks or tactical labels.

## Current truth boundary

v236 materially improves reliability, but it is still not a claim that CourtIQ can identify every concept perfectly from every raw broadcast. Generic person/sports-ball weights remain a baseline. Production accuracy still depends on basketball-specific validation data, camera quality and calibration.

Current unsolved/next layers include automatic recovery across broadcast camera cuts, jersey-number OCR, scoreboard/game-clock OCR, roster identity matching and benchmarked concept-level precision/recall on a labelled basketball validation set.

YouTube URLs can remain a playback/evidence source in the product, but pixel analysis requires an authorized media asset/byte stream available to the worker; an embedded YouTube player is not treated as a CV input.

## Commercial licensing note

Ultralytics is isolated behind the adapter boundary on purpose. Review the model/package license before a paid production deployment. CourtIQ's `VideoDetector` contract allows the raw detector/tracker implementation to be replaced without changing the tactical engine or storage/UI contract.
