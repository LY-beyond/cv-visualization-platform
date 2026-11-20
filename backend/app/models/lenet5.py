"""LeNet-5：早期卷积神经网络，支持 MNIST 小样本现场训练与评估。

结构（输入 28×28 灰度图）：
    Conv 6@5×5(pad=2) → ReLU → AvgPool 2×2
    Conv 16@5×5      → ReLU → AvgPool 2×2
    FC 120 → FC 84 → FC 10
"""

import time
from typing import Any, Callable, Dict, List, Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError

from app.core.config import TRAIN_MAX_EPOCHS, TRAIN_MAX_SAMPLES, TRAIN_TIMEOUT_SECONDS
from app.core.paths import dataset_dir
from app.datasets.base import BaseDataset
from app.models.base import BaseModelHandler
from app.schemas.model import ModelMeta
from app.schemas.training import ErrorSample, EvaluationResult, MetricPoint
from app.trainer.metrics import accuracy as compute_accuracy
from app.trainer.metrics import confusion_matrix

try:  # PyTorch 为可选依赖，缺失时给出可读提示而不是启动失败
    import torch
    from torch import nn
    from torch.utils.data import DataLoader, TensorDataset

    TORCH_AVAILABLE = True
except ImportError:  # pragma: no cover - 环境未安装时走降级分支
    torch = None  # type: ignore[assignment]
    nn = None  # type: ignore[assignment]
    DataLoader = None  # type: ignore[assignment]
    TensorDataset = None  # type: ignore[assignment]
    TORCH_AVAILABLE = False

INPUT_SIZE = 28
ERROR_SAMPLE_LIMIT = 12
EMBEDDING_LIMIT = 300


def _require_torch() -> None:
    if not TORCH_AVAILABLE:
        raise NotImplementedError("未安装 PyTorch，无法进行 LeNet-5 训练。请先安装 torch 后重试。")


if TORCH_AVAILABLE:

    class LeNet5Net(nn.Module):
        """LeNet-5 的 PyTorch 实现。"""

        def __init__(self, num_classes: int = 10) -> None:
            super().__init__()
            self.features = nn.Sequential(
                nn.Conv2d(1, 6, kernel_size=5, padding=2),
                nn.ReLU(inplace=True),
                nn.AvgPool2d(kernel_size=2),
                nn.Conv2d(6, 16, kernel_size=5),
                nn.ReLU(inplace=True),
                nn.AvgPool2d(kernel_size=2),
            )
            self.classifier = nn.Sequential(
                nn.Flatten(),
                nn.Linear(16 * 5 * 5, 120),
                nn.ReLU(inplace=True),
                nn.Linear(120, 84),
                nn.ReLU(inplace=True),
                nn.Linear(84, num_classes),
            )

        def forward(self, x: Any) -> Any:
            return self.classifier(self.features(x))

        def embed(self, x: Any) -> Any:
            """输出 84 维特征，用于降维投影展示。"""
            features = self.features(x).flatten(1)
            hidden = torch.relu(self.classifier[1](features))
            return torch.relu(self.classifier[3](hidden))

else:  # pragma: no cover - 仅占位，保证模块可导入
    LeNet5Net = None  # type: ignore[assignment]


def _load_split(dataset: BaseDataset, split: str) -> Tuple[np.ndarray, np.ndarray]:
    """读取图片为 [N,1,28,28] 的浮点张量与标签数组。"""
    root = dataset_dir(dataset.meta.id)
    records = dataset.samples(split)
    if split == "train":
        records = records[:TRAIN_MAX_SAMPLES]

    images: List[np.ndarray] = []
    labels: List[int] = []
    for raw in records:
        relative = raw.get("path")
        label = raw.get("label")
        if not relative or not isinstance(label, int):
            continue
        path = root / relative
        if not path.exists():
            continue
        try:
            with Image.open(path) as image:
                array = np.asarray(
                    image.convert("L").resize((INPUT_SIZE, INPUT_SIZE), Image.BILINEAR),
                    dtype=np.float32,
                )
        except (UnidentifiedImageError, OSError):
            continue
        images.append(array / 255.0)
        labels.append(label)

    if not images:
        return np.zeros((0, 1, INPUT_SIZE, INPUT_SIZE), dtype=np.float32), np.zeros((0,), dtype=np.int64)
    tensor = np.stack(images)[:, None, :, :].astype(np.float32)
    return tensor, np.asarray(labels, dtype=np.int64)


def _embedding_points(
    features: np.ndarray, labels: np.ndarray, class_names: List[str]
) -> List[Dict[str, Any]]:
    """用 PCA 把 84 维特征投影到二维，供前端散点展示。"""
    if features.shape[0] == 0:
        return []
    from sklearn.decomposition import PCA

    sample = features[:EMBEDDING_LIMIT]
    if sample.shape[0] >= 2:
        coords = PCA(n_components=2, random_state=0).fit_transform(sample)
    else:
        coords = np.zeros((sample.shape[0], 2), dtype=np.float32)

    points: List[Dict[str, Any]] = []
    for index in range(sample.shape[0]):
        label = int(labels[index])
        points.append(
            {
                "x": round(float(coords[index, 0]), 4),
                "y": round(float(coords[index, 1]), 4),
                "label": class_names[label] if 0 <= label < len(class_names) else str(label),
            }
        )
    return points


