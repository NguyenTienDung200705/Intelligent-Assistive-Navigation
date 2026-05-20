import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

DISTANCE_LABELS = {
    "very_close": "rất gần",
    "close": "gần",
    "medium": "trung bình",
    "far": "xa",
    "very_far": "rất xa",
}


class DepthEstimator:
    def __init__(self, model_path: str = None):
        self.model = None
        self.transform = None
        self.device = "cpu"
        self._load_model(model_path)

    def _load_model(self, model_path: str = None):
        try:
            import torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            # Try loading custom model first
            if model_path and Path(model_path).exists():
                self.model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", pretrained=False)
                state = torch.load(model_path, map_location=self.device)
                self.model.load_state_dict(state)
            else:
                # Download MiDaS small (fast)
                self.model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", pretrained=True)

            midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
            self.transform = midas_transforms.small_transform
            self.model.to(self.device).eval()
            logger.info(f"✅ MiDaS loaded on {self.device}")
        except Exception as e:
            logger.warning(f"⚠️ MiDaS not loaded ({e}), using gradient fallback")
            self.model = None

    def estimate(self, frame: np.ndarray) -> np.ndarray:
        """Returns normalized depth map [0..1], 1=near, 0=far"""
        if self.model is None:
            return self._gradient_fallback(frame)

        try:
            import torch
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            inp = self.transform(rgb).to(self.device)
            with torch.no_grad():
                pred = self.model(inp)
                pred = torch.nn.functional.interpolate(
                    pred.unsqueeze(1),
                    size=frame.shape[:2],
                    mode="bicubic",
                    align_corners=False,
                ).squeeze()
            depth = pred.cpu().numpy()
            # Invert: MiDaS output is disparity (higher = closer)
            d_min, d_max = depth.min(), depth.max()
            if d_max > d_min:
                depth = (depth - d_min) / (d_max - d_min)
            return depth
        except Exception as e:
            logger.error(f"Depth estimation error: {e}")
            return self._gradient_fallback(frame)

    def _gradient_fallback(self, frame: np.ndarray) -> np.ndarray:
        """Simple gradient: top=far, bottom=near"""
        h, w = frame.shape[:2]
        gradient = np.linspace(0, 1, h).reshape(h, 1)
        return np.tile(gradient, (1, w))

    def get_region_depth(self, depth_map: np.ndarray, bbox: list) -> Tuple[float, str, str]:
        """
        Returns (score 0..1, label_key, label_vi) for a bounding box region.
        score=1 means very close (dangerous).
        """
        x1, y1, x2, y2 = bbox
        h, w = depth_map.shape
        x1, x2 = max(0, x1), min(w - 1, x2)
        y1, y2 = max(0, y1), min(h - 1, y2)

        if x2 <= x1 or y2 <= y1:
            return 0.5, "medium", DISTANCE_LABELS["medium"]

        region = depth_map[y1:y2, x1:x2]
        # Use 80th percentile (foreground object)
        score = float(np.percentile(region, 80))

        if score > 0.80:
            return score, "very_close", DISTANCE_LABELS["very_close"]
        elif score > 0.60:
            return score, "close", DISTANCE_LABELS["close"]
        elif score > 0.40:
            return score, "medium", DISTANCE_LABELS["medium"]
        elif score > 0.20:
            return score, "far", DISTANCE_LABELS["far"]
        else:
            return score, "very_far", DISTANCE_LABELS["very_far"]

    def colorize_depth(self, depth_map: np.ndarray) -> np.ndarray:
        """Convert depth map to RGB visualization"""
        d8 = (depth_map * 255).astype(np.uint8)
        colored = cv2.applyColorMap(d8, cv2.COLORMAP_INFERNO)
        return colored