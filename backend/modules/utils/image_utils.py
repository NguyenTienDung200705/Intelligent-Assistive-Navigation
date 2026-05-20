import cv2
import numpy as np
from pathlib import Path
from typing import Optional


def load_image(path: str) -> Optional[np.ndarray]:
    img = cv2.imread(path)
    if img is None:
        # Try with PIL fallback for HEIC/unusual formats
        try:
            from PIL import Image
            pil = Image.open(path).convert("RGB")
            img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
        except Exception:
            return None
    return img


def save_image(img: np.ndarray, path: str, quality: int = 92) -> bool:
    try:
        ext = Path(path).suffix.lower()
        if ext in (".jpg", ".jpeg"):
            cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, quality])
        elif ext == ".png":
            cv2.imwrite(path, img, [cv2.IMWRITE_PNG_COMPRESSION, 6])
        else:
            cv2.imwrite(path, img)
        return True
    except Exception:
        return False


def resize_keep_aspect(img: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    h, w = img.shape[:2]
    scale = min(target_w / w, target_h / h)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)


def pad_to_square(img: np.ndarray, pad_value: int = 0) -> np.ndarray:
    h, w = img.shape[:2]
    if h == w:
        return img
    side = max(h, w)
    canvas = np.full((side, side, img.shape[2] if len(img.shape) == 3 else 1), pad_value, dtype=img.dtype)
    y_off = (side - h) // 2
    x_off = (side - w) // 2
    canvas[y_off:y_off+h, x_off:x_off+w] = img
    return canvas


def image_to_base64(img: np.ndarray, ext: str = ".jpg") -> str:
    import base64
    _, buf = cv2.imencode(ext, img)
    return base64.b64encode(buf.tobytes()).decode("utf-8")