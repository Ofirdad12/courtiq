"""Ultralytics-based raw MP4 detector/tracker adapter for CourtIQ v235.

This optional runtime adapter keeps heavy CV imports lazy and emits CourtIQ's
validated detector contract: stable player IDs, ball observations, image-space
ball-handler evidence, appearance samples, team labels, and a court homography.
"""
from __future__ import annotations

import math
from collections import defaultdict

from ai.video_detector import VideoDetector, validate_detection
from vision_worker.court_calibration import compute_homography, load_calibration, point_in_polygon


def _center(box):
    x1, y1, x2, y2 = map(float, box)
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def _foot(box):
    x1, y1, x2, y2 = map(float, box)
    return ((x1 + x2) / 2.0, y2)


def _distance_point_to_box(point, box):
    x, y = point
    x1, y1, x2, y2 = map(float, box)
    dx = max(x1 - x, 0.0, x - x2)
    dy = max(y1 - y, 0.0, y - y2)
    return math.hypot(dx, dy)


def _choose_ball(candidates, previous, frame_shape):
    if not candidates:
        return None
    if previous is None:
        return max(candidates, key=lambda row: float(row.get("confidence", 0)))
    h, w = frame_shape[:2]
    diag = max(1.0, math.hypot(w, h))
    px, py = _center(previous["bbox"])

    def score(row):
        x, y = _center(row["bbox"])
        motion_penalty = math.hypot(x - px, y - py) / diag
        return float(row.get("confidence", 0)) - 0.35 * motion_penalty

    return max(candidates, key=score)


def _infer_handler(players, ball, previous_handler=None):
    """Infer control in image space, where airborne-ball perspective is valid.

    Homography is a floor-plane transform, so it should not be the primary
    source of ball-handler ownership for an airborne ball. Distances are
    normalized by player-box height to remain useful across camera zooms.
    """
    if not ball or not players:
        return None
    point = _center(ball["bbox"])
    ranked = []
    for player in players:
        box = player["bbox"]
        height = max(12.0, float(box[3]) - float(box[1]))
        normalized = _distance_point_to_box(point, box) / height
        ranked.append((normalized, str(player["track_id"])))
    ranked.sort()
    best_distance, best_id = ranked[0]
    if previous_handler is not None:
        previous = next((d for d, tid in ranked if tid == str(previous_handler)), None)
        if previous is not None and previous <= 0.70 and previous <= best_distance + 0.16:
            return str(previous_handler)
    return best_id if best_distance <= 0.55 else None


def _jersey_appearance(frame, box, cv2, np):
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = map(float, box)
    bw, bh = max(1.0, x2 - x1), max(1.0, y2 - y1)
    xa = max(0, min(w - 1, int(x1 + 0.22 * bw)))
    xb = max(xa + 1, min(w, int(x1 + 0.78 * bw)))
    ya = max(0, min(h - 1, int(y1 + 0.20 * bh)))
    yb = max(ya + 1, min(h, int(y1 + 0.58 * bh)))
    patch = frame[ya:yb, xa:xb]
    if patch.size == 0:
        return None
    lab = cv2.cvtColor(patch, cv2.COLOR_BGR2LAB).reshape(-1, 3)
    return [round(float(v), 2) for v in np.median(lab, axis=0)]


def _assign_team_clusters(frames, cv2, np, min_track_observations=4):
    samples = defaultdict(list)
    counts = defaultdict(int)
    for frame in frames:
        for player in frame.get("players", []):
            app = player.get("appearance")
            if app:
                tid = str(player["track_id"])
                samples[tid].append(app)
                counts[tid] += 1

    eligible = [tid for tid in samples if counts[tid] >= min_track_observations]
    if len(eligible) < 4:
        return {"status": "insufficient_tracks", "eligible_tracks": len(eligible)}

    track_vectors = {
        tid: np.median(np.asarray(samples[tid], dtype=np.float32), axis=0)
        for tid in eligible
    }
    k = 3 if len(eligible) >= 8 else 2
    rows = []
    for tid in eligible:
        repeats = min(20, counts[tid])
        for _ in range(repeats):
            rows.append(track_vectors[tid])
    data = np.asarray(rows, dtype=np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 0.2)
    _, labels, centers = cv2.kmeans(data, k, None, criteria, 8, cv2.KMEANS_PP_CENTERS)
    labels = labels.reshape(-1)

    cluster_weight = defaultdict(int)
    for label in labels:
        cluster_weight[int(label)] += 1
    selected = [
        idx
        for idx, _ in sorted(cluster_weight.items(), key=lambda kv: kv[1], reverse=True)[:2]
    ]
    selected = sorted(selected, key=lambda idx: tuple(float(x) for x in centers[idx]))
    names = {selected[0]: "team_a", selected[1]: "team_b"}

    track_team = {}
    for tid, vec in track_vectors.items():
        distances = [(float(np.linalg.norm(vec - centers[idx])), idx) for idx in selected]
        distances.sort()
        d1, c1 = distances[0]
        d2, _ = distances[1]
        margin = (d2 - d1) / max(d1 + d2, 1e-6)
        nearest_all = int(np.argmin([float(np.linalg.norm(vec - center)) for center in centers]))
        if nearest_all in names and margin >= 0.08:
            track_team[tid] = {
                "team": names[c1],
                "confidence": round(min(1.0, 0.5 + margin), 3),
            }

    for frame in frames:
        for player in frame.get("players", []):
            match = track_team.get(str(player["track_id"]))
            player["team"] = match["team"] if match else None
            player["team_confidence"] = match["confidence"] if match else 0.0

    return {
        "status": "inferred",
        "clusters": k,
        "assigned_tracks": len(track_team),
        "eligible_tracks": len(eligible),
        "labels": ["team_a", "team_b"],
    }


