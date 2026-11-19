"""数据集子系统：注册表与内置小样本实现。"""

from app.datasets import builtin  # noqa: F401  触发内置数据集注册
from app.datasets.registry import dataset_registry

__all__ = ["dataset_registry"]
