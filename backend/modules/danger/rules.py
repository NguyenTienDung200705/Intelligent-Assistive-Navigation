"""
Configurable danger scoring rules for the SmartNav system.
Adjust weights and thresholds here without touching business logic.
"""

# ── Object danger weights ──────────────────────────────────────────────────
OBJECT_WEIGHTS = {
    "person":        0.55,
    "bicycle":       0.45,
    "motorcycle":    0.75,
    "motorbike":     0.75,
    "car":           0.80,
    "truck":         1.00,
    "bus":           0.90,
    "train":         1.00,
    "dog":           0.35,
    "cat":           0.25,
    "pothole":       0.70,
    "obstacle":      0.72,
    "traffic_sign":  0.25,
    "traffic_light": 0.20,
    "stop_sign":     0.30,
    "fire_hydrant":  0.30,
    "bench":         0.15,
    "default":       0.45,
}

# ── Distance danger weights ────────────────────────────────────────────────
DISTANCE_WEIGHTS = {
    "very_close": 1.00,
    "close":      0.75,
    "medium":     0.45,
    "far":        0.20,
    "very_far":   0.05,
}

# ── Speed danger weights ───────────────────────────────────────────────────
SPEED_WEIGHTS = {
    "stationary":   0.05,
    "slow":         0.30,
    "medium_speed": 0.60,
    "fast":         1.00,
}

# ── Direction modifiers ────────────────────────────────────────────────────
DIRECTION_MODIFIERS = {
    "approaching": 1.00,
    "stationary":  0.50,
    "receding":    0.25,
    "unknown":     0.40,
}

# ── Fusion weights ─────────────────────────────────────────────────────────
FUSION_WEIGHTS = {
    "object":    0.40,
    "distance":  0.30,
    "speed":     0.20,
    "direction": 0.10,
}

# ── Level thresholds (score → level) ──────────────────────────────────────
LEVEL_THRESHOLDS = [
    ("CRITICAL", 0.78),
    ("HIGH",     0.55),
    ("MEDIUM",   0.30),
    ("LOW",      0.00),
]

# ── TTS templates (Vietnamese) ─────────────────────────────────────────────
TTS_TEMPLATES = {
    "LOW":      "Đường đi an toàn. Không có nguy hiểm.",
    "MEDIUM":   "Chú ý! Phát hiện vật thể ở phía trước.",
    "HIGH":     "Cảnh báo nguy hiểm! Có phương tiện đang tiến gần. Hãy chú ý.",
    "CRITICAL": "Khẩn cấp! Nguy hiểm nghiêm trọng phía trước. Dừng ngay lập tức!",
}