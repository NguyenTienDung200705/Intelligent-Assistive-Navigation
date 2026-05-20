import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Vietnamese label map
VI_LABELS = {
    "person": "người",
    "bicycle": "xe đạp",
    "motorcycle": "xe máy",
    "car": "ô tô",
    "truck": "xe tải",
    "bus": "xe buýt",
    "train": "tàu hỏa",
    "dog": "chó",
    "cat": "mèo",
    "pothole": "ổ gà",
    "obstacle": "chướng ngại vật",
    "traffic_sign": "biển báo",
    "traffic_light": "đèn giao thông",
    "stop_sign": "biển dừng",
    "bench": "ghế băng",
    "chair": "ghế",
    "backpack": "ba lô",
    "handbag": "túi xách",
    "umbrella": "ô/dù",
    "default": "vật thể",
}


class YOLODetector:
    def __init__(self, model_path: str, conf: float = 0.45, iou: float = 0.45, imgsz: int = 640):
        self.model_path = model_path
        self.conf = conf
        self.iou = iou
        self.imgsz = imgsz
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            path = Path(self.model_path)
            if path.exists():
                self.model = YOLO(str(path))
                logger.info(f"✅ YOLO model loaded from {path}")
            else:
                # Fallback to pretrained yolov8n
                logger.warning(f"⚠️ Model not found at {path}, using yolov8n fallback")
                self.model = YOLO("yolov8n.pt")
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO: {e}")
            self.model = None

    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        if self.model is None:
            return self._mock_detect(frame)

        try:
            results = self.model(
                frame,
                conf=self.conf,
                iou=self.iou,
                imgsz=self.imgsz,
                verbose=False,
            )[0]

            detections = []
            for box in results.boxes:
                cls_id = int(box.cls[0])
                cls_name = results.names.get(cls_id, "default")
                conf = float(box.conf[0])
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2

                detections.append({
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "label_vi": VI_LABELS.get(cls_name, VI_LABELS["default"]),
                    "confidence": round(conf, 3),
                    "bbox": [x1, y1, x2, y2],
                    "center": [cx, cy],
                    "area": (x2 - x1) * (y2 - y1),
                })
            return detections

        except Exception as e:
            logger.error(f"Detection error: {e}")
            return []

    def _mock_detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Fallback mock for demo when model unavailable"""
        h, w = frame.shape[:2]
        return [
            {
                "class_id": 0,
                "class_name": "person",
                "label_vi": "người",
                "confidence": 0.92,
                "bbox": [int(w*0.3), int(h*0.2), int(w*0.5), int(h*0.8)],
                "center": [int(w*0.4), int(h*0.5)],
                "area": int(w*0.2) * int(h*0.6),
            },
            {
                "class_id": 2,
                "class_name": "car",
                "label_vi": "ô tô",
                "confidence": 0.87,
                "bbox": [int(w*0.6), int(h*0.4), int(w*0.95), int(h*0.75)],
                "center": [int(w*0.775), int(h*0.575)],
                "area": int(w*0.35) * int(h*0.35),
            },
        ]

    def draw_detections(self, frame: np.ndarray, detections: List[Dict], tracked_objects: List[Dict] = None) -> np.ndarray:
        output = frame.copy()
        color_map = {
            "LOW": (0, 255, 100),
            "MEDIUM": (0, 200, 255),
            "HIGH": (0, 100, 255),
            "CRITICAL": (0, 0, 255),
        }

        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            danger = det.get("danger_level", "LOW")
            color = color_map.get(danger, (0, 255, 100))

            # Bounding box
            cv2.rectangle(output, (x1, y1), (x2, y2), color, 2)

            # Corner accents
            corner_len = 15
            for cx, cy, dx, dy in [(x1, y1, 1, 1), (x2, y1, -1, 1), (x1, y2, 1, -1), (x2, y2, -1, -1)]:
                cv2.line(output, (cx, cy), (cx + dx * corner_len, cy), color, 3)
                cv2.line(output, (cx, cy), (cx, cy + dy * corner_len), color, 3)

            # Label background
            label = f"{det['label_vi']} {det['confidence']:.0%}"
            if det.get("track_id"):
                label = f"#{det['track_id']} {label}"
            if det.get("distance_label"):
                label += f" | {det['distance_label']}"

            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
            cv2.rectangle(output, (x1, y1 - th - 10), (x1 + tw + 8, y1), color, -1)
            cv2.putText(output, label, (x1 + 4, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1, cv2.LINE_AA)

            # Direction arrow
            if det.get("direction") == "approaching":
                cx_, cy_ = det["center"]
                cv2.arrowedLine(output, (cx_, cy_ + 30), (cx_, cy_), color, 2, tipLength=0.4)

        return output