"""数据集元信息与样本结构。"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import SampleRef


class DatasetMeta(BaseModel):
    id: str
    name: str
    chapter: str
    task: str
    modality: str
    description: str
    class_names: List[str] = Field(default_factory=list)
    sample_count: int = 0
    example_image: Optional[str] = None
    source: str = "内置小样本"


class DatasetDetail(DatasetMeta):
    splits: Dict[str, int] = Field(default_factory=dict)
    notes: List[str] = Field(default_factory=list)


class SampleList(BaseModel):
    dataset_id: str
    split: str
    total: int
    items: List[SampleRef] = Field(default_factory=list)
