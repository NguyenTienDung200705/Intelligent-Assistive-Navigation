"""
SmartNav Backend Tests
Run: python -m pytest tests/ -v
"""
import sys
import os
import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# ── Geometry ────────────────────────────────────────────────────────────────

def test_bbox_iou_perfect_overlap():
    from modules.utils.geometry import bbox_iou
    box = [0, 0, 100, 100]
    assert bbox_iou(box, box) == pytest.approx(1.0)


def test_bbox_iou_no_overlap():
    from modules.utils.geometry import bbox_iou
    assert bbox_iou([0, 0, 50, 50], [60, 60, 110, 110]) == pytest.approx(0.0)


def test_bbox_center():
    from modules.utils.geometry import bbox_center
    assert bbox_center([0, 0, 100, 100]) == (50, 50)


def test_nms_removes_duplicate():
    from modules.utils.geometry import nms
    dets = [
        {"bbox": [0,0,100,100], "confidence": 0.95},
        {"bbox": [5,5,105,105], "confidence": 0.80},   # overlaps heavily
        {"bbox": [200,200,300,300], "confidence": 0.70},  # no overlap
    ]
    kept = nms(dets, iou_thresh=0.5)
    assert len(kept) == 2


# ── Depth distance ──────────────────────────────────────────────────────────

def test_score_to_zone_very_close():
    from modules.depth.distance_utils import score_to_zone
    key, label = score_to_zone(0.92)
    assert key == "very_close"
    assert label == "rất gần"


def test_score_to_zone_far():
    from modules.depth.distance_utils import score_to_zone
    key, _ = score_to_zone(0.10)
    assert key == "very_far"


def test_relative_distance_large_bbox():
    from modules.depth.distance_utils import estimate_relative_distance_from_bbox
    score, zone, _ = estimate_relative_distance_from_bbox([0, 0, 640, 480], 640, 480)
    assert score >= 0.80
    assert zone == "very_close"


# ── Danger Analyzer ─────────────────────────────────────────────────────────

def _make_obj(**kw):
    base = {
        "class_name": "car", "label_vi": "ô tô",
        "confidence": 0.9, "bbox": [100,100,300,300], "center": [200,200],
        "distance_key": "medium", "distance_label": "trung bình",
        "depth_score": 0.5, "track_id": 1,
        "direction": "stationary", "speed_label": "đứng yên", "speed_score": 0.1,
    }
    base.update(kw)
    return base


def test_danger_level_low():
    from modules.danger.danger_analyzer import DangerAnalyzer
    da = DangerAnalyzer()
    obj = _make_obj(class_name="cat", distance_key="very_far", depth_score=0.05)
    result = da.analyze([obj])
    assert result[0]["danger_level"] in ("LOW", "MEDIUM")


def test_danger_level_critical():
    from modules.danger.danger_analyzer import DangerAnalyzer
    da = DangerAnalyzer()
    obj = _make_obj(
        class_name="truck",
        distance_key="very_close", depth_score=0.95,
        direction="approaching", speed_score=0.95,
    )
    result = da.analyze([obj])
    assert result[0]["danger_level"] == "CRITICAL"


def test_summary_no_objects():
    from modules.danger.danger_analyzer import DangerAnalyzer
    da = DangerAnalyzer()
    s = da.generate_summary([])
    assert s["overall_level"] == "LOW"
    assert s["object_count"] == 0


def test_warning_text_generated():
    from modules.danger.danger_analyzer import DangerAnalyzer
    da = DangerAnalyzer()
    obj = _make_obj(distance_key="close", depth_score=0.7)
    result = da.analyze([obj])
    assert len(result[0]["warning_text"]) > 10


# ── Tracker ─────────────────────────────────────────────────────────────────

def test_tracker_assigns_ids():
    from modules.tracker.bytetrack import SimpleTracker
    t = SimpleTracker()
    dets = [
        {"class_name": "person", "label_vi": "người", "confidence": 0.9,
         "bbox": [0,0,100,100], "center": [50,50], "area": 10000,
         "distance_key": "medium", "distance_label": "trung bình"},
    ]
    tracked = t.update(dets)
    assert len(tracked) == 1
    assert tracked[0]["track_id"] >= 1


def test_tracker_persistent_id():
    from modules.tracker.bytetrack import SimpleTracker
    t = SimpleTracker()

    det = lambda cx, cy: [{
        "class_name": "car", "label_vi": "ô tô", "confidence": 0.9,
        "bbox": [cx-50, cy-50, cx+50, cy+50], "center": [cx, cy], "area": 10000,
        "distance_key": "medium", "distance_label": "trung bình",
    }]

    r1 = t.update(det(200, 200))
    id1 = r1[0]["track_id"]

    r2 = t.update(det(205, 205))   # slight movement → same ID
    assert r2[0]["track_id"] == id1


# ── Depth Estimator fallback ─────────────────────────────────────────────────

def test_depth_gradient_fallback():
    from modules.depth.depth_estimator import DepthEstimator
    de = DepthEstimator(model_path=None)
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    depth = de._gradient_fallback(frame)
    assert depth.shape == (480, 640)
    assert depth[0, 0] < depth[-1, 0]   # top=far, bottom=near


def test_depth_region_extraction():
    from modules.depth.depth_estimator import DepthEstimator
    de = DepthEstimator(model_path=None)
    depth = np.ones((480, 640), dtype=np.float32) * 0.85
    score, key, label = de.get_region_depth(depth, [100, 100, 300, 300])
    assert score == pytest.approx(0.85, abs=0.05)
    assert key == "very_close"


# ── Image utils ─────────────────────────────────────────────────────────────

def test_image_to_base64():
    from modules.utils.image_utils import image_to_base64
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    b64 = image_to_base64(img)
    assert len(b64) > 100
    assert isinstance(b64, str)


def test_resize_keep_aspect():
    from modules.utils.image_utils import resize_keep_aspect
    img = np.zeros((1080, 1920, 3), dtype=np.uint8)
    resized = resize_keep_aspect(img, 640, 360)
    assert resized.shape[1] <= 640
    assert resized.shape[0] <= 360