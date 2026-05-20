import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Paths
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
MODEL_DIR = BASE_DIR / "models"

YOLO_MODEL_PATH = MODEL_DIR / "yolo" / "best.pt"
MIDAS_MODEL_PATH = MODEL_DIR / "depth" / "midas.pt"

# Create dirs
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Processing
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
FRAME_SKIP = 2          # Process every Nth frame for video
CONFIDENCE_THRESHOLD = 0.45
IOU_THRESHOLD = 0.45
IMAGE_SIZE = 640

# Danger thresholds
DANGER_WEIGHTS = {
    "object": 0.4,
    "distance": 0.3,
    "speed": 0.2,
    "direction": 0.1,
}

OBJECT_DANGER_SCORE = {
    "person": 0.6,
    "bicycle": 0.5,
    "motorcycle": 0.8,
    "car": 0.85,
    "truck": 1.0,
    "bus": 0.95,
    "train": 1.0,
    "dog": 0.4,
    "pothole": 0.7,
    "obstacle": 0.75,
    "traffic_sign": 0.3,
    "default": 0.5,
}

DANGER_LEVELS = {
    "LOW": (0.0, 0.35),
    "MEDIUM": (0.35, 0.60),
    "HIGH": (0.60, 0.80),
    "CRITICAL": (0.80, 1.01),
}

# TTS
TTS_LANG = "vi"
TTS_SLOW = False

# CORS
ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]