import shutil
import uuid
import asyncio
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from app.pipeline import SmartNavigationPipeline
from app.config import UPLOAD_DIR

router = APIRouter()

ALLOWED_VIDEO = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
_progress_store: dict = {}


@router.post("/upload/video")
async def upload_video(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO:
        raise HTTPException(400, f"Unsupported format: {ext}")

    file_id = str(uuid.uuid4())[:8]
    save_path = UPLOAD_DIR / f"{file_id}{ext}"

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    _progress_store[file_id] = 0

    async def update_progress(pct: int):
        _progress_store[file_id] = pct

    try:
        pipeline = SmartNavigationPipeline.get_instance()
        result = await pipeline.process_video(str(save_path), progress_callback=update_progress)
        _progress_store[file_id] = 100
        result["file_id"] = file_id
        return JSONResponse(result)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/progress/{file_id}")
async def get_progress(file_id: str):
    return {"progress": _progress_store.get(file_id, 0)}