import numpy as np
from typing import Tuple

# Relative distance thresholds (depth score 0..1, 1=closest)
ZONE_THRESHOLDS = {
    "very_close": 0.80,
    "close":      0.60,
    "medium":     0.40,
    "far":        0.20,
}

LABELS_VI = {
    "very_close": "rất gần",
    "close":      "gần",
    "medium":     "trung bình",
    "far":        "xa",
    "very_far":   "rất xa",
}


def score_to_zone(score: float) -> Tuple[str, str]:
    """Return (zone_key, label_vi) from a normalized depth score [0..1]."""
    if score >= ZONE_THRESHOLDS["very_close"]:
        return "very_close", LABELS_VI["very_close"]
    elif score >= ZONE_THRESHOLDS["close"]:
        return "close", LABELS_VI["close"]
    elif score >= ZONE_THRESHOLDS["medium"]:
        return "medium", LABELS_VI["medium"]
    elif score >= ZONE_THRESHOLDS["far"]:
        return "far", LABELS_VI["far"]
    else:
        return "very_far", LABELS_VI["very_far"]


def estimate_relative_distance_from_bbox(
    bbox: list,
    frame_w: int,
    frame_h: int,
) -> Tuple[float, str, str]:
    """
    Fallback distance estimation from bounding box size relative to frame.
    Larger bbox → closer.
    """
    x1, y1, x2, y2 = bbox
    area = (x2 - x1) * (y2 - y1)
    frame_area = frame_w * frame_h
    ratio = area / max(frame_area, 1)

    if ratio > 0.25:
        score = 0.90
    elif ratio > 0.12:
        score = 0.70
    elif ratio > 0.05:
        score = 0.50
    elif ratio > 0.01:
        score = 0.25
    else:
        score = 0.10

    zone, label = score_to_zone(score)
    return score, zone, label