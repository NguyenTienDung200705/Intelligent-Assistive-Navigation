import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import ALLOWED_ORIGINS, OUTPUT_DIR
from app.routes import image_routes, video_routes, audio_routes, stream_routes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Warming up AI pipeline ...")
    from app.pipeline import SmartNavigationPipeline
    SmartNavigationPipeline.get_instance()
    logger.info("SmartNav API ready.")
    yield
    logger.info("SmartNav API shutting down.")


app = FastAPI(
    title="Smart Navigation & Danger Detection API",
    description="AI-powered navigation — YOLO26 + ByteTrack + MiDaS + TTS-VI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")

app.include_router(image_routes.router,  tags=["Image"])
app.include_router(video_routes.router,  tags=["Video"])
app.include_router(audio_routes.router,  tags=["Media"])
app.include_router(stream_routes.router, tags=["Stream"])


@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "service": "SmartNavigation API v1.0",
        "models": {
            "detector": "YOLO26 (WOTR fine-tune)",
            "tracker": "ByteTrack",
            "depth": "MiDaS Small",
            "tts": "gTTS Vietnamese",
        },
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Smart Navigation & Danger Detection System",
        "docs": "/docs",
        "health": "/health",
        "websocket": "ws://localhost:8000/ws/stream",
    }