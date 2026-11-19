"""通用数据结构：参数描述、样本引用与可视化输出。"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ParamOption(BaseModel):
    label: str
    value: Any


class ParamSpec(BaseModel):
    """可调参数的元信息，前端据此渲染参数面板。"""

    name: str
    label: str
    type: Literal["number", "slider", "select", "switch"] = "number"
    default: Any = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    step: Optional[float] = None
    options: List[ParamOption] = Field(default_factory=list)
    description: Optional[str] = None


class SampleRef(BaseModel):
    index: int
    split: str = "train"
    label: Optional[int] = None
    label_name: Optional[str] = None
    path: Optional[str] = None
    url: Optional[str] = None


class CaseOutput(BaseModel):
    """案例执行后的结构化可视化结果。"""

    images: List[Dict[str, Any]] = Field(default_factory=list)
    overlay: Optional[Dict[str, Any]] = None
    charts: List[Dict[str, Any]] = Field(default_factory=list)
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    message: str = ""
