import cv2
import numpy as np
import asyncio
import time
import logging
import base64
import subprocess
import os
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


def _encode_frame_base64(frame: np.ndarray, quality: int = 80) -> str:
    """Encode a BGR frame to base64 JPEG string for WebSocket transmission."""
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def _remux_to_h264(src: str, dst: str) -> bool:
    """
    Re-encode video to H.264 MP4 using ffmpeg so browsers can play it.
    Returns True on success.
    """
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", src,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",   # Required for broad browser compatibility
            "-movflags", "+faststart",  # Allows streaming before full download
            "-an",                    # No audio track needed
            dst,
        ]
        result = subprocess.run(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=300,
        )
        return result.returncode == 0 and Path(dst).exists()
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        logger.warning(f"ffmpeg remux failed: {e}")
        return False


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

    # ─────────────────────────────────────────────────────────────────────
    # IMAGE
    # ─────────────────────────────────────────────────────────────────────

    def process_image(self, image_path: str) -> Dict[str, Any]:
        # Fresh tracker per image
        self.tracker = SimpleTracker()
        frame = cv2.imread(image_path)
        if frame is None:
            raise ValueError(f"Cannot read image: {image_path}")
        return self._process_frame(frame, save_output=True, stem=Path(image_path).stem)

    # ─────────────────────────────────────────────────────────────────────
    # VIDEO  (fixed: H.264 remux so browsers can play)
    # ─────────────────────────────────────────────────────────────────────

    async def process_video(
        self,
        video_path: str,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        info = get_video_info(video_path)
        fps        = info.get("fps") or 25.0
        total_frames = info.get("total_frames", 0)
        w = info.get("width",  640)
        h = info.get("height", 360)

        stem = Path(video_path).stem

        # ── Step 1: write annotated frames with mp4v (fast, lossless pipeline) ──
        raw_path = str(OUTPUT_DIR / f"{stem}_raw.mp4")
        fourcc   = cv2.VideoWriter_fourcc(*"mp4v")
        out_fps  = max(fps / max(FRAME_SKIP, 1), 1.0)
        writer   = cv2.VideoWriter(raw_path, fourcc, out_fps, (w, h))

        self.tracker = SimpleTracker()
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        all_results: List[Dict] = []
        frame_idx  = 0
        processed  = 0
        t_start    = time.time()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % max(FRAME_SKIP, 1) == 0:
                result = self._process_frame(frame, save_output=False)
                all_results.append(result)

                # Draw bounding boxes + HUD on every processed frame
                annotated = self._annotate_frame(frame, result)
                writer.write(annotated)
                processed += 1

                if progress_callback and total_frames > 0:
                    # Reserve last 20% progress for remux step
                    pct = min(int(frame_idx / total_frames * 80), 79)
                    await progress_callback(pct)

                # Yield control so FastAPI can handle other requests
                await asyncio.sleep(0)
            else:
                # Write original frame for skipped frames to keep timing
                writer.write(frame)

            frame_idx += 1

        cap.release()
        writer.release()

        # ── Step 2: remux mp4v → H.264 so Chrome/Firefox can play it ──
        final_name = f"{stem}_detected.mp4"
        final_path = str(OUTPUT_DIR / final_name)

        if progress_callback:
            await progress_callback(85)

        remux_ok = _remux_to_h264(raw_path, final_path)

        if remux_ok:
            # Remove the raw temp file
            try:
                os.remove(raw_path)
            except OSError:
                pass
        else:
            # ffmpeg not available — rename raw file as final (may not play in browser)
            logger.warning("ffmpeg not available; returning mp4v video (may not play in all browsers)")
            os.rename(raw_path, final_path)

        # ── Step 3: aggregate results & TTS ──
        all_objects: List[Dict] = []
        for r in all_results:
            all_objects.extend(r.get("objects", []))

        top_objs = sorted(all_objects, key=lambda x: x.get("danger_score", 0), reverse=True)
        final_summary = self.danger_analyzer.generate_summary(top_objs[:5] if top_objs else [])
        audio_file    = self.tts.synthesize(final_summary["tts_text"])

        if progress_callback:
            await progress_callback(100)

        elapsed = round((time.time() - t_start) * 1000, 1)
        logger.info(f"Video processed: {processed}/{frame_idx} frames, {elapsed:.0f}ms, output={final_name}")

        return {
            "objects":           top_objs[:20],
            "summary":           final_summary,
            "audio_file":        audio_file,
            "output_video":      final_name,          # filename served by /video/{filename}
            "total_frames":      frame_idx,
            "processed_frames":  processed,
            "processing_time_ms": elapsed,
            "video_info":        info,
        }

    # ─────────────────────────────────────────────────────────────────────
    # WEBSOCKET CAMERA  (fixed: returns annotated frame as base64)
    # ─────────────────────────────────────────────────────────────────────

    def process_frame_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Process a raw JPEG frame from the WebSocket camera stream.
        Returns JSON including:
          - objects, summary (danger info)
          - annotated_frame_b64: base64 JPEG with bounding boxes drawn
          - audio_file: TTS filename to play (only when danger level changes)
        """
        arr   = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if frame is None:
            return {"error": "Cannot decode frame"}

        result = self._process_frame(frame, save_output=False)

        # Draw bounding boxes on the frame
        annotated = self._annotate_frame(frame, {
            "objects": [self._deserialize_for_annotate(o) for o in result["objects"]],
            "summary": result["summary"],
            "processing_time_ms": result["processing_time_ms"],
        })

        # Encode annotated frame to base64 for WebSocket transmission
        result["annotated_frame_b64"] = _encode_frame_base64(annotated, quality=75)

        return result

    # ─────────────────────────────────────────────────────────────────────
    # INTERNAL HELPERS
    # ─────────────────────────────────────────────────────────────────────

    def _process_frame(
        self,
        frame: np.ndarray,
        save_output: bool = False,
        stem: str = "frame",
    ) -> Dict[str, Any]:
        t0 = time.time()

        # Detection
        detections = self.detector.detect(frame)

        # Depth estimation
        depth_map = self.depth_estimator.estimate(frame)
        for det in detections:
            score, key, label = self.depth_estimator.get_region_depth(depth_map, det["bbox"])
            det["depth_score"]   = round(score, 3)
            det["distance_key"]  = key
            det["distance_label"] = label

        # Tracking
        tracked = self.tracker.update(detections)

        # Danger scoring
        analyzed = self.danger_analyzer.analyze(tracked)
        summary  = self.danger_analyzer.generate_summary(analyzed)

        # TTS — generate for every frame (cached by text hash)
        audio_file = self.tts.synthesize(summary["tts_text"])

        elapsed    = round((time.time() - t0) * 1000, 1)
        out_img    = None
        out_depth  = None

        if save_output:
            annotated     = self._annotate_frame(frame, {"objects": analyzed, "summary": summary, "processing_time_ms": elapsed})
            depth_colored = self.depth_estimator.colorize_depth(depth_map)
            out_img   = f"{stem}_detected.jpg"
            out_depth = f"{stem}_depth.jpg"
            save_image(annotated,     str(OUTPUT_DIR / out_img))
            save_image(depth_colored, str(OUTPUT_DIR / out_depth))

        return {
            "objects":             [self._serialize(o) for o in analyzed],
            "summary":             summary,
            "audio_file":          audio_file,
            "annotated_image":     out_img,
            "depth_image":         out_depth,
            "processing_time_ms":  elapsed,
            "frame_size":          {"width": frame.shape[1], "height": frame.shape[0]},
        }

    def _annotate_frame(self, frame: np.ndarray, result: Dict) -> np.ndarray:
        """Draw bounding boxes, labels, arrows and HUD on frame."""
        out = frame.copy()
        ms  = result.get("processing_time_ms", 0)

        for obj in result.get("objects", []):
            bbox = obj.get("bbox", [])
            if len(bbox) != 4:
                continue

            x1, y1, x2, y2 = [int(v) for v in bbox]
            level  = obj.get("danger_level", "LOW")
            color  = DANGER_COLORS_BGR.get(level, (135, 255, 0))

            # Corner bounding box
            draw_corner_box(out, x1, y1, x2, y2, color)

            # Label: #ID class conf | distance
            parts = []
            obj_id = obj.get("id") or obj.get("track_id")
            if obj_id:
                parts.append(f"#{obj_id}")
            parts.append(obj.get("label_vi") or obj.get("class_name", "obj"))
            conf = obj.get("confidence", 0)
            parts.append(f"{conf:.0%}")
            dist = obj.get("distance_label", "")
            if dist:
                parts.append(f"| {dist}")

            put_label(out, " ".join(parts), x1, y1, color)

            # Direction arrow for approaching objects
            direction = obj.get("direction", "")
            if direction == "approaching":
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2
                draw_direction_arrow(out, (cx, cy), "approaching", color)

        # HUD overlay (top bar + bottom warning)
        draw_danger_hud(out, result.get("summary", {}), len(result.get("objects", [])), ms)

        return out

    def _serialize(self, obj: Dict) -> Dict:
        """Serialize a tracked+analyzed object to JSON-safe dict."""
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

    def _deserialize_for_annotate(self, obj: Dict) -> Dict:
        """Re-map serialized object keys back to annotate-compatible format."""
        return {
            **obj,
            "track_id": obj.get("id", 0),
        }