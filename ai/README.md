# CourtIQ Video Intelligence v233

CourtIQ separates **media ingestion**, **computer vision**, **tactical inference**, and **human verification** so a missing detector never becomes a fake basketball conclusion.

## Product flow

1. Link a YouTube game for playback/timestamps, or upload MP4/WebM/MOV to the private `courtiq-game-video` bucket.
2. CourtIQ creates a tenant-scoped `game_videos` asset and `video_analysis_jobs` record.
3. A raw-video detector/tracker worker reads the stored media and emits ordered frames with stable player track IDs, player boxes, a ball box, team appearance samples and a 3x3 court homography.
4. `team_assignment.py` confidence-gates team labels.
5. `track_normalizer.py` projects tracks into court coordinates and estimates ball control.
6. `possession_segmenter.py` requires stable team control before splitting possessions.
7. `pnr_detector.py` emits PnR/coverage candidates only when screen geometry is plausible.
8. `quality_gate.py` separates `accepted`, `review`, and `rejected` events.
9. `job_contract.py` maps accepted/review results into `tactical_events` and job completion metadata.

## YouTube rule

A YouTube embed is useful for playback, evidence links and timestamps, but it does not expose raw frames to CourtIQ's browser app. Therefore a linked YouTube URL is stored as `awaiting_media`; CV processing starts only when the worker has legitimate access to media bytes (for example an uploaded MP4 supplied by the club). CourtIQ does not bypass YouTube access controls or pretend an embed has been computer-vision analyzed.

## Detector contract

The raw detector is intentionally replaceable. `video_detector.py` validates the minimum output contract:

```json
{
  "fps": 25,
  "homography": [[1,0,0],[0,1,0],[0,0,1]],
  "frames": [
    {
      "frame": 0,
      "players": [
        {"track_id":"17","bbox":[100,100,150,240],"confidence":0.94,"team":"HOME"}
      ],
      "ball": {"bbox":[180,130,195,145]}
    }
  ]
}
```

A production GPU service can replace the detector implementation without changing the possession/PnR/quality/persistence layers.

## Evidence discipline

- No plausible screen → no PnR event.
- Low action/coverage confidence → `needs_review`, not an accepted fact.
- Unknown player identity stays a track ID.
- Box score/PBP may validate timing or outcome, but they do not prove coverage or tactical causation.
- `human_corrected` is preserved separately from raw `ai` output.
