"""交互案例元信息与执行请求。"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ParamSpec


class CaseMeta(BaseModel):
    id: str
    name: str
    chapter: str
    description: str
    implementation: Literal["backend", "frontend", "hybrid"] = "backend"
    params: List[ParamSpec] = Field(default_factory=list)
    implemented: bool = False


class CaseRequest(BaseModel):
    params: Dict[str, Any] = Field(default_factory=dict)
    image: Optional[str] = Field(default=None, description="base64 编码图片；为空则使用内置示例")
    dataset_id: Optional[str] = None
    sample_index: Optional[int] = None