class UltralyticsTrackingDetector(VideoDetector):
    """Detect people + sports ball and maintain persistent track IDs.

    Default class IDs match COCO (`person=0`, `sports ball=32`). A custom
    basketball model can override them without changing CourtIQ downstream.
    """

    def __init__(
        self,
        court_calibration,
        model="yolo26n.pt",
        tracker="bytetrack.yaml",
        device=None,
        imgsz=1280,
        player_confidence=0.28,
        ball_confidence=0.10,
        sample_every=1,
        player_class_id=0,
        ball_class_id=32,
        infer_teams=True,
    ):
        self.calibration = load_calibration(court_calibration)
        self.model_name = model
        self.tracker = tracker
        self.device = device
        self.imgsz = int(imgsz)
        self.player_confidence = float(player_confidence)
        self.ball_confidence = float(ball_confidence)
        self.sample_every = max(1, int(sample_every))
        self.player_class_id = int(player_class_id)
        self.ball_class_id = int(ball_class_id)
        self.infer_teams = bool(infer_teams)

    def detect(self, video_path: str) -> dict:
        try:
            import cv2  # type: ignore
            import numpy as np  # type: ignore
            from ultralytics import YOLO  # type: ignore
        except ImportError as exc:  # pragma: no cover - CV runtime only
            raise RuntimeError(
                "Ultralytics adapter requires vision_worker/requirements-cv.txt"
            ) from exc

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"unable to open video: {video_path}")
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        if fps <= 0:
            cap.release()
            raise ValueError("video reports invalid FPS")

        model = YOLO(self.model_name)
        homography = compute_homography(self.calibration)
        polygon = self.calibration.get("play_area_polygon")
        frames = []
        frame_index = 0
        previous_ball = None
        previous_handler = None
        dropped_untracked_players = 0

        while True:
            ok, frame = cap.read()
            if not ok:
                break
            kwargs = {
                "persist": True,
                "tracker": self.tracker,
                "classes": [self.player_class_id, self.ball_class_id],
                "conf": min(self.player_confidence, self.ball_confidence),
                "imgsz": self.imgsz,
                "verbose": False,
            }
            if self.device is not None:
                kwargs["device"] = self.device
            results = model.track(frame, **kwargs)
            result = results[0] if results else None
            players, balls = [], []
            if result is not None and result.boxes is not None:
                boxes = result.boxes
                xyxy = boxes.xyxy.cpu().tolist()
                confs = boxes.conf.cpu().tolist()
                classes = boxes.cls.cpu().tolist()
                ids = boxes.id.cpu().tolist() if boxes.id is not None else [None] * len(xyxy)
                for i, box in enumerate(xyxy):
                    cls = int(classes[i])
                    conf = float(confs[i])
                    if cls == self.player_class_id:
                        if conf < self.player_confidence or not point_in_polygon(_foot(box), polygon):
                            continue
                        if ids[i] is None:
                            dropped_untracked_players += 1
                            continue
                        app = _jersey_appearance(frame, box, cv2, np)
                        players.append({
                            "track_id": str(int(ids[i])),
                            "bbox": [round(float(v), 2) for v in box],
                            "confidence": round(conf, 4),
                            "appearance": app,
                        })
                    elif cls == self.ball_class_id and conf >= self.ball_confidence:
                        if point_in_polygon(_center(box), polygon):
                            balls.append({
                                "bbox": [round(float(v), 2) for v in box],
                                "confidence": round(conf, 4),
                            })

            chosen_ball = _choose_ball(balls, previous_ball, frame.shape)
            if chosen_ball is not None:
                previous_ball = chosen_ball
            handler_track_id = _infer_handler(players, chosen_ball, previous_handler)
            if handler_track_id is not None:
                previous_handler = handler_track_id
            if frame_index % self.sample_every == 0:
                frames.append({
                    "frame": frame_index,
                    "players": players,
                    "ball": chosen_ball,
                    "handler_track_id": handler_track_id,
                })
            frame_index += 1

        cap.release()
        team_meta = {"status": "disabled"}
        if self.infer_teams:
            team_meta = _assign_team_clusters(frames, cv2, np)

        payload = {
            "fps": fps,
            "frames": frames,
            "homography": homography,
            "detector": {
                "adapter": "ultralytics-track-v235",
                "model": self.model_name,
                "tracker": self.tracker,
                "imgsz": self.imgsz,
                "sample_every": self.sample_every,
                "processed_frames": frame_index,
                "emitted_frames": len(frames),
                "dropped_untracked_players": dropped_untracked_players,
                "handler_inference": "image-space-player-box-proximity",
            },
            "team_inference": team_meta,
            "calibration": {
                "coordinate_system": "courtiq-94x50-feet",
                "points": len(self.calibration["image_points"]),
                "play_area_filter": bool(polygon),
            },
        }
        return validate_detection(payload)
