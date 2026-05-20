import cv2
import numpy as np
from typing import List, Dict, Tuple

DANGER_COLORS_BGR = {
    "LOW":      (135, 255, 0),
    "MEDIUM":   (0,   179, 255),
    "HIGH":     (0,   109, 255),
    "CRITICAL": (68,  23,  255),
}


def draw_corner_box(
    img: np.ndarray,
    x1: int, y1: int, x2: int, y2: int,
    color: Tuple[int, int, int],
    thickness: int = 2,
    corner_len: int = 18,
) -> np.ndarray:
    cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)
    pts = [(x1, y1, 1, 1), (x2, y1, -1, 1), (x1, y2, 1, -1), (x2, y2, -1, -1)]
    for cx, cy, dx, dy in pts:
        cv2.line(img, (cx, cy), (cx + dx * corner_len, cy), color, thickness + 1)
        cv2.line(img, (cx, cy), (cx, cy + dy * corner_len), color, thickness + 1)
    return img


def put_label(
    img: np.ndarray,
    text: str,
    x: int, y: int,
    color: Tuple[int, int, int],
    font_scale: float = 0.5,
    thickness: int = 1,
) -> np.ndarray:
    font = cv2.FONT_HERSHEY_SIMPLEX
    (tw, th), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    pad = 4
    cv2.rectangle(img, (x, y - th - pad * 2), (x + tw + pad * 2, y), color, -1)
    text_color = (0, 0, 0)
    cv2.putText(img, text, (x + pad, y - pad), font, font_scale, text_color, thickness, cv2.LINE_AA)
    return img


def draw_direction_arrow(
    img: np.ndarray,
    center: Tuple[int, int],
    direction: str,
    color: Tuple[int, int, int],
) -> np.ndarray:
    cx, cy = center
    if direction == "approaching":
        cv2.arrowedLine(img, (cx, cy + 35), (cx, cy + 5), color, 2, tipLength=0.4)
    elif direction == "receding":
        cv2.arrowedLine(img, (cx, cy - 5), (cx, cy - 35), color, 2, tipLength=0.4)
    return img


def draw_danger_hud(
    img: np.ndarray,
    summary: Dict,
    obj_count: int,
    ms: float,
) -> np.ndarray:
    h, w = img.shape[:2]
    level = summary.get("overall_level", "LOW")
    color = DANGER_COLORS_BGR.get(level, (135, 255, 0))

    # Top bar
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, 36), (5, 12, 20), -1)
    cv2.addWeighted(overlay, 0.8, img, 0.2, 0, img)

    # Title
    cv2.putText(img, "SMARTNAV AI", (10, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2, cv2.LINE_AA)

    # Right info
    info = f"OBJ:{obj_count}  {ms:.0f}ms  YOLO26+MiDaS"
    tw, _ = cv2.getTextSize(info, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0], 0
    cv2.putText(img, info, (w - 260, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (122, 155, 181), 1, cv2.LINE_AA)

    # Bottom warning strip
    if level in ("HIGH", "CRITICAL"):
        overlay2 = img.copy()
        cv2.rectangle(overlay2, (0, h - 40), (w, h), (5, 12, 20), -1)
        cv2.addWeighted(overlay2, 0.85, img, 0.15, 0, img)
        warn = summary.get("primary_warning", "")[:80]
        cv2.putText(img, warn, (10, h - 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)

    return img


def draw_depth_overlay(
    img: np.ndarray,
    depth_map: np.ndarray,
    alpha: float = 0.35,
) -> np.ndarray:
    d8 = (depth_map * 255).astype(np.uint8)
    colored = cv2.applyColorMap(d8, cv2.COLORMAP_INFERNO)
    return cv2.addWeighted(img, 1 - alpha, colored, alpha, 0)