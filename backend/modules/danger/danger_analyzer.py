from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

OBJECT_WEIGHTS = {
    "person": 0.55,
    "bicycle": 0.45,
    "motorcycle": 0.75,
    "car": 0.80,
    "truck": 1.00,
    "bus": 0.90,
    "train": 1.00,
    "dog": 0.35,
    "cat": 0.25,
    "pothole": 0.65,
    "obstacle": 0.70,
    "traffic_sign": 0.25,
    "traffic_light": 0.20,
    "default": 0.45,
}

DISTANCE_WEIGHTS = {
    "very_close": 1.0,
    "close": 0.75,
    "medium": 0.45,
    "far": 0.20,
    "very_far": 0.05,
}

DANGER_LEVELS = [
    ("CRITICAL", 0.78),
    ("HIGH", 0.55),
    ("MEDIUM", 0.30),
    ("LOW", 0.0),
]

DANGER_COLORS = {
    "LOW": "#00ff6a",
    "MEDIUM": "#ffd000",
    "HIGH": "#ff6b00",
    "CRITICAL": "#ff0040",
}

DIRECTION_VI = {
    "approaching": "đang tiến về phía bạn",
    "receding": "đang ra xa",
    "stationary": "đứng yên",
    "unknown": "",
}


class DangerAnalyzer:
    def __init__(self):
        pass

    def analyze(self, tracked_objects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for obj in tracked_objects:
            score, level = self._compute_danger(obj)
            obj["danger_score"] = round(score, 3)
            obj["danger_level"] = level
            obj["danger_color"] = DANGER_COLORS[level]
            obj["warning_text"] = self._generate_warning(obj)
            results.append(obj)

        results.sort(key=lambda x: x["danger_score"], reverse=True)
        return results

    def _compute_danger(self, obj: Dict) -> Tuple[float, str]:
        cls = obj.get("class_name", "default")
        obj_w = OBJECT_WEIGHTS.get(cls, OBJECT_WEIGHTS["default"])

        dist_key = obj.get("distance_key", "medium")
        dist_w = DISTANCE_WEIGHTS.get(dist_key, 0.45)

        speed_score = obj.get("speed_score", 0.2)

        direction = obj.get("direction", "unknown")
        dir_w = 1.0 if direction == "approaching" else (0.5 if direction == "stationary" else 0.3)

        score = (
            0.40 * obj_w
            + 0.30 * dist_w
            + 0.20 * speed_score
            + 0.10 * dir_w
        )
        score = min(score, 1.0)

        level = "LOW"
        for lvl, threshold in DANGER_LEVELS:
            if score >= threshold:
                level = lvl
                break

        return score, level

    def _generate_warning(self, obj: Dict) -> str:
        label = obj.get("label_vi", "vật thể")
        dist = obj.get("distance_label", "")
        direction = DIRECTION_VI.get(obj.get("direction", "unknown"), "")
        speed = obj.get("speed_label", "")
        level = obj.get("danger_level", "LOW")

        parts = []
        if level == "CRITICAL":
            parts.append("⚠️ KHẨN CẤP!")
        elif level == "HIGH":
            parts.append("⚡ Chú ý!")

        parts.append(f"Phát hiện {label}")

        if dist:
            parts.append(f"ở khoảng cách {dist}")
        if direction:
            parts.append(direction)
        if speed and speed != "đứng yên":
            parts.append(f"({speed})")

        return " ".join(parts)

    def generate_summary(self, analyzed: List[Dict]) -> Dict[str, Any]:
        if not analyzed:
            return {
                "overall_level": "LOW",
                "overall_color": DANGER_COLORS["LOW"],
                "primary_warning": "Không phát hiện nguy hiểm. Đường đi an toàn.",
                "tts_text": "Đường đi an toàn.",
                "object_count": 0,
                "critical_count": 0,
            }

        critical = [o for o in analyzed if o["danger_level"] == "CRITICAL"]
        high = [o for o in analyzed if o["danger_level"] == "HIGH"]
        medium = [o for o in analyzed if o["danger_level"] == "MEDIUM"]

        if critical:
            overall = "CRITICAL"
        elif high:
            overall = "HIGH"
        elif medium:
            overall = "MEDIUM"
        else:
            overall = "LOW"

        top = analyzed[0]
        primary_warning = top["warning_text"]

        # TTS text (plain, no emoji)
        tts_parts = []
        for o in analyzed[:3]:
            t = o["warning_text"].replace("⚠️", "").replace("⚡", "").strip()
            tts_parts.append(t)
        tts_text = ". ".join(tts_parts) + "."

        return {
            "overall_level": overall,
            "overall_color": DANGER_COLORS[overall],
            "primary_warning": primary_warning,
            "tts_text": tts_text,
            "object_count": len(analyzed),
            "critical_count": len(critical),
            "high_count": len(high),
        }