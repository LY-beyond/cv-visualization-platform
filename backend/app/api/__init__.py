"""API 路由汇总。"""

from fastapi import APIRouter

from app.api import assets, cases, datasets, inference, models, training

api_router = APIRouter()
api_router.include_router(datasets.router)
api_router.include_router(models.router)
api_router.include_router(training.router)
api_router.include_router(inference.router)
api_router.include_router(cases.router)
api_router.include_router(assets.router)
