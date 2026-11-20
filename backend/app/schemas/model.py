"""模型元信息：供前端生成模型卡片与超参数表单。"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ParamSpec

ModelLevel = Literal["trainable", "pretrained", "structure"]


class PreprocessSpec(BaseModel):
    """推理预处理约定，字段命名与前端 modelConfig.ts 保持一致。"""

    input_size: List[int] = Field(default_factory=list, description="[高, 宽]")
    channel_order: Literal["RGB", "BGR"] = "RGB"
    mean: List[float] = Field(default_factory=list)
    std: List[float] = Field(default_factory=list)
    resize: Literal["letterbox", "stretch", "center_crop"] = "letterbox"


class MetricEntry(BaseModel):
    """预训练模型的评测指标。"""

    name: str
    value: float
    note: str = ""


class ModelMeta(BaseModel):
    id: str
    name: str
    alias: Optional[str] = None
    chapter: str
    task: str
    level: ModelLevel
    year: Optional[int] = None
    venue: Optional[str] = None
    paper_url: Optional[str] = None
    code_url: Optional[str] = None
    innovation: str = ""
    params: str = ""
    structure_note: str = ""
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    datasets: List[str] = Field(default_factory=list)
    hyperparams: List[ParamSpec] = Field(default_factory=list)
    weight_path: Optional[str] = None
    preprocess: Optional[PreprocessSpec] = None
    labels: List[str] = Field(default_factory=list)
    metrics: List[MetricEntry] = Field(default_factory=list)
    implemented: bool = False


class ModelDetail(ModelMeta):
    input_shape: Optional[str] = None
    training_note: str = ""
