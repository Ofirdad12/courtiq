# CourtIQ Vision Worker

This worker is the compute layer behind CourtIQ video auto-tagging.

## v1 contract
1. Accept an MP4.
2. Probe duration with ffprobe.
3. Extract frames with ffmpeg.
4. Produce `result.json` using the CourtIQ CV schema.
5. Keep unsupported tactical detections in review state rather than fabricating labels.

## Next model adapters
- player + ball detector
- multi-object tracker
- jersey-number OCR
- scoreboard/game-clock OCR
- possession segmentation
- PnR action classifier
- defensive coverage classifier (Drop, Switch, Hedge, Blitz, ICE, Under, Zone)

Run:
```
python worker.py game.mp4 --out output
```

A production runner should claim a queued `video_analysis_jobs` row, download its authorized video asset, process it, write detections/tactical events, and update the job to `review` or `completed`.
