import numpy as np
from typing import Tuple, List


def bbox_iou(b1: List[int], b2: List[int]) -> float:
    x1 = max(b1[0], b2[0]); y1 = max(b1[1], b2[1])
    x2 = min(b1[2], b2[2]); y2 = min(b1[3], b2[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    a1 = (b1[2]-b1[0]) * (b1[3]-b1[1])
    a2 = (b2[2]-b2[0]) * (b2[3]-b2[1])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0


def bbox_area(bbox: List[int]) -> int:
    return max(0, bbox[2]-bbox[0]) * max(0, bbox[3]-bbox[1])


def bbox_center(bbox: List[int]) -> Tuple[int, int]:
    return ((bbox[0]+bbox[2])//2, (bbox[1]+bbox[3])//2)


def relative_area(bbox: List[int], frame_w: int, frame_h: int) -> float:
    return bbox_area(bbox) / (frame_w * frame_h + 1e-6)


def is_in_center_zone(bbox: List[int], frame_w: int, frame_h: int,
                       zone_ratio: float = 0.4) -> bool:
    cx, cy = bbox_center(bbox)
    zx1 = frame_w * (0.5 - zone_ratio/2)
    zx2 = frame_w * (0.5 + zone_ratio/2)
    zy1 = frame_h * (0.5 - zone_ratio/2)
    zy2 = frame_h * (0.5 + zone_ratio/2)
    return zx1 <= cx <= zx2 and zy1 <= cy <= zy2


def nms(detections: list, iou_thresh: float = 0.5) -> list:
    if not detections:
        return []
    detections = sorted(detections, key=lambda x: x["confidence"], reverse=True)
    keep = []
    for det in detections:
        overlap = False
        for k in keep:
            if bbox_iou(det["bbox"], k["bbox"]) > iou_thresh:
                overlap = True
                break
        if not overlap:
            keep.append(det)
    return keep