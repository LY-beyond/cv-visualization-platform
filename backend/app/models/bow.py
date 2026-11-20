"""BoW + SVM：局部图像块聚成视觉词典，直方图量化后交给线性分类器。

流程分两个阶段（对应两个指标点）：
1. 在 8×8 局部块上训练视觉词典（MiniBatchKMeans）；
2. 每张图按词典统计直方图并训练线性 SVM。
"""

from typing import Any, Callable, Dict, List, Tuple

import numpy as np

from app.datasets.base import BaseDataset
from app.models.base import BaseModelHandler
from app.models.features import INPUT_SIZE, load_split_images, project_2d
from app.schemas.model import ModelMeta
from app.schemas.training import ErrorSample, EvaluationResult, MetricPoint
from app.trainer.metrics import accuracy as compute_accuracy
from app.trainer.metrics import confusion_matrix

PATCH_SIZE = 8
STRIDE = 4
ERROR_SAMPLE_LIMIT = 12


def _extract_patches(images: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """把每张图切成 8×8 块，返回块特征与每块所属图片编号。"""
    patches: List[np.ndarray] = []
    owners: List[int] = []
    span = range(0, INPUT_SIZE - PATCH_SIZE + 1, STRIDE)
    for image_index, image in enumerate(images):
        for y in span:
            for x in span:
                patches.append(image[y : y + PATCH_SIZE, x : x + PATCH_SIZE].reshape(-1))
                owners.append(image_index)
    if not patches:
        return np.zeros((0, PATCH_SIZE * PATCH_SIZE), dtype=np.float32), np.zeros((0,), dtype=np.int64)
    return np.asarray(patches, dtype=np.float32), np.asarray(owners, dtype=np.int64)


def _encode(
    images: np.ndarray, vocabulary: Any, vocab_size: int
) -> Tuple[np.ndarray, int]:
    """统计每张图的词频直方图并做 L1 归一化。"""
    patches, owners = _extract_patches(images)
    if patches.shape[0] == 0:
        return np.zeros((images.shape[0], vocab_size), dtype=np.float32), 0

    words = vocabulary.predict(patches)
    histograms = np.zeros((images.shape[0], vocab_size), dtype=np.float32)
    for word, owner in zip(words, owners):
        histograms[int(owner), int(word)] += 1.0

    totals = histograms.sum(axis=1, keepdims=True)
    totals[totals == 0] = 1.0
    return histograms / totals, int(patches.shape[0])


class BoWHandler(BaseModelHandler):
    """传统分类范式：局部特征 + 视觉词典 + 直方图 + 分类器。"""

    def __init__(self, meta: ModelMeta) -> None:
        super().__init__(meta)
        self._states: Dict[str, Dict[str, Any]] = {}

    def build(self, **kwargs: Any) -> Any:
        return {"vocab_size": int(kwargs.get("vocab_size", 64))}

    def epochs_for(self, hyperparams: Dict[str, Any]) -> int:
        return 2

    def train(
        self,
        dataset: BaseDataset,
        hyperparams: Dict[str, Any],
        emit: Callable[[MetricPoint], None],
    ) -> None:
        from sklearn.cluster import MiniBatchKMeans
        from sklearn.svm import SVC

        images, targets, _ = load_split_images(dataset, "train")
        if images.shape[0] == 0:
            raise ValueError("数据集缺少训练样本，请先准备 manifest.json 与图片文件")

        classes = list(dataset.meta.class_names) or [str(i) for i in range(int(targets.max()) + 1)]
        vocab_size = max(8, int(hyperparams.get("vocab_size", 64)))

        patches, _ = _extract_patches(images)
        if patches.shape[0] < vocab_size:
            vocab_size = max(2, patches.shape[0])
        vocabulary = MiniBatchKMeans(
            n_clusters=vocab_size,
            batch_size=1024,
            random_state=42,
            n_init=3,
        )
        vocabulary.fit(patches)
        emit(MetricPoint(epoch=1, loss=round(float(vocabulary.inertia_), 4)))

        features, patch_count = _encode(images, vocabulary, vocab_size)
        classifier = SVC(kernel="linear", probability=True, random_state=42)
        classifier.fit(features, targets)
        predicted = classifier.predict(features)
        emit(
            MetricPoint(
                epoch=2,
                accuracy=round(compute_accuracy(predicted.tolist(), targets.tolist()), 4),
            )
        )

        self._states[dataset.meta.id] = {
            "vocabulary": vocabulary,
            "vocab_size": vocab_size,
            "classifier": classifier,
            "classes": classes,
            "patch_count": patch_count,
        }

    def evaluate(self, dataset: BaseDataset, **kwargs: Any) -> EvaluationResult:
        state = self._states.get(dataset.meta.id)
        if state is None:
            raise NotImplementedError("BoW 尚未在该数据集上训练，请先创建训练任务")

        images, targets, positions = load_split_images(dataset, "test")
        if images.shape[0] == 0:
            raise ValueError("数据集缺少测试样本，无法评估")

        features, _ = _encode(images, state["vocabulary"], state["vocab_size"])
        classifier = state["classifier"]
        classes: List[str] = state["classes"]
        predicted = classifier.predict(features)
        probabilities = classifier.predict_proba(features)

        top5_accuracy = None
        if len(classes) >= 5:
            top5 = np.argsort(-probabilities, axis=1)[:, :5]
            hits = sum(
                1
                for row, target in zip(top5, targets.tolist())
                if int(target) in [int(item) for item in row]
            )
            top5_accuracy = round(hits / len(targets), 4)

        error_samples = [
            ErrorSample(
                dataset_id=dataset.meta.id,
                index=positions[int(index)],
                true_label=classes[int(targets[index])],
                predicted_label=classes[int(predicted[index])],
                url=f"/api/datasets/{dataset.meta.id}/samples/test/{positions[int(index)]}/image",
            )
            for index in np.where(predicted != targets)[0][:ERROR_SAMPLE_LIMIT]
        ]

        return EvaluationResult(
            task_id="",
            accuracy=round(compute_accuracy(predicted.tolist(), targets.tolist()), 4),
            top5_accuracy=top5_accuracy,
            confusion_matrix=confusion_matrix(predicted.tolist(), targets.tolist(), len(classes)),
            class_names=classes,
            error_samples=error_samples,
            embedding=project_2d(features, targets, classes, method="pca"),
        )
