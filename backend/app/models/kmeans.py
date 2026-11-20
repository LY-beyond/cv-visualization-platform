"""K-Means 聚类：手写 Lloyd 迭代，逐轮推送惯性损失与匹配准确率。

训练过程把像素拉平为特征向量，用 k-means++ 初始化簇中心，
每轮按最近中心重新分配样本并更新中心；评估时用训练得到的
簇→类别映射预测测试样本。
"""

import time
from typing import Any, Callable, Dict, List, Tuple

import numpy as np

from app.core.config import TRAIN_TIMEOUT_SECONDS
from app.datasets.base import BaseDataset
from app.models.base import BaseModelHandler
from app.models.features import flatten_images, load_split_images, project_2d
from app.schemas.model import ModelMeta
from app.schemas.training import ErrorSample, EvaluationResult, MetricPoint
from app.trainer.metrics import accuracy as compute_accuracy
from app.trainer.metrics import cluster_label_mapping, confusion_matrix

ERROR_SAMPLE_LIMIT = 12


def _kmeans_plus_plus(features: np.ndarray, k: int, rng: np.random.Generator) -> np.ndarray:
    """k-means++：按与已有中心距离的平方做概率采样，让初始中心尽量分散。"""
    count = features.shape[0]
    centers = [features[int(rng.integers(count))]]
    closest = np.sum((features - centers[0]) ** 2, axis=1)
    for _ in range(1, k):
        total = float(closest.sum())
        if total <= 0:
            centers.append(features[int(rng.integers(count))])
        else:
            index = int(rng.choice(count, p=closest / total))
            centers.append(features[index])
        closest = np.minimum(closest, np.sum((features - centers[-1]) ** 2, axis=1))
    return np.stack(centers).astype(np.float32)


def _assign(features: np.ndarray, centers: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """返回每个样本的最近簇编号与到中心的平方距离。"""
    distances = (
        np.sum(features**2, axis=1)[:, None]
        - 2.0 * features @ centers.T
        + np.sum(centers**2, axis=1)[None, :]
    )
    labels = distances.argmin(axis=1)
    nearest = distances[np.arange(features.shape[0]), labels]
    return labels, np.maximum(nearest, 0.0)


class KMeansHandler(BaseModelHandler):
    """无监督聚类：训练只使用图像特征，评估借助簇→类别映射给出分类指标。"""

    def __init__(self, meta: ModelMeta) -> None:
        super().__init__(meta)
        self._states: Dict[str, Dict[str, Any]] = {}

    def build(self, **kwargs: Any) -> Any:
        return {
            "k": int(kwargs.get("k", 8)),
            "max_iter": int(kwargs.get("max_iter", 20)),
        }

    def epochs_for(self, hyperparams: Dict[str, Any]) -> int:
        return max(1, int(hyperparams.get("max_iter", 20)))

    def train(
        self,
        dataset: BaseDataset,
        hyperparams: Dict[str, Any],
        emit: Callable[[MetricPoint], None],
    ) -> None:
        images, targets, _ = load_split_images(dataset, "train")
        if images.shape[0] == 0:
            raise ValueError("数据集缺少训练样本，请先准备 manifest.json 与图片文件")

        features = flatten_images(images)
        classes = list(dataset.meta.class_names) or [str(i) for i in range(int(targets.max()) + 1)]
        k = max(1, min(int(hyperparams.get("k", 8)), features.shape[0]))
        max_iter = max(1, int(hyperparams.get("max_iter", 20)))

        rng = np.random.default_rng(42)
        centers = _kmeans_plus_plus(features, k, rng)
        started = time.monotonic()

        for iteration in range(1, max_iter + 1):
            if time.monotonic() - started > TRAIN_TIMEOUT_SECONDS:
                raise TimeoutError(f"训练超过 {TRAIN_TIMEOUT_SECONDS} 秒上限，请减少簇数或迭代轮数")

            cluster_ids, distances = _assign(features, centers)
            updated = centers.copy()
            for cluster in range(k):
                members = features[cluster_ids == cluster]
                if members.shape[0] > 0:  # 空簇保留原中心，避免除零
                    updated[cluster] = members.mean(axis=0)
            shift = float(np.linalg.norm(updated - centers))
            centers = updated

            mapping = cluster_label_mapping(cluster_ids.tolist(), targets.tolist(), k, len(classes))
            predicted = [mapping[int(c)] for c in cluster_ids]
            emit(
                MetricPoint(
                    epoch=iteration,
                    loss=round(float(distances.mean()), 4),
                    accuracy=round(compute_accuracy(predicted, targets.tolist()), 4),
                )
            )
            if shift < 1e-4 and iteration > 1:
                break

        cluster_ids, _ = _assign(features, centers)
        mapping = cluster_label_mapping(cluster_ids.tolist(), targets.tolist(), k, len(classes))
        self._states[dataset.meta.id] = {
            "centers": centers,
            "mapping": mapping,
            "classes": classes,
            "features": features,
            "targets": targets,
        }

    def evaluate(self, dataset: BaseDataset, **kwargs: Any) -> EvaluationResult:
        state = self._states.get(dataset.meta.id)
        if state is None:
            raise NotImplementedError("K-Means 尚未在该数据集上训练，请先创建训练任务")

        images, targets, positions = load_split_images(dataset, "test")
        if images.shape[0] == 0:
            raise ValueError("数据集缺少测试样本，无法评估")

        features = flatten_images(images)
        cluster_ids, _ = _assign(features, state["centers"])
        classes: List[str] = state["classes"]
        mapping: Dict[int, int] = state["mapping"]
        predicted = [mapping[int(c)] for c in cluster_ids]

        error_samples = [
            ErrorSample(
                dataset_id=dataset.meta.id,
                index=positions[int(index)],
                true_label=classes[int(targets[index])],
                predicted_label=classes[int(predicted[index])],
                url=f"/api/datasets/{dataset.meta.id}/samples/test/{positions[int(index)]}/image",
            )
            for index in np.where(np.asarray(predicted) != targets)[0][:ERROR_SAMPLE_LIMIT]
        ]

        return EvaluationResult(
            task_id="",
            accuracy=round(compute_accuracy(predicted, targets.tolist()), 4),
            top5_accuracy=None,
            confusion_matrix=confusion_matrix(predicted, targets.tolist(), len(classes)),
            class_names=classes,
            error_samples=error_samples,
            embedding=project_2d(features, targets, classes, method="pca"),
        )
