"""模型注册表：新增模型只登记标识与实现入口。"""

from typing import Dict, List

from app.core.exceptions import NotFoundError
from app.models.base import BaseModelHandler
from app.schemas.model import ModelDetail, ModelMeta


class ModelRegistry:
    def __init__(self) -> None:
        self._items: Dict[str, BaseModelHandler] = {}

    def register(self, handler: BaseModelHandler) -> None:
        if handler.meta.id in self._items:
            raise ValueError(f"模型标识重复: {handler.meta.id}")
        self._items[handler.meta.id] = handler

    def list_meta(self) -> List[ModelMeta]:
        return [item.meta for item in self._items.values()]

    def get(self, model_id: str) -> BaseModelHandler:
        handler = self._items.get(model_id)
        if handler is None:
            raise NotFoundError(f"模型未注册: {model_id}")
        return handler

    def detail(self, model_id: str) -> ModelDetail:
        return self.get(model_id).detail()


model_registry = ModelRegistry()
