"""数据集注册表：新增数据集只登记，不改调用方代码。"""

from typing import Dict, List

from app.core.exceptions import NotFoundError
from app.datasets.base import BaseDataset
from app.schemas.dataset import DatasetMeta


class DatasetRegistry:
    def __init__(self) -> None:
        self._items: Dict[str, BaseDataset] = {}

    def register(self, dataset: BaseDataset) -> None:
        if dataset.meta.id in self._items:
            raise ValueError(f"数据集标识重复: {dataset.meta.id}")
        self._items[dataset.meta.id] = dataset

    def list_meta(self) -> List[DatasetMeta]:
        return [item.meta for item in self._items.values()]

    def get(self, dataset_id: str) -> BaseDataset:
        dataset = self._items.get(dataset_id)
        if dataset is None:
            raise NotFoundError(f"数据集未注册: {dataset_id}")
        return dataset


dataset_registry = DatasetRegistry()
