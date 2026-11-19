"""统一模型契约。

按模型级别实现 train（现场训练类）或 predict/evaluate（预训练推理类），
结构展示类只需提供元信息。
"""

from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Protocol

from app.datasets.base import BaseDataset
from app.schemas.model import ModelMeta, ModelDetail
from app.schemas.training import EvaluationResult, MetricPoint, TrainEvent


class EventEmitter(Protocol):
    def __call__(self, event: TrainEvent) -> None: ...


class BaseModelHandler(ABC):
    """模型统一接口，未实现的级别允许抛出 NotImplementedError。"""

    def __init__(self, meta: ModelMeta) -> None:
        self.meta = meta

    def detail(self) -> ModelDetail:
        return ModelDetail(**self.meta.model_dump(), training_note=self.training_note())

    def training_note(self) -> str:
        if self.meta.level == "trainable":
            return "现场训练类：在小样本上短时训练，通过 SSE 推送逐轮指标。"
        if self.meta.level == "pretrained":
            return "预训练推理类：离线训练并保存权重与历史，平台仅加载推理。"
        return "结构展示类：仅展示网络结构与创新点，不提供训练与推理。"

    @abstractmethod
    def build(self, **kwargs: Any) -> Any:
        """按配置构建模型。"""

    def train(
        self,
        dataset: BaseDataset,
        hyperparams: Dict[str, Any],
        emit: Callable[[MetricPoint], None],
    ) -> None:
        raise NotImplementedError("该模型暂未实现现场训练")

    def predict(self, images: List[Any], **kwargs: Any) -> List[Dict[str, Any]]:
        raise NotImplementedError("该模型暂未实现推理")

    def evaluate(self, dataset: BaseDataset, **kwargs: Any) -> EvaluationResult:
        raise NotImplementedError("该模型暂未实现评估")

    def extract_features(self, dataset: BaseDataset, **kwargs: Any) -> List[Dict[str, Any]]:
        raise NotImplementedError("该模型暂未实现特征提取")
