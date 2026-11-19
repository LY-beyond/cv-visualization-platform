"""推理接口：对示例样本或上传图片执行预测。"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional

from app.core.exceptions import NotImplementedFeatureError
from app.core.response import ApiResponse, ok
from app.models.registry import model_registry

router = APIRouter(prefix="/inference", tags=["推理"])


class InferenceRequest(BaseModel):
    model_id: str
    dataset_id: Optional[str] = None
    sample_index: Optional[int] = None
    image: Optional[str] = Field(default=None, description="base64 编码图片")
    params: Dict[str, Any] = Field(default_factory=dict)


@router.post("", response_model=ApiResponse[Dict[str, Any]])
def run_inference(payload: InferenceRequest):
    handler = model_registry.get(payload.model_id)
    if not handler.meta.implemented:
        raise NotImplementedFeatureError(f"模型「{handler.meta.name}」尚未接入推理实现")
    results = handler.predict([], **payload.params)
    return ok({"model_id": payload.model_id, "items": results})
