# CourtIQ Vision Engine v235

CourtIQ now has a real raw-MP4 computer-vision path in front of the v234 tactical engine.

## Pipeline

`authorized MP4 -> player/ball detection -> persistent tracking -> court calibration -> team inference -> 94x50 normalization -> possessions -> tactical engine -> confidence/review`

The worker still supports deterministic replay JSON for QA, but it no longer stops at the adapter boundary when the optional raw-video adapter is selected.

## What v235 does from raw MP4

The optional Ultralytics adapter:
- detects `person` and `sports ball` classes (or equivalent classes from a custom basketball checkpoint);
- runs persistent multi-object tracking so player boxes carry stable `track_id` values;
- filters bench/crowd detections with an optional `play_area_polygon`;
- keeps a temporally stable ball candidate instead of selecting each frame independently;
- samples jersey torso appearance in LAB color space;
- infers two player-team clusters while leaving likely officials/unreliable tracks unassigned;
- computes an image-pixel -> canonical 94x50-foot homography from explicit court landmarks;
- writes `tracking.json` as evidence/debug output;
- passes the tracking payload directly into CourtIQ's possession and tactical pipeline.

## Court calibration

v235 intentionally starts with explicit calibration rather than pretending broadcast court mapping is solved for every camera angle. Provide at least four matched points. `court_points` use CourtIQ's canonical 94x50-foot coordinates.

Example `calibration.json` for a fixed full-court camera:

```json
{
  "image_points": [[210, 120], [1715, 118], [1840, 975], [80, 980]],
  "court_points": [[0, 0], [94, 0], [94, 50], [0, 50]],
  "play_area_polygon": [[190, 105], [1735, 105], [1860, 995], [60, 995]]
}
```

The matched image points do not have to be the four court corners; any four or more reliable landmarks with known 94x50 coordinates can be used. RANSAC is used when more correspondences are supplied.

## Install the optional CV runtime

```bash
pip install -r vision_worker/requirements-cv.txt
```

`ffmpeg` and `ffprobe` are system dependencies.

## Run real MP4 analysis

```bash
python vision_worker/worker.py game.mp4 \
  --out output \
  --adapter ultralytics \
  --court-calibration calibration.json \
  --model yolo26n.pt \
  --tracker bytetrack.yaml \
  --imgsz 1280
```

For a trained CourtIQ basketball checkpoint, replace `--model yolo26n.pt` with the model path. The adapter contract stays the same.

The worker writes:
- `output/tracking.json` — detector/tracker + homography evidence;
- `output/result.json` — possessions, accepted/review tactical events and capabilities.

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

v235 is a real first CV layer, not the final vision model. Generic COCO person/sports-ball weights are a baseline and should be replaced/evaluated against basketball-specific data before commercial accuracy claims. Fixed-camera or long stable-camera possessions are the current calibration sweet spot. Multi-camera broadcast cuts still need shot-boundary detection and per-shot/recovered homography. Jersey-number OCR and scoreboard/game-clock OCR are not enabled yet.

YouTube URLs can remain a playback/evidence source in the product, but pixel analysis requires an authorized media asset/byte stream available to the worker; an embedded YouTube player is not treated as a CV input.

## Commercial licensing note

Ultralytics is isolated behind the adapter boundary on purpose. Review the model/package license before a paid production deployment. CourtIQ's `VideoDetector` contract allows the raw detector/tracker implementation to be replaced without changing the tactical engine or storage/UI contract.
