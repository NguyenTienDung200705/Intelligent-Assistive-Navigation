import numpy as np
from typing import List, Dict, Any
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class SimpleTracker:
    """
    Lightweight centroid-based tracker (ByteTrack-inspired).
    Assigns persistent IDs and estimates motion direction/speed.
    Replace with full ByteTrack if available.
    """

    def __init__(self, max_disappeared: int = 30, max_distance: float = 120.0):
        self.next_id = 1
        self.objects: Dict[int, Dict] = {}       # id -> object state
        self.disappeared: Dict[int, int] = {}    # id -> frames missing
        self.history: Dict[int, List] = defaultdict(list)  # id -> center history
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def _euclidean(self, a, b):
        return np.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not detections:
            for obj_id in list(self.disappeared.keys()):
                self.disappeared[obj_id] += 1
                if self.disappeared[obj_id] > self.max_disappeared:
                    self._deregister(obj_id)
            return []

        input_centroids = [d["center"] for d in detections]

        if not self.objects:
            for i, det in enumerate(detections):
                self._register(det)
        else:
            object_ids = list(self.objects.keys())
            object_centroids = [self.objects[oid]["center"] for oid in object_ids]

            # Simple nearest-neighbour matching
            matched_det = set()
            matched_obj = set()

            for i, obj_id in enumerate(object_ids):
                min_dist = float("inf")
                min_j = -1
                for j, inp_c in enumerate(input_centroids):
                    if j in matched_det:
                        continue
                    dist = self._euclidean(object_centroids[i], inp_c)
                    if dist < min_dist:
                        min_dist = dist
                        min_j = j

                if min_j >= 0 and min_dist < self.max_distance:
                    self.objects[obj_id] = {**detections[min_j], "track_id": obj_id}
                    self.history[obj_id].append(detections[min_j]["center"])
                    if len(self.history[obj_id]) > 15:
                        self.history[obj_id] = self.history[obj_id][-15:]
                    self.disappeared[obj_id] = 0
                    matched_det.add(min_j)
                    matched_obj.add(obj_id)
                else:
                    self.disappeared[obj_id] += 1
                    if self.disappeared[obj_id] > self.max_disappeared:
                        self._deregister(obj_id)

            for j, det in enumerate(detections):
                if j not in matched_det:
                    self._register(det)

        # Enrich with motion info
        result = []
        for obj_id, obj in self.objects.items():
            enriched = {**obj}
            enriched["track_id"] = obj_id
            enriched["direction"], enriched["speed_label"], enriched["speed_score"] = (
                self._analyze_motion(obj_id)
            )
            result.append(enriched)

        return result

    def _register(self, det: Dict):
        obj_id = self.next_id
        self.next_id += 1
        self.objects[obj_id] = {**det, "track_id": obj_id}
        self.disappeared[obj_id] = 0
        self.history[obj_id] = [det["center"]]

    def _deregister(self, obj_id: int):
        del self.objects[obj_id]
        del self.disappeared[obj_id]
        if obj_id in self.history:
            del self.history[obj_id]

    def _analyze_motion(self, obj_id: int):
        hist = self.history.get(obj_id, [])
        if len(hist) < 4:
            return "unknown", "chưa xác định", 0.0

        # Use last 6 positions
        pts = hist[-6:]
        deltas = [
            (pts[i+1][0] - pts[i][0], pts[i+1][1] - pts[i][1])
            for i in range(len(pts) - 1)
        ]
        avg_dy = np.mean([d[1] for d in deltas])
        avg_dx = np.mean([d[0] for d in deltas])
        speed = np.sqrt(avg_dx**2 + avg_dy**2)

        # Moving toward camera = increasing bbox size approximated by y movement
        if avg_dy > 3:
            direction = "approaching"
        elif avg_dy < -3:
            direction = "receding"
        else:
            direction = "stationary"

        if speed < 3:
            speed_label, speed_score = "đứng yên", 0.1
        elif speed < 10:
            speed_label, speed_score = "di chuyển chậm", 0.3
        elif speed < 25:
            speed_label, speed_score = "di chuyển vừa", 0.6
        else:
            speed_label, speed_score = "di chuyển nhanh", 1.0

        return direction, speed_label, min(speed / 30, 1.0)