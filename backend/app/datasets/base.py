"""统一数据集契约。

新增数据集只需继承 BaseDataset，实现元信息与样本访问，并在注册表登记。
"""

import json
from abc import ABC
from pathlib import Path
from typing import Dict, List, Optional

from app.core.exceptions import NotFoundError
from app.core.paths import dataset_dir, dataset_manifest
from app.schemas.dataset import DatasetDetail, DatasetMeta, SampleList
from app.schemas.common import SampleRef


class BaseDataset(ABC):
    """数据集统一接口：元信息、类别、样本获取。"""

    def __init__(self, meta: DatasetMeta) -> None:
        self.meta = meta

    def detail(self) -> DatasetDetail:
        splits = self.split_sizes()
        return DatasetDetail(
            **self.meta.model_dump(),
            splits=splits,
            notes=[
                "样本按类别分目录存放，配套 manifest.json 记录路径与标签。",
                "首次运行前可将内置小样本放入 storage/datasets/<数据集标识>/ 目录。",
            ],
        )

    def split_sizes(self) -> Dict[str, int]:
        return {}

    def list_samples(self, split: str = "train", offset: int = 0, limit: int = 24) -> SampleList:
        items = self._samples(split)
        page = items[offset : offset + limit]
        return SampleList(
            dataset_id=self.meta.id,
            split=split,
            total=len(items),
            items=[self._to_ref(split, index, raw) for index, raw in page],
        )

    def get_sample(self, index: int, split: str = "train") -> SampleRef:
        items = self._samples(split)
        if index < 0 or index >= len(items):
            raise NotFoundError(f"样本不存在: {self.meta.id}/{split}/{index}")
        return self._to_ref(split, index, items[index])

    def image_path(self, index: int, split: str = "train") -> Path:
        items = self._samples(split)
        if index < 0 or index >= len(items):
            raise NotFoundError(f"样本不存在: {self.meta.id}/{split}/{index}")
        relative = items[index].get("path")
        if not relative:
            raise NotFoundError(f"样本缺少图片文件: {self.meta.id}/{split}/{index}")
        path = (dataset_dir(self.meta.id) / relative).resolve()
        root = dataset_dir(self.meta.id).resolve()
        if root not in path.parents:
            raise NotFoundError("非法的样本路径")
        if not path.exists():
            raise NotFoundError(f"样本图片尚未准备: {path.name}")
        return path

    def _samples(self, split: str) -> List[dict]:
        manifest_path = dataset_manifest(self.meta.id)
        if not manifest_path.exists():
            return []
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        return payload.get("splits", {}).get(split, [])

    def _to_ref(self, split: str, index: int, raw: dict) -> SampleRef:
        label = raw.get("label")
        classes = self.meta.class_names
        label_name: Optional[str] = None
        if isinstance(label, int) and 0 <= label < len(classes):
            label_name = classes[label]
        return SampleRef(
            index=index,
            split=split,
            label=label,
            label_name=label_name,
            path=raw.get("path"),
            url=f"/api/datasets/{self.meta.id}/samples/{split}/{index}/image",
        )
