"""
WebSocket endpoint for real-time camera stream processing.

Protocol:
  Client → Server : raw JPEG bytes (one frame per message)
  Server → Client : JSON with:
      {
        "objects":              [...],        # detected objects with danger info
        "summary":              {...},        # overall danger level + warning text
        "audio_file":           "tts_xxx.mp3" | null,
        "annotated_frame_b64":  "<base64 JPEG>",   # frame with bounding boxes
        "processing_time_ms":   45.2
      }

Frontend usage:
  1. Draw annotated_frame_b64 onto a <canvas> element
  2. Play audio_file via <audio> when it changes
  3. Show objects / summary in the UI
"""
import json
import logging
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.pipeline import SmartNavigationPipeline

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/stream")
async def websocket_stream(ws: WebSocket):
    await ws.accept()
    pipeline     = SmartNavigationPipeline.get_instance()
    last_audio   = None   # Track last audio file to avoid re-sending same clip
    frame_count  = 0

    logger.info("WebSocket camera client connected")

    try:
        while True:
            # ── Receive raw JPEG bytes from client ──────────────────────
            data = await ws.receive_bytes()
            frame_count += 1

            # ── Process frame (detect → depth → track → danger → annotate) ──
            result = pipeline.process_frame_bytes(data)

            if "error" in result:
                await ws.send_text(json.dumps({"error": result["error"]}))
                continue

            # ── Only send audio_file when it changes (avoids repeat playback) ──
            audio = result.get("audio_file")
            if audio == last_audio:
                result["audio_file"] = None   # tell frontend: don't replay
            else:
                last_audio = audio

            # ── Send result JSON (includes annotated_frame_b64) ─────────
            await ws.send_text(json.dumps(result, ensure_ascii=False))

            # Yield to event loop so other coroutines can run
            await asyncio.sleep(0)

    except WebSocketDisconnect:
        logger.info(f"WebSocket camera client disconnected after {frame_count} frames")

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await ws.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass