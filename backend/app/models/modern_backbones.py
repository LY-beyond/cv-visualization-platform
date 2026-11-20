"""现代骨干网络：在 CIFAR 子集上现场训练 / 预训练微调 / 线性探针。

与 lenet5.py 共用同一套训练契约：
- train(dataset, hyperparams, emit) 逐轮推送 MetricPoint；
- evaluate(dataset) 复用最近一次训练结果，输出准确率、混淆矩阵、错误样例与特征投影。

三种训练模式（hyperparams.mode）：
- finetune：加载 ImageNet 预训练权重后全网络微调；
- scratch：随机初始化从零训练，用于对比“预训练到底带来多少收益”；
- linear：冻结预训练骨干，只训练新的分类头（线性探针），几轮即可收敛。

预训练权重首次使用时会下载到 torch / timm 缓存目录；下载失败自动退回随机初始化，
保证离线课堂也能跑通演示。
"""

import os
import time
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError

from app.core.config import TRAIN_MAX_EPOCHS, TRAIN_MAX_SAMPLES, TRAIN_TIMEOUT_SECONDS
from app.core.paths import dataset_dir
from app.datasets.base import BaseDataset
from app.models.base import BaseModelHandler
from app.schemas.common import ParamOption, ParamSpec
from app.schemas.model import MetricEntry, ModelMeta, PreprocessSpec
from app.schemas.training import ErrorSample, EvaluationResult, MetricPoint
from app.trainer.metrics import accuracy as compute_accuracy
from app.trainer.metrics import confusion_matrix

try:  # 与 Lenet5 一致：缺少 PyTorch 时只降级提示，不影响服务启动
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

# timm 默认从 huggingface.co 拉取权重，国内网络常不可达；未显式配置时改用镜像
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

INPUT_SIZE = 64
CIFAR_MEAN = (0.4914, 0.4822, 0.4465)
CIFAR_STD = (0.2470, 0.2435, 0.2616)
ERROR_SAMPLE_LIMIT = 12
EMBEDDING_LIMIT = 300

_CIFAR_PREPROCESS = PreprocessSpec(
    input_size=[INPUT_SIZE, INPUT_SIZE],
    channel_order="RGB",
    mean=list(CIFAR_MEAN),
    std=list(CIFAR_STD),
    resize="stretch",
)

_CIFAR_DATASETS = ["cifar10_subset", "cifar100_subset"]


def _require_torch() -> None:
    if not TORCH_AVAILABLE:
        raise NotImplementedError("未安装 PyTorch，无法进行现代骨干训练。请先安装 torch / torchvision / timm。")


def _limit_threads() -> None:
    """课堂机器多为 CPU，限制线程数避免与其他服务争抢。"""
    if not TORCH_AVAILABLE:
        return
    threads = max(1, min(8, os.cpu_count() or 4))
    torch.set_num_threads(threads)


def _hyperparams(lr: float = 0.001, epochs: int = 3) -> List[ParamSpec]:
    return [
        ParamSpec(
            name="mode",
            label="训练模式",
            type="select",
            default="finetune",
            options=[
                ParamOption(label="ImageNet 预训练微调", value="finetune"),
                ParamOption(label="从零训练", value="scratch"),
                ParamOption(label="冻结骨干 + 线性探针", value="linear"),
            ],
            description="同一数据上切换模式，可直接对比预训练带来的收益。",
        ),
        ParamSpec(name="epochs", label="训练轮数", type="slider", default=epochs, minimum=1, maximum=10, step=1),
        ParamSpec(name="lr", label="学习率", type="slider", default=lr, minimum=0.0001, maximum=0.01, step=0.0001),
        ParamSpec(name="batch_size", label="批大小", type="slider", default=32, minimum=8, maximum=128, step=8),
    ]


# ---------------------------------------------------------------------------
# 骨干构建：统一返回 (完整模型, 分类头, 特征提取模块)
# ---------------------------------------------------------------------------


def _build_resnet18(num_classes: int, pretrained: bool) -> Tuple[Any, Any, Any]:
    from torchvision import models

    weights = models.ResNet18_Weights.IMAGENET1K_V1 if pretrained else None
    net = models.resnet18(weights=weights)
    net.fc = nn.Linear(net.fc.in_features, num_classes)
    embed = nn.Sequential(*list(net.children())[:-1], nn.Flatten(1))
    return net, net.fc, embed


def _build_convnext_tiny(num_classes: int, pretrained: bool) -> Tuple[Any, Any, Any]:
    from torchvision import models

    weights = models.ConvNeXt_Tiny_Weights.IMAGENET1K_V1 if pretrained else None
    net = models.convnext_tiny(weights=weights)
    # ConvNeXt 的分类头是 Sequential(LayerNorm, Flatten, Linear)
    net.classifier[2] = nn.Linear(net.classifier[2].in_features, num_classes)
    embed = nn.Sequential(net.features, net.avgpool, net.classifier[0], nn.Flatten(1))
    return net, net.classifier[2], embed


class _TimmEmbed(nn.Module):
    """timm 模型的池化特征输出，兼容 CNN 与 ViT。"""

    def __init__(self, net: Any) -> None:
        super().__init__()
        self.net = net

    def forward(self, x: Any) -> Any:
        return self.net.forward_head(self.net.forward_features(x), pre_logits=True)


def _build_timm(name: str) -> Callable[[int, bool], Tuple[Any, Any, Any]]:
    def builder(num_classes: int, pretrained: bool) -> Tuple[Any, Any, Any]:
        import timm

        net = timm.create_model(name, pretrained=pretrained, num_classes=num_classes)
        head = net.get_classifier()
        return net, head, _TimmEmbed(net)

    return builder


_BUILDERS: Dict[str, Callable[[int, bool], Tuple[Any, Any, Any]]] = {
    "resnet18_cifar": _build_resnet18,
    "convnext_tiny_cifar": _build_convnext_tiny,
    "mobilenetv4_cifar": _build_timm("mobilenetv4_conv_small.e2400_r224_in1k"),
    "repvit_cifar": _build_timm("repvit_m1.dist_in1k"),
}


def _load_split(dataset: BaseDataset, split: str) -> Tuple[np.ndarray, np.ndarray]:
    """读取图片为 [N,3,64,64] 的浮点张量与标签数组。"""
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
                    image.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE), Image.BILINEAR),
                    dtype=np.float32,
                )
        except (UnidentifiedImageError, OSError):
            continue
        images.append(array / 255.0)
        labels.append(label)

    if not images:
        return (
            np.zeros((0, 3, INPUT_SIZE, INPUT_SIZE), dtype=np.float32),
            np.zeros((0,), dtype=np.int64),
        )
    tensor = np.stack(images).transpose(0, 3, 1, 2).astype(np.float32)
    return tensor, np.asarray(labels, dtype=np.int64)


def _normalize(array: np.ndarray) -> Any:
    mean = torch.tensor(CIFAR_MEAN, dtype=torch.float32).view(1, 3, 1, 1)
    std = torch.tensor(CIFAR_STD, dtype=torch.float32).view(1, 3, 1, 1)
    return (torch.from_numpy(array) - mean) / std


def _embedding_points(
    features: np.ndarray, labels: np.ndarray, class_names: List[str]
) -> List[Dict[str, Any]]:
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


class ModernBackboneHandler(BaseModelHandler):
    """现代骨干的通用训练/评估实现，按 meta.id 选择具体网络。"""

    def __init__(self, meta: ModelMeta) -> None:
        super().__init__(meta)
        builder = _BUILDERS.get(meta.id)
        if builder is None:  # pragma: no cover - 注册表配置错误时尽早暴露
            raise KeyError(f"未登记的骨干构建器: {meta.id}")
        self._builder = builder
        self._cache: Dict[str, Tuple[Any, Any, List[str]]] = {}

    def build(self, **kwargs: Any) -> Any:
        _require_torch()
        num_classes = int(kwargs.get("num_classes", 10))
        pretrained = bool(kwargs.get("pretrained", False))
        net, _, _ = self._build_net(num_classes, pretrained)
        return net

    def _build_net(self, num_classes: int, pretrained: bool) -> Tuple[Any, Any, Any]:
        try:
            return self._builder(num_classes, pretrained)
        except Exception as exc:  # noqa: BLE001 权重下载失败时退回随机初始化
            if not pretrained:
                raise
            print(f"[{self.meta.id}] 预训练权重加载失败，改用随机初始化：{exc}")
            return self._builder(num_classes, False)

    def epochs_for(self, hyperparams: Dict[str, Any]) -> int:
        return max(1, min(int(hyperparams.get("epochs", 3)), TRAIN_MAX_EPOCHS))

    def train(
        self,
        dataset: BaseDataset,
        hyperparams: Dict[str, Any],
        emit: Callable[[MetricPoint], None],
    ) -> None:
        _require_torch()
        _limit_threads()
        torch.manual_seed(42)

        epochs = max(1, min(int(hyperparams.get("epochs", 3)), TRAIN_MAX_EPOCHS))
        mode = str(hyperparams.get("mode", "finetune"))
        learning_rate = float(hyperparams.get("lr", 0.001))
        batch_size = max(1, int(hyperparams.get("batch_size", 32)))

        train_x, train_y = _load_split(dataset, "train")
        val_x, val_y = _load_split(dataset, "test")
        if train_x.shape[0] == 0:
            raise ValueError("数据集缺少训练样本，请先准备 manifest.json 与图片文件")

        classes = list(dataset.meta.class_names)
        if not classes:
            classes = [str(i) for i in range(int(train_y.max()) + 1)]

        net, head, _ = self._build_net(len(classes), pretrained=mode != "scratch")
        if mode == "linear":
            for param in net.parameters():
                param.requires_grad = False
            for param in head.parameters():
                param.requires_grad = True

        trainable = [param for param in net.parameters() if param.requires_grad]
        optimizer = torch.optim.AdamW(trainable, lr=learning_rate, weight_decay=0.01)
        criterion = nn.CrossEntropyLoss()

        train_tensor = _normalize(train_x)
        train_target = torch.from_numpy(train_y)
        loader = DataLoader(
            TensorDataset(train_tensor, train_target), batch_size=batch_size, shuffle=True
        )

        val_tensor = _normalize(val_x)
        val_target = torch.from_numpy(val_y)
        started = time.monotonic()

        for epoch in range(1, epochs + 1):
            net.train()
            total_loss = 0.0
            correct = 0
            total = 0
            for batch_x, batch_y in loader:
                if time.monotonic() - started > TRAIN_TIMEOUT_SECONDS:
                    raise TimeoutError(f"训练超过 {TRAIN_TIMEOUT_SECONDS} 秒上限，请减少轮数或批大小")

                optimizer.zero_grad()
                logits = net(batch_x)
                loss = criterion(logits, batch_y)
                loss.backward()
                optimizer.step()

                total_loss += loss.item() * batch_y.size(0)
                correct += int((logits.argmax(dim=1) == batch_y).sum().item())
                total += int(batch_y.size(0))

            val_loss = None
            val_accuracy = None
            if val_tensor.shape[0] > 0:
                net.eval()
                with torch.no_grad():
                    val_logits = net(val_tensor)
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

        # 缓存评估所需的特征提取模块（与 net 共享权重）
        self._cache[dataset.meta.id] = (net, _build_embed(net), classes)

    def evaluate(self, dataset: BaseDataset, **kwargs: Any) -> EvaluationResult:
        _require_torch()
        cached = self._cache.get(dataset.meta.id)
        if cached is None:
            raise NotImplementedError(
                f"{self.meta.name} 尚未在该数据集上训练，请先创建训练任务（可切换“ImageNet 预训练微调”）"
            )

        net, embed, classes = cached
        test_x, test_y = _load_split(dataset, "test")
        if test_x.shape[0] == 0:
            raise ValueError("数据集缺少测试样本，无法评估")

        net.eval()
        with torch.no_grad():
            tensor = _normalize(test_x)
            logits = net(tensor)
            predictions = logits.argmax(dim=1).numpy()
            probabilities = torch.softmax(logits, dim=1).numpy()
            features = embed(tensor).numpy()

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


def _build_embed(net: Any) -> Any:
    """恢复特征提取模块：timm 用 forward_head，torchvision 用子模块切片。"""
    if hasattr(net, "forward_head") and hasattr(net, "forward_features"):
        return _TimmEmbed(net)
    if hasattr(net, "classifier") and hasattr(net, "avgpool"):  # ConvNeXt
        return nn.Sequential(net.features, net.avgpool, net.classifier[0], nn.Flatten(1))
    return nn.Sequential(*list(net.children())[:-1], nn.Flatten(1))  # ResNet


# ---------------------------------------------------------------------------
# 模型卡：四个在 CIFAR 子集上可现场训练 / 微调的现代骨干
# ---------------------------------------------------------------------------

MODERN_TRAINABLE: List[ModelMeta] = [
    ModelMeta(
        id="resnet18_cifar",
        name="ResNet-18（CIFAR 现场训练）",
        alias="残差基线",
        chapter="ch3",
        task="分类",
        level="trainable",
        year=2016,
        venue="CVPR 2016",
        paper_url="https://arxiv.org/abs/1512.03385",
        code_url="https://github.com/pytorch/vision/blob/main/torchvision/models/resnet.py",
        params="约 1118 万",
        innovation="残差学习让深层网络可训练，是后续几乎所有骨干的对照基线。",
        structure_note="4 个残差阶段（3×3 卷积堆叠）+ 全局平均池化 + 全连接分类头，输入 64×64。",
        pros=["结构经典，讲解残差最直观", "CPU 上 5 轮微调约 1.5 分钟"],
        cons=["感受野与容量有限", "ImageNet 精度已被现代骨干超越"],
        datasets=_CIFAR_DATASETS,
        hyperparams=_hyperparams(0.0005, 5),
        preprocess=_CIFAR_PREPROCESS,
        metrics=[
            MetricEntry(name="ImageNet Top-1", value=0.698, note="torchvision 官方权重，224×224"),
            MetricEntry(name="CIFAR-10 微调", value=0.702, note="5 轮，64×64，CPU 约 105 秒（平台实测）"),
            MetricEntry(name="参数量", value=11181642, note="分类头改为 10 类时统计"),
        ],
        implemented=True,
    ),
    ModelMeta(
        id="convnext_tiny_cifar",
        name="ConvNeXt-Tiny（CIFAR 现场训练）",
        alias="现代化纯卷积",
        chapter="ch3",
        task="分类",
        level="trainable",
        year=2022,
        venue="CVPR 2022",
        paper_url="https://arxiv.org/abs/2201.03545",
        code_url="https://github.com/facebookresearch/ConvNeXt",
        params="约 2783 万",
        innovation="借鉴 Transformer 的宏观/微观设计改造 ResNet：7×7 深度卷积、倒瓶颈、LayerNorm 与 GELU，证明纯卷积也能达到 ViT 精度。",
        structure_note="4 个阶段，每阶段下采样 + 若干 ConvNeXt 块（7×7 深度卷积 + 1×1 升维 + GELU + 1×1 降维），末端 LayerNorm 与线性头。",
        pros=["纯卷积、结构现代", "论文对设计演进讲解清晰"],
        cons=["CPU 训练比 ResNet 慢", "小数据上容易过拟合"],
        datasets=_CIFAR_DATASETS,
        hyperparams=_hyperparams(0.0005, 3),
        preprocess=_CIFAR_PREPROCESS,
        metrics=[
            MetricEntry(name="ImageNet Top-1", value=0.821, note="官方 224×224 权重"),
            MetricEntry(name="CIFAR-10 微调", value=0.826, note="3 轮，64×64，CPU 约 150 秒（平台实测）"),
            MetricEntry(name="参数量", value=27827818, note="分类头改为 10 类时统计"),
        ],
        implemented=True,
    ),
    ModelMeta(
        id="mobilenetv4_cifar",
        name="MobileNetV4-Conv-Small（CIFAR 现场训练）",
        alias="移动端骨干",
        chapter="ch3",
        task="分类",
        level="trainable",
        year=2024,
        venue="ECCV 2024",
        paper_url="https://arxiv.org/abs/2404.10518",
        code_url="https://github.com/tensorflow/models/blob/master/research/slim/nets/mobilenet/mobilenet_v4.py",
        params="约 251 万",
        innovation="用通用倒瓶颈（UIB）统一 IB、ConvNeXt、FFN 与 ExtraDW 四种块，并给出 Mobile MQA 注意力，兼顾移动端延迟与精度。",
        structure_note="UIB 块堆叠（倒瓶颈 + 深度卷积组合）+ Mobile MQA 注意力 + 轻量分类头。",
        pros=["参数极少、CPU 训练最快", "贴近手机端部署场景"],
        cons=["64×64 输入低于原版 224，小样本下精度受限", "结构块较多样，讲解需拆解"],
        datasets=_CIFAR_DATASETS,
        hyperparams=_hyperparams(0.0003, 5),
        preprocess=_CIFAR_PREPROCESS,
        metrics=[
            MetricEntry(name="ImageNet Top-1", value=0.746, note="timm 复现权重，256×256 测试"),
            MetricEntry(name="CIFAR-10 微调", value=0.538, note="6 轮，64×64，CPU 约 70 秒（平台实测）"),
            MetricEntry(name="参数量", value=2505834, note="timm 统计，10 类分类头"),
        ],
        implemented=True,
    ),
    ModelMeta(
        id="repvit_cifar",
        name="RepViT-M1（CIFAR 现场训练）",
        alias="重参数化 ViT",
        chapter="ch3",
        task="分类",
        level="trainable",
        year=2024,
        venue="CVPR 2024",
        paper_url="https://arxiv.org/abs/2307.09283",
        code_url="https://github.com/THU-MIG/RepViT",
        params="约 472 万",
        innovation="从 ViT 视角重新设计轻量 CNN：把多头自注意力拆成 Token Mixer 与 Channel Mixer，并用结构重参数化在推理时合并分支。",
        structure_note="RepViT 块 = 深度卷积 Token Mixer + 1×1 升维 + 深度卷积 + 1×1 降维（推理期重参数化为单分支）。",
        pros=["训练/推理结构分离，适合讲重参数化", "轻量且精度优于同量级 CNN"],
        cons=["重参数化概念需要额外铺垫", "小数据微调收益有限"],
        datasets=_CIFAR_DATASETS,
        hyperparams=_hyperparams(0.0005, 5),
        preprocess=_CIFAR_PREPROCESS,
        metrics=[
            MetricEntry(name="CIFAR-10 微调", value=0.720, note="5 轮，64×64，CPU 约 150 秒（平台实测）"),
            MetricEntry(name="参数量", value=4722948, note="timm 统计，10 类分类头"),
        ],
        implemented=True,
    ),
]


def build_handlers() -> List[BaseModelHandler]:
    return [ModernBackboneHandler(meta) for meta in MODERN_TRAINABLE]
