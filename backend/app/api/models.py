"""模型接口：列表与详情（含元信息卡片与超参数范围）。"""

from typing import List, Optional

from fastapi import APIRouter, Query

from app.core.response import ApiResponse, ok
from app.models.registry import model_registry
from app.schemas.model import ModelDetail, ModelMeta

router = APIRouter(prefix="/models", tags=["模型"])


@router.get("", response_model=ApiResponse[List[ModelMeta]])
def list_models(
    chapter: Optional[str] = Query(default=None, description="按章节标识过滤"),
    dataset_id: Optional[str] = Query(default=None, description="按适用数据集过滤"),
):
    items = model_registry.list_meta()
    if chapter:
        items = [item for item in items if item.chapter == chapter]
    if dataset_id:
        items = [item for item in items if dataset_id in item.datasets]
    return ok(items)


@router.get("/{model_id}", response_model=ApiResponse[ModelDetail])
def get_model(model_id: str):
    return ok(model_registry.detail(model_id))
