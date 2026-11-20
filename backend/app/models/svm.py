"""支持向量机 SVM：以像素特征训练 sklearn SVC，强调间隔与核函数。

现场训练只推送一个指标点（训练完成），评估给出准确率、
Top-5、混淆矩阵、错误样例与 PCA 投影。
"""

from typing import Any, Callable, Dict, List

import numpy as np

from app.datasets.base import BaseDataset
from app.models.base import BaseModelHandler
from app.models.features import flatten_images, load_split_images, project_2d
from app.schemas.model import ModelMeta
from app.schemas.training import ErrorSample, EvaluationResult, MetricPoint
from app.trainer.metrics import accuracy as compute_accuracy
from app.trainer.metrics import confusion_matrix

ERROR_SAMPLE_LIMIT = 12


class SVMHandler(BaseModelHandler):
    """经典分类：小样本下用核 SVM 展示最大间隔思想。"""

    def __init__(self, meta: ModelMeta) -> None:
        super().__init__(meta)
        self._models: Dict[str, Any] = {}
        self._meta: Dict[str, Dict[str, Any]] = {}

    def build(self, **kwargs: Any) -> Any:
        from sklearn.svm import SVC

        return SVC(
            kernel=str(kwargs.get("kernel", "rbf")),
            C=float(kwargs.get("c", 1.0)),
            probability=True,
            random_state=42,
        )

    def epochs_for(self, hyperparams: Dict[str, Any]) -> int:
        return 1

    def train(
        self,
        dataset: BaseDataset,
        hyperparams: Dict[str, Any],
        emit: Callable[[MetricPoint], None],
    ) -> None:
        images, targets, _ = load_split_images(dataset, "train")
        if images.shape[0] == 0:
            raise ValueError("数据集缺少训练样本，请先准备 manifest.json 与图片文件")

        classes = list(dataset.meta.class_names) or [str(i) for i in range(int(targets.max()) + 1)]
        features = flatten_images(images)
        model = self.build(
            kernel=hyperparams.get("kernel", "rbf"),
            c=hyperparams.get("c", 1.0),
        )
        model.fit(features, targets)

        predicted = model.predict(features)
        emit(
            MetricPoint(
                epoch=1,
                accuracy=round(compute_accuracy(predicted.tolist(), targets.tolist()), 4),
            )
        )

        self._models[dataset.meta.id] = model
        self._meta[dataset.meta.id] = {"classes": classes, "support_vectors": int(model.support_vectors_.shape[0])}

    def evaluate(self, dataset: BaseDataset, **kwargs: Any) -> EvaluationResult:
        model = self._models.get(dataset.meta.id)
        if model is None:
            raise NotImplementedError("SVM 尚未在该数据集上训练，请先创建训练任务")

        images, targets, positions = load_split_images(dataset, "test")
        if images.shape[0] == 0:
            raise ValueError("数据集缺少测试样本，无法评估")

        features = flatten_images(images)
        classes: List[str] = self._meta[dataset.meta.id]["classes"]
        predicted = model.predict(features)
        probabilities = model.predict_proba(features)

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
