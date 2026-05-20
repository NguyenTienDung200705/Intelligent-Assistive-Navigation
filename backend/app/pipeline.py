import cv2
import numpy as np
import asyncio
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable

from app.config import (
    YOLO_MODEL_PATH, MIDAS_MODEL_PATH,
    CONFIDENCE_THRESHOLD, IOU_THRESHOLD, IMAGE_SIZE, FRAME_SKIP,
)
from modules.detector.yolo_detector import YOLODetector
from modules.tracker.bytetrack import SimpleTracker
from modules.depth.depth_estimator import DepthEstimator
from modules.danger.danger_analyzer import DangerAnalyzer
from modules.speech.tts_engine import TTSEngine
from modules.utils.drawing import (
    draw_corner_box, put_label, draw_direction_arrow,
    draw_danger_hud, DANGER_COLORS_BGR,
)
from modules.utils.image_utils import save_image
from modules.utils.video_utils import get_video_info

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


class SmartNavigationPipeline:
    _instance: Optional["SmartNavigationPipeline"] = None

    @classmethod
    def get_instance(cls) -> "SmartNavigationPipeline":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        logger.info("Initializing SmartNavigation Pipeline ...")
        self.detector = YOLODetector(
            str(YOLO_MODEL_PATH),
            conf=CONFIDENCE_THRESHOLD,
            iou=IOU_THRESHOLD,
            imgsz=IMAGE_SIZE,
        )
        self.tracker = SimpleTracker()
        self.depth_estimator = DepthEstimator(str(MIDAS_MODEL_PATH))
        self.danger_analyzer = DangerAnalyzer()
        self.tts = TTSEngine()
        logger.info("Pipeline ready.")

    def process_image(self, image_path: str) -> Dict[str, Any]:

        # RESET TRACKER CHO ẢNH MỚI
        self.tracker = SimpleTracker()

        frame = cv2.imread(image_path)

        if frame is None:
            raise ValueError(f"Cannot read image: {image_path}")

        return self._process_frame(
            frame,
            save_output=True,
            stem=Path(image_path).stem
        )

    async def process_video(
        self,
        video_path: str,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        info = get_video_info(video_path)
        fps = info.get("fps") or 25.0
        total_frames = info.get("total_frames", 0)
        w, h = info.get("width", 640), info.get("height", 360)

        stem = Path(video_path).stem
        out_path = str(OUTPUT_DIR / f"{stem}_detected.mp4")
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(out_path, fourcc, max(fps / max(FRAME_SKIP, 1), 1.0), (w, h))

        self.tracker = SimpleTracker()
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        all_results: List[Dict] = []
        frame_idx = 0
        processed = 0
        t_start = time.time()

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % max(FRAME_SKIP, 1) == 0:
                result = self._process_frame(frame, save_output=False)
                all_results.append(result)
                writer.write(self._annotate_frame(frame, result))
                processed += 1
                if progress_callback and total_frames > 0:
                    pct = min(int(frame_idx / total_frames * 100), 99)
                    await progress_callback(pct)
            frame_idx += 1

        cap.release()
        writer.release()

        all_objects = []
        for r in all_results:
            all_objects.extend(r.get("objects", []))

        top_objs = sorted(all_objects, key=lambda x: x.get("danger_score", 0), reverse=True)
        final_summary = self.danger_analyzer.generate_summary(top_objs[:5] if top_objs else [])
        audio_file = self.tts.synthesize(final_summary["tts_text"])

        if progress_callback:
            await progress_callback(100)

        return {
            "objects": top_objs[:20],
            "summary": final_summary,
            "audio_file": audio_file,
            "output_video": f"{stem}_detected.mp4",
            "total_frames": frame_idx,
            "processed_frames": processed,
            "processing_time_ms": round((time.time() - t_start) * 1000, 1),
            "video_info": info,
        }

    def process_frame_bytes(self, image_bytes: bytes) -> Dict[str, Any]:

        # RESET TRACKER
        self.tracker = SimpleTracker()

        arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if frame is None:
            return {"error": "Cannot decode frame"}

        return self._process_frame(frame, save_output=False)

    # ── Internal ──────────────────────────────────────────────────────────

    def _process_frame(self, frame: np.ndarray, save_output: bool = False, stem: str = "frame") -> Dict[str, Any]:
        t0 = time.time()

        detections = self.detector.detect(frame)
        depth_map = self.depth_estimator.estimate(frame)

        for det in detections:
            score, key, label = self.depth_estimator.get_region_depth(depth_map, det["bbox"])
            det["depth_score"] = round(score, 3)
            det["distance_key"] = key
            det["distance_label"] = label

        tracked = self.tracker.update(detections)
        analyzed = self.danger_analyzer.analyze(tracked)
        summary = self.danger_analyzer.generate_summary(analyzed)
        audio_file = self.tts.synthesize(summary["tts_text"]) if save_output else None

        elapsed = round((time.time() - t0) * 1000, 1)
        out_img = out_depth = None

        if save_output:
            annotated = self._annotate_frame(frame, {"objects": analyzed, "summary": summary})
            depth_colored = self.depth_estimator.colorize_depth(depth_map)
            out_img = f"{stem}_detected.jpg"
            out_depth = f"{stem}_depth.jpg"
            save_image(annotated, str(OUTPUT_DIR / out_img))
            save_image(depth_colored, str(OUTPUT_DIR / out_depth))

            if not audio_file:
                audio_file = self.tts.synthesize(summary["tts_text"])

        return {
            "objects": [self._serialize(o) for o in analyzed],
            "summary": summary,
            "audio_file": audio_file,
            "annotated_image": out_img,
            "depth_image": out_depth,
            "processing_time_ms": elapsed,
            "frame_size": {"width": frame.shape[1], "height": frame.shape[0]},
        }

    def _annotate_frame(self, frame: np.ndarray, result: Dict) -> np.ndarray:
        out = frame.copy()
        for obj in result.get("objects", []):
            bbox = obj.get("bbox", [])
            if len(bbox) != 4:
                continue
            x1, y1, x2, y2 = [int(v) for v in bbox]
            color = DANGER_COLORS_BGR.get(obj.get("danger_level", "LOW"), (135, 255, 0))
            draw_corner_box(out, x1, y1, x2, y2, color)
            parts = []
            if obj.get("id"):
                parts.append(f"#{obj['id']}")
            parts.append(obj.get("label_vi") or obj.get("class_name", "obj"))
            parts.append(f"{obj.get('confidence', 0):.0%}")
            if obj.get("distance_label"):
                parts.append(f"| {obj['distance_label']}")
            put_label(out, " ".join(parts), x1, y1, color)
            if obj.get("direction") == "approaching":
                cx, cy = (x1+x2)//2, (y1+y2)//2
                draw_direction_arrow(out, (cx, cy), "approaching", color)
        draw_danger_hud(out, result.get("summary", {}), len(result.get("objects", [])), result.get("processing_time_ms", 0))
        return out

    def _serialize(self, obj: Dict) -> Dict:
        return {
            "id":             obj.get("track_id", 0),
            "class_name":     obj.get("class_name", ""),
            "label_vi":       obj.get("label_vi", ""),
            "confidence":     obj.get("confidence", 0),
            "bbox":           [int(v) for v in obj.get("bbox", [])],
            "center":         obj.get("center", []),
            "distance_label": obj.get("distance_label", ""),
            "distance_key":   obj.get("distance_key", "medium"),
            "direction":      obj.get("direction", "unknown"),
            "speed_label":    obj.get("speed_label", ""),
            "speed_score":    obj.get("speed_score", 0),
            "danger_level":   obj.get("danger_level", "LOW"),
            "danger_score":   obj.get("danger_score", 0),
            "danger_color":   obj.get("danger_color", "#00ff87"),
            "warning_text":   obj.get("warning_text", ""),
        }