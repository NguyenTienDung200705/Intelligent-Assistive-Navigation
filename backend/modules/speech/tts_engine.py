"""
Multi-backend TTS engine with graceful fallback:
  1. gTTS  (Google, requires internet)
  2. pyttsx3 / eSpeak-ng (offline, always available if installed)
"""
import hashlib
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

_LEVEL_TEXTS = {
    "LOW":      "Đường đi an toàn. Không có nguy hiểm.",
    "MEDIUM":   "Chú ý! Phát hiện vật thể phía trước.",
    "HIGH":     "Cảnh báo nguy hiểm! Có phương tiện đang tiến gần. Hãy chú ý.",
    "CRITICAL": "Khẩn cấp! Nguy hiểm nghiêm trọng phía trước. Dừng ngay lập tức!",
}


class TTSEngine:
    def __init__(self, lang: str = "vi"):
        self.lang = lang
        self._cache: dict = {}

    # ── Public ──────────────────────────────────────────────────────────

    def synthesize(self, text: str) -> str | None:
        if not text or not text.strip():
            return None
        text = text.strip()

        # Cache hit
        if text in self._cache:
            fname = self._cache[text]
            if (OUTPUT_DIR / fname).exists():
                return fname

        key  = hashlib.md5(text.encode()).hexdigest()[:14]
        fname = f"tts_{key}.mp3"
        fpath = OUTPUT_DIR / fname

        if fpath.exists() and fpath.stat().st_size > 500:
            self._cache[text] = fname
            return fname

        # Try gTTS first (best quality), fallback to eSpeak
        ok = self._gtts(text, fpath) or self._espeak(text, fpath)

        if ok and fpath.exists():
            self._cache[text] = fname
            logger.info(f"TTS ready: {fname}")
            return fname

        logger.error(f"TTS failed for: {text[:60]}")
        return None

    def synthesize_level(self, level: str) -> str | None:
        return self.synthesize(_LEVEL_TEXTS.get(level, _LEVEL_TEXTS["LOW"]))

    # ── Backends ────────────────────────────────────────────────────────

    def _gtts(self, text: str, fpath: Path) -> bool:
        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang=self.lang, slow=False)
            tts.save(str(fpath))
            ok = fpath.exists() and fpath.stat().st_size > 1000
            if not ok:
                fpath.unlink(missing_ok=True)
            return ok
        except Exception as e:
            logger.debug(f"gTTS failed: {e}")
            fpath.unlink(missing_ok=True)
            return False

    def _espeak(self, text: str, fpath: Path) -> bool:
        try:
            import pyttsx3
            engine = pyttsx3.init()
            voices = engine.getProperty("voices")
            vi_voice = next((v for v in voices if "vi" in v.id.lower()), None)
            if vi_voice:
                engine.setProperty("voice", vi_voice.id)
            engine.setProperty("rate", 145)
            engine.setProperty("volume", 1.0)

            wav = str(fpath).replace(".mp3", ".wav")
            engine.save_to_file(text, wav)
            engine.runAndWait()
            engine.stop()

            if os.path.exists(wav) and os.path.getsize(wav) > 500:
                # Try ffmpeg wav→mp3
                ret = os.system(f'ffmpeg -y -i "{wav}" -ar 22050 -ac 1 -q:a 4 "{fpath}" -loglevel quiet 2>/dev/null')
                os.remove(wav)
                if not (fpath.exists() and fpath.stat().st_size > 500):
                    # ffmpeg failed — rename wav as mp3 (still playable by browsers)
                    wav2 = wav  # already removed; regenerate
                    engine2 = pyttsx3.init()
                    if vi_voice:
                        engine2.setProperty("voice", vi_voice.id)
                    engine2.setProperty("rate", 145)
                    engine2.save_to_file(text, str(fpath))
                    engine2.runAndWait()
                    engine2.stop()
                return fpath.exists() and fpath.stat().st_size > 500
            return False
        except Exception as e:
            logger.debug(f"eSpeak failed: {e}")
            return False