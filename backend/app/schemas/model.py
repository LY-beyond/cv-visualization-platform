"""模型元信息：供前端生成模型卡片与超参数表单。"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ParamSpec

ModelLevel = Literal["trainable", "pretrained", "structure"]


class ModelMeta(BaseModel):
    id: str
    name: str
    alias: Optional[str] = None
    chapter: str
    task: str
    level: ModelLevel
    year: Optional[int] = None
    innovation: str = ""
    params: str = ""
    structure_note: str = ""
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    datasets: List[str] = Field(default_factory=list)
    hyperparams: List[ParamSpec] = Field(default_factory=list)
    weight_path: Optional[str] = None
    implemented: bool = False


class ModelDetail(ModelMeta):
    input_shape: Optional[str] = None
    training_note: str = ""