class LeNet5Handler(BaseModelHandler):
    """现场训练类模型：短时训练后立即评估并给出可视化结果。"""

    def __init__(self, meta: ModelMeta) -> None:
        super().__init__(meta)
        # 训练结果按数据集缓存，评估时直接复用最近一次训练的模型
        self._models: Dict[str, Tuple[Any, float, float, List[str]]] = {}

    def build(self, **kwargs: Any) -> Any:
        _require_torch()
        num_classes = int(kwargs.get("num_classes", 10))
        return LeNet5Net(num_classes=num_classes)

    def epochs_for(self, hyperparams: Dict[str, Any]) -> int:
        return max(1, min(int(hyperparams.get("epochs", 5)), TRAIN_MAX_EPOCHS))

    def train(
        self,
        dataset: BaseDataset,
        hyperparams: Dict[str, Any],
        emit: Callable[[MetricPoint], None],
    ) -> None:
        _require_torch()
        torch.manual_seed(42)

        epochs = max(1, min(int(hyperparams.get("epochs", 5)), TRAIN_MAX_EPOCHS))
        learning_rate = float(hyperparams.get("lr", 0.001))
        batch_size = max(1, int(hyperparams.get("batch_size", 32)))

        train_x, train_y = _load_split(dataset, "train")
        val_x, val_y = _load_split(dataset, "test")
        if train_x.shape[0] == 0:
            raise ValueError("数据集缺少训练样本，请先准备 manifest.json 与图片文件")

        classes = list(dataset.meta.class_names) or [str(i) for i in range(int(train_y.max()) + 1)]
        mean = float(train_x.mean())
        std = float(train_x.std()) or 1.0

        model = LeNet5Net(num_classes=len(classes))
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

        train_dataset = TensorDataset(torch.from_numpy(train_x), torch.from_numpy(train_y))
        loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

        val_tensor = torch.from_numpy(val_x)
        val_target = torch.from_numpy(val_y)
        started = time.monotonic()

        for epoch in range(1, epochs + 1):
            model.train()
            total_loss = 0.0
            correct = 0
            total = 0
            for batch_x, batch_y in loader:
                if time.monotonic() - started > TRAIN_TIMEOUT_SECONDS:
                    raise TimeoutError(f"训练超过 {TRAIN_TIMEOUT_SECONDS} 秒上限，请减少轮数或批大小")

                batch_x = (batch_x - mean) / std
                optimizer.zero_grad()
                logits = model(batch_x)
                loss = criterion(logits, batch_y)
                loss.backward()
                optimizer.step()

                total_loss += loss.item() * batch_y.size(0)
                correct += int((logits.argmax(dim=1) == batch_y).sum().item())
                total += int(batch_y.size(0))

            val_loss = None
            val_accuracy = None
            if val_tensor.shape[0] > 0:
                model.eval()
                with torch.no_grad():
                    val_logits = model((val_tensor - mean) / std)
                    val_loss = float(criterion(val_logits, val_target).item())
                    val_accuracy = float(
                        (val_logits.argmax(dim=1) == val_target).float().mean().item()
                    )

            emit(
                MetricPoint(
                    epoch=epoch,
                    loss=round(total_loss / max(total, 1), 4),
                    accuracy=round(correct / max(total, 1), 4),
                    val_loss=round(val_loss, 4) if val_loss is not None else None,
                    val_accuracy=round(val_accuracy, 4) if val_accuracy is not None else None,
                )
            )

        self._models[dataset.meta.id] = (model, mean, std, classes)

    def evaluate(self, dataset: BaseDataset, **kwargs: Any) -> EvaluationResult:
        _require_torch()
        cached = self._models.get(dataset.meta.id)
        if cached is None:
            raise NotImplementedError("LeNet-5 尚未在该数据集上训练，请先创建训练任务")

        model, mean, std, classes = cached
        test_x, test_y = _load_split(dataset, "test")
        if test_x.shape[0] == 0:
            raise ValueError("数据集缺少测试样本，无法评估")

        model.eval()
        with torch.no_grad():
            tensor = (torch.from_numpy(test_x) - mean) / std
            logits = model(tensor)
            predictions = logits.argmax(dim=1).numpy()
            probabilities = torch.softmax(logits, dim=1).numpy()
            features = model.embed(tensor).numpy()

        targets = test_y.tolist()
        predicted = predictions.tolist()
        top5_accuracy = None
        if len(classes) >= 5:
            top5 = np.argsort(-probabilities, axis=1)[:, :5]
            hits = sum(1 for row, target in zip(top5, targets) if target in row)
            top5_accuracy = round(hits / len(targets), 4)

        error_samples = [
            ErrorSample(
                dataset_id=dataset.meta.id,
                index=int(index),
                true_label=classes[int(test_y[index])],
                predicted_label=classes[int(predictions[index])],
                url=f"/api/datasets/{dataset.meta.id}/samples/test/{int(index)}/image",
            )
            for index in np.where(predictions != test_y)[0][:ERROR_SAMPLE_LIMIT]
        ]

        return EvaluationResult(
            task_id="",
            accuracy=round(compute_accuracy(predicted, targets), 4),
            top5_accuracy=top5_accuracy,
            confusion_matrix=confusion_matrix(predicted, targets, len(classes)),
            class_names=classes,
            error_samples=error_samples,
            embedding=_embedding_points(features, test_y, classes),
        )
