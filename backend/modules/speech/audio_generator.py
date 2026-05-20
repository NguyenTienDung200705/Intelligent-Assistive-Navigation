"""
Utility for generating and caching TTS audio files.
Wraps gTTS with local disk caching.
"""
import hashlib
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def generate_audio(text: str, lang: str = "vi", slow: bool = False) -> str | None:
    """
    Generate a TTS mp3 for `text`. Returns filename (not full path).
    Returns None on failure.
    """
    if not text or not text.strip():
        return None

    key = hashlib.md5(f"{lang}:{text}".encode()).hexdigest()[:14]
    filename = f"tts_{key}.mp3"
    filepath = OUTPUT_DIR / filename

    if filepath.exists():
        logger.debug(f"TTS cache hit: {filename}")
        return filename

    try:
        from gtts import gTTS
        tts = gTTS(text=text.strip(), lang=lang, slow=slow)
        tts.save(str(filepath))
        logger.info(f"✅ TTS generated: {filename}")
        return filename
    except Exception as e:
        logger.error(f"❌ TTS generation failed: {e}")
        return None


def pregenerate_warnings() -> None:
    """Pre-generate common warning phrases at startup."""
    phrases = [
        "Đường đi an toàn. Không có nguy hiểm.",
        "Chú ý! Phát hiện vật thể ở phía trước.",
        "Cảnh báo nguy hiểm! Có phương tiện đang tiến gần. Hãy chú ý.",
        "Khẩn cấp! Nguy hiểm nghiêm trọng phía trước. Dừng ngay lập tức!",
    ]
    for p in phrases:
        generate_audio(p)
    logger.info("✅ Common warnings pre-generated.")