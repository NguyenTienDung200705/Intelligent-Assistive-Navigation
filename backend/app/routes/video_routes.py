import shutil
import uuid
import asyncio
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from app.pipeline import SmartNavigationPipeline
from app.config import UPLOAD_DIR

router = APIRouter()

ALLOWED_VIDEO = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

# In-memory store: file_id → {"progress": int, "result": dict|None, "error": str|None}
_jobs: dict = {}


@router.post("/upload/video")
async def upload_video(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    """
    Upload a video for processing.
    Returns immediately with a file_id.
    Poll GET /progress/{file_id} for status.
    When progress reaches 100, GET /results/{file_id} for the full result.
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO:
        raise HTTPException(400, f"Unsupported format: {ext}. Allowed: {', '.join(ALLOWED_VIDEO)}")

    file_id   = str(uuid.uuid4())[:8]
    save_path = UPLOAD_DIR / f"{file_id}{ext}"

    # Save uploaded file to disk
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Init job state
    _jobs[file_id] = {"progress": 0, "result": None, "error": None}

    # Run processing in background so we can return immediately
    async def run_job():
        async def update_progress(pct: int):
            _jobs[file_id]["progress"] = pct

        try:
            pipeline = SmartNavigationPipeline.get_instance()
            result   = await pipeline.process_video(
                str(save_path),
                progress_callback=update_progress,
            )
            _jobs[file_id]["result"]   = result
            _jobs[file_id]["progress"] = 100
        except Exception as e:
            _jobs[file_id]["error"]    = str(e)
            _jobs[file_id]["progress"] = -1  # signal failure

    # Fire and forget background task
    asyncio.create_task(run_job())

    return JSONResponse({"file_id": file_id, "status": "processing"})


@router.get("/progress/{file_id}")
async def get_progress(file_id: str):
    """Poll for processing progress (0–100). -1 = error."""
    job = _jobs.get(file_id)
    if job is None:
        raise HTTPException(404, f"Job {file_id} not found")

    response = {
        "file_id":  file_id,
        "progress": job["progress"],
        "error":    job["error"],
    }

    # If done, include the result inline so frontend only needs one request
    if job["progress"] == 100 and job["result"]:
        response["result"] = job["result"]

    return JSONResponse(response)


@router.get("/results/{file_id}")
async def get_result(file_id: str):
    """Get full result after processing is complete."""
    job = _jobs.get(file_id)
    if job is None:
        raise HTTPException(404, f"Job {file_id} not found")
    if job["error"]:
        raise HTTPException(500, job["error"])
    if job["progress"] < 100:
        raise HTTPException(202, "Still processing")
    return JSONResponse(job["result"])