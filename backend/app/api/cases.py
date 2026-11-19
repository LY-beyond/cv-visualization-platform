"""交互案例接口：列表、详情与执行。"""

import base64
from typing import List, Optional

from fastapi import APIRouter, Query

from app.cases.registry import case_registry
from app.core.exceptions import NotImplementedFeatureError
from app.core.response import ApiResponse, ok
from app.schemas.case import CaseMeta, CaseRequest
from app.schemas.common import CaseOutput

router = APIRouter(prefix="/cases", tags=["案例"])


@router.get("", response_model=ApiResponse[List[CaseMeta]])
def list_cases(chapter: Optional[str] = Query(default=None)):
    items = case_registry.list_meta()
    if chapter:
        items = [item for item in items if item.chapter == chapter]
    return ok(items)


@router.get("/{case_id}", response_model=ApiResponse[CaseMeta])
def get_case(case_id: str):
    return ok(case_registry.get(case_id).meta)


@router.post("/{case_id}/execute", response_model=ApiResponse[CaseOutput])
def execute_case(case_id: str, payload: CaseRequest):
    case = case_registry.get(case_id)
    if not case.meta.implemented:
        raise NotImplementedFeatureError(f"案例「{case.meta.name}」尚未接入后端计算")

    image_bytes = base64.b64decode(payload.image) if payload.image else None
    try:
        result = case.execute(payload.params, image_bytes)
    except NotImplementedError as exc:
        raise NotImplementedFeatureError(str(exc)) from exc
    return ok(result)
