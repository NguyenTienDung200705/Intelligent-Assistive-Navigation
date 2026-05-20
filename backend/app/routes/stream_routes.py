"""
WebSocket endpoint for real-time frame-by-frame processing.

Client sends: raw JPEG bytes
Server sends: JSON result
"""
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.pipeline import SmartNavigationPipeline

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/stream")
async def websocket_stream(ws: WebSocket):
    await ws.accept()
    pipeline = SmartNavigationPipeline.get_instance()
    logger.info("WebSocket client connected")

    try:
        while True:
            # Receive frame bytes from client
            data = await ws.receive_bytes()
            result = pipeline.process_frame_bytes(data)
            # Send back JSON
            await ws.send_text(json.dumps(result, ensure_ascii=False))
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await ws.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass