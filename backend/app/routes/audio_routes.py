from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from app.config import OUTPUT_DIR

router = APIRouter()


@router.get("/audio/{filename}")
async def get_audio(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Audio file not found")
    return FileResponse(str(path), media_type="audio/mpeg")


@router.get("/image/{filename}")
async def get_image(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Image file not found")
    return FileResponse(str(path), media_type="image/jpeg")


@router.get("/video/{filename}")
async def get_video(filename: str, request: Request):
    """
    Serve video with HTTP Range support so browsers can seek/stream.
    Chrome and Firefox require Range requests for <video> tag playback.
    """
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(404, f"Video not found: {filename}")

    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        # Parse Range: bytes=start-end
        try:
            range_value = range_header.strip().replace("bytes=", "")
            start_str, end_str = range_value.split("-")
            start = int(start_str)
            end   = int(end_str) if end_str else file_size - 1
        except (ValueError, AttributeError):
            raise HTTPException(416, "Invalid Range header")

        if start >= file_size or end >= file_size or start > end:
            raise HTTPException(416, "Range Not Satisfiable")

        chunk_size   = end - start + 1
        headers      = {
            "Content-Range":  f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges":  "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type":   "video/mp4",
        }

        def iter_file(start: int, end: int):
            with open(path, "rb") as f:
                f.seek(start)
                remaining = end - start + 1
                chunk = 1024 * 256   # 256 KB chunks
                while remaining > 0:
                    data = f.read(min(chunk, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_file(start, end),
            status_code=206,
            headers=headers,
            media_type="video/mp4",
        )

    # No Range header — serve full file
    return FileResponse(
        str(path),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
    )
