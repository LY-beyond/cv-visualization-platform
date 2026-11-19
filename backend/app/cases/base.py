"""统一案例契约：元信息 + 参数 + 执行并返回结构化可视化结果。"""

from abc import ABC, abstractmethod
from typing import Any, Dict

from app.schemas.case import CaseMeta
from app.schemas.common import CaseOutput


class BaseCase(ABC):
    def __init__(self, meta: CaseMeta) -> None:
        self.meta = meta

    @abstractmethod
    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        """执行案例计算，返回图像、叠加标注、图表与中间步骤。"""
        raise NotImplementedError
