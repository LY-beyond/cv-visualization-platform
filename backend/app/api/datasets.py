"""数据集接口：列表、详情、类别与样本。"""

from typing import List, Optional

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from app.core.response import ApiResponse, ok
from app.datasets.registry import dataset_registry
from app.schemas.dataset import DatasetDetail, DatasetMeta, SampleList

router = APIRouter(prefix="/datasets", tags=["数据集"])


@router.get("", response_model=ApiResponse[List[DatasetMeta]])
def list_datasets(chapter: Optional[str] = Query(default=None, description="按章节标识过滤")):
    items = dataset_registry.list_meta()
    if chapter:
        items = [item for item in items if item.chapter == chapter]
    return ok(items)


@router.get("/{dataset_id}", response_model=ApiResponse[DatasetDetail])
def get_dataset(dataset_id: str):
    dataset = dataset_registry.get(dataset_id)
    return ok(dataset.detail())


@router.get("/{dataset_id}/classes", response_model=ApiResponse[List[str]])
def get_classes(dataset_id: str):
    return ok(dataset_registry.get(dataset_id).meta.class_names)


@router.get("/{dataset_id}/samples", response_model=ApiResponse[SampleList])
def list_samples(
    dataset_id: str,
    split: str = Query(default="train"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=24, ge=1, le=200),
):
    return ok(dataset_registry.get(dataset_id).list_samples(split, offset, limit))


@router.get("/{dataset_id}/samples/{split}/{index}/image")
def get_sample_image(dataset_id: str, split: str, index: int):
    path = dataset_registry.get(dataset_id).image_path(index, split)
    return FileResponse(path)
