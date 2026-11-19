"""FastAPI 应用入口。"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.core.config import API_PREFIX, APP_NAME, APP_VERSION, ASSETS_DIR, CORS_ORIGINS
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.paths import ensure_directories


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_directories()
    setup_logging()
    yield


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="基于《计算机视觉》课程课件的交互式教学可视化平台后端",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(api_router, prefix=API_PREFIX)

ensure_directories()
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


@app.get("/api/health", tags=["系统"])
def health() -> dict:
    return {"code": 0, "message": "ok", "data": {"name": APP_NAME, "version": APP_VERSION}}


@app.get("/", include_in_schema=False)
def index() -> dict:
    return {"code": 0, "message": "ok", "data": {"docs": "/docs", "api": API_PREFIX}}
