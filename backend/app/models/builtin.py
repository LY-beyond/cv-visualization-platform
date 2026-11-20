"""内置模型登记。

当前阶段登记元信息与统一接口占位；实现算法时替换为对应的具体 Handler，
元信息与注册方式保持不变，前端无需改动。
"""

from typing import Any

from app.models.base import BaseModelHandler
from app.models.bow import BoWHandler
from app.models.catalog import LATEST_MODELS
from app.models.kmeans import KMeansHandler
from app.models.lenet5 import LeNet5Handler
from app.models.modern_backbones import MODERN_TRAINABLE, ModernBackboneHandler
from app.models.registry import model_registry
from app.models.svm import SVMHandler
from app.schemas.common import ParamOption, ParamSpec
from app.schemas.model import MetricEntry, ModelMeta, PreprocessSpec

# ImageNet 标准预处理，供预训练分类模型复用
_IMAGENET_PREPROCESS = PreprocessSpec(
    input_size=[224, 224],
    channel_order="RGB",
    mean=[0.485, 0.456, 0.406],
    std=[0.229, 0.224, 0.225],
    resize="center_crop",
)

# COCO 80 类，与前端 detection/labels.json 对齐
_COCO_LABELS = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
    "toothbrush",
]


class PlaceholderModel(BaseModelHandler):
    """尚未接入算法实现的模型占位，保证注册框架与接口可运行。"""

    def build(self, **kwargs: Any) -> Any:
        raise NotImplementedError(f"{self.meta.name} 尚未接入算法实现")


def _slider(name: str, label: str, default: float, minimum: float, maximum: float, step: float = 1) -> ParamSpec:
    return ParamSpec(
        name=name,
        label=label,
        type="slider",
        default=default,
        minimum=minimum,
        maximum=maximum,
        step=step,
    )


_MODELS = [
    ModelMeta(
        id="kmeans",
        name="K-Means 聚类",
        chapter="ch3",
        task="聚类与分割",
        level="trainable",
        innovation="以簇中心迭代更新实现无监督像素或特征分组，是 BoW 词典与分割的基础。",
        params="簇中心数量 K × 特征维度",
        pros=["无需标签", "实现简单", "迭代过程可视化直观"],
        cons=["需预设 K", "对初始中心敏感", "仅适合凸形簇"],
        datasets=["mnist_subset", "natural_images"],
        hyperparams=[
            _slider("k", "簇数 K", 8, 2, 24),
            _slider("max_iter", "最大迭代轮数", 20, 1, 100),
        ],
        implemented=True,
    ),
    ModelMeta(
        id="svm",
        name="支持向量机 SVM",
        chapter="ch3",
        task="分类",
        level="trainable",
        innovation="最大化分类间隔，配合核函数处理非线性特征。",
        params="由支持向量数量决定",
        pros=["小样本表现稳定", "理论完备", "可与手工特征配合"],
        cons=["大数据集训练慢", "多分类需组合策略"],
        datasets=["mnist_subset", "objects_subset"],
        hyperparams=[
            ParamSpec(
                name="kernel",
                label="核函数",
                type="select",
                default="rbf",
                options=[ParamOption(label="线性", value="linear"), ParamOption(label="RBF", value="rbf")],
            ),
            _slider("c", "惩罚系数 C", 1.0, 0.01, 100, 0.01),
        ],
        implemented=True,
    ),
    ModelMeta(
        id="bow",
        name="BoW + SVM",
        chapter="ch3",
        task="分类",
        level="trainable",
        innovation="用局部特征聚类生成视觉词典，以直方图量化图像后交给分类器。",
        params="词典规模 × 特征维度",
        pros=["流程完整呈现传统分类范式", "可解释性强"],
        cons=["词典构建耗时", "丢失空间信息"],
        datasets=["mnist_subset", "objects_subset"],
        hyperparams=[_slider("vocab_size", "词典规模", 64, 16, 256)],
        implemented=True,
    ),
    ModelMeta(
        id="lenet5",
        name="LeNet-5",
        alias="浅层 CNN",
        chapter="ch3",
        task="分类",
        level="trainable",
        year=1998,
        innovation="早期卷积神经网络范式：卷积、池化与全连接交替堆叠。",
        params="约 6 万",
        structure_note="Input 32×32 → Conv 6@5×5 → Pool → Conv 16@5×5 → Pool → FC 120 → FC 84 → FC 10",
        pros=["结构轻量，CPU 可短时训练", "适合讲解卷积与池化"],
        cons=["容量有限", "对复杂自然图像效果一般"],
        datasets=["mnist_subset"],
        hyperparams=[
            _slider("epochs", "训练轮数", 5, 1, 20),
            _slider("lr", "学习率", 0.001, 0.0001, 0.01, 0.0001),
            _slider("batch_size", "批大小", 32, 8, 128),
        ],
        weight_path="lenet-mnist/model.onnx",
        preprocess=PreprocessSpec(
            input_size=[28, 28],
            channel_order="RGB",
            mean=[0.0],
            std=[1.0],
            resize="stretch",
        ),
        labels=[str(i) for i in range(10)],
        metrics=[
            MetricEntry(name="测试准确率", value=0.9812, note="实验三教师模型，9812/10000"),
            MetricEntry(name="参数量", value=61706, note="Keras 教师模型统计"),
        ],
        implemented=True,
    ),
    ModelMeta(
        id="alexnet",
        name="AlexNet",
        chapter="ch3",
        task="分类",
        level="pretrained",
        year=2012,
        innovation="ReLU、Dropout、数据增强与 GPU 训练，开启深度学习分类时代。",
        params="约 6000 万",
        structure_note="5 个卷积层 + 3 个全连接层，输入 224×224",
        pros=["特征表达能力强", "可作为迁移学习骨干"],
        cons=["参数量大", "普通 CPU 推理仍较慢"],
        datasets=["objects_subset"],
        weight_path="alexnet/model.pt",
        preprocess=_IMAGENET_PREPROCESS,
        metrics=[MetricEntry(name="Top-1 准确率", value=0.568, note="ImageNet-1k 验证集")],
    ),
    ModelMeta(
        id="vgg16",
        name="VGG-16",
        chapter="ch3",
        task="分类",
        level="pretrained",
        year=2014,
        innovation="用小卷积核堆叠加深网络，结构规整、便于迁移。",
        params="约 1.38 亿",
        structure_note="13 个 3×3 卷积层 + 3 个全连接层",
        pros=["结构统一易理解", "特征通用性强"],
        cons=["参数多、计算量大"],
        datasets=["objects_subset"],
        weight_path="vgg16/model.pt",
        preprocess=_IMAGENET_PREPROCESS,
        metrics=[MetricEntry(name="Top-1 准确率", value=0.713, note="ImageNet-1k 验证集")],
    ),
    ModelMeta(
        id="resnet50",
        name="ResNet-50",
        chapter="ch3",
        task="分类",
        level="pretrained",
        year=2015,
        innovation="残差连接缓解深层网络退化，使超深网络可训练。",
        params="约 2560 万",
        structure_note="4 个残差阶段，Bottleneck 结构，50 层",
        pros=["精度与深度平衡", "广泛用作检测与分割骨干"],
        cons=["结构讲解需要残差块铺垫"],
        datasets=["objects_subset"],
        weight_path="resnet50/model.pt",
        preprocess=_IMAGENET_PREPROCESS,
        metrics=[MetricEntry(name="Top-1 准确率", value=0.761, note="ImageNet-1k 验证集")],
    ),
    ModelMeta(
        id="yolo_v3",
        name="YOLOv3",
        chapter="ch5",
        task="检测",
        level="pretrained",
        year=2018,
        innovation="多尺度特征图与锚框联合预测，单阶段端到端检测。",
        params="约 6200 万",
        structure_note="Darknet-53 骨干 + FPN 式多尺度检测头（13/26/52）",
        pros=["速度快", "多尺度检测"],
        cons=["小目标与密集场景仍有漏检"],
        datasets=["detection_scene"],
        hyperparams=[
            _slider("conf_threshold", "置信度阈值", 0.5, 0.05, 0.95, 0.05),
            _slider("nms_iou", "NMS IoU 阈值", 0.45, 0.1, 0.9, 0.05),
        ],
        weight_path="yolo_v3/model.pt",
        preprocess=PreprocessSpec(
            input_size=[416, 416],
            channel_order="RGB",
            mean=[0.0, 0.0, 0.0],
            std=[1.0, 1.0, 1.0],
            resize="letterbox",
        ),
        labels=_COCO_LABELS,
        metrics=[
            MetricEntry(name="mAP@0.5", value=0.579, note="COCO val2017"),
            MetricEntry(name="CPU 单图耗时", value=0.27, note="实验五实测（官方 COCO 权重，s）"),
            MetricEntry(name="dog 检测置信度", value=0.9996, note="实验五 dog-cycle-car 推理结果"),
        ],
    ),
    ModelMeta(
        id="faster_rcnn",
        name="Faster R-CNN",
        chapter="ch5",
        task="检测",
        level="pretrained",
        year=2015,
        innovation="用 RPN 直接生成候选框，与检测头共享卷积特征，首次实现端到端两阶段检测。",
        params="41,808,406（ResNet-50-FPN）",
        structure_note="ResNet-50 + FPN（P2–P5）+ RPN（Anchor）+ RoIAlign + 分类/回归双头",
        pros=["定位与分类精细", "RoIAlign 消除量化误差", "对密集小目标更稳"],
        cons=["两阶段串行，速度慢", "显存与算力开销大"],
        datasets=["detection_scene"],
        hyperparams=[
            _slider("score_threshold", "得分阈值", 0.7, 0.1, 0.95, 0.05),
            _slider("nms_iou", "NMS IoU 阈值", 0.5, 0.1, 0.9, 0.05),
        ],
        preprocess=PreprocessSpec(
            input_size=[800, 800],
            channel_order="RGB",
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
            resize="letterbox",
        ),
        labels=_COCO_LABELS,
        metrics=[
            MetricEntry(name="CPU 单图耗时", value=1.37, note="实验五实测（官方 COCO 权重，s）"),
            MetricEntry(name="dog 检测置信度", value=0.9945, note="实验五 dog-cycle-car 推理结果"),
        ],
    ),
    ModelMeta(
        id="mask_rcnn",
        name="Mask R-CNN",
        chapter="ch5",
        task="实例分割",
        level="pretrained",
        year=2017,
        innovation="在 Faster R-CNN 上并联 mask 分支，每个 RoI 输出 28×28 掩膜，同时完成检测与实例分割。",
        params="64,158,584（ResNet-101-FPN）",
        structure_note="ResNet-101 + FPN + RPN + RoIAlign + 分类/回归/mask 三头（mini-mask 训练）",
        pros=["像素级实例掩膜", "检测与分割共享特征", "可区分同类不同实例"],
        cons=["速度最慢", "掩膜标注成本高"],
        datasets=["detection_scene"],
        hyperparams=[
            _slider("score_threshold", "得分阈值", 0.7, 0.1, 0.95, 0.05),
            _slider("mask_threshold", "掩膜二值化阈值", 0.5, 0.1, 0.9, 0.05),
        ],
        preprocess=PreprocessSpec(
            input_size=[800, 800],
            channel_order="RGB",
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
            resize="letterbox",
        ),
        labels=_COCO_LABELS,
        metrics=[
            MetricEntry(name="CPU 单图耗时", value=2.7, note="实验五实测（官方 COCO 权重，s）"),
            MetricEntry(name="街景实例数", value=33, note="实验五 mask_rcnn_12283150 推理结果"),
        ],
    ),
    ModelMeta(
        id="facenet",
        name="FaceNet",
        chapter="ch6",
        task="人脸识别",
        level="pretrained",
        year=2015,
        innovation="Triplet Loss 直接学习嵌入空间，使同类聚拢、异类分离。",
        params="约 700 万（Inception 骨干）",
        structure_note="Inception 骨干 + L2 归一化嵌入层",
        pros=["嵌入可直接用于验证与检索", "对光照与姿态较稳健"],
        cons=["依赖大规模人脸数据", "需要三元组采样策略"],
        datasets=["biometric_samples"],
        hyperparams=[_slider("threshold", "匹配距离阈值", 0.8, 0.2, 1.5, 0.01)],
        weight_path="facenet/model.pt",
        preprocess=PreprocessSpec(
            input_size=[160, 160],
            channel_order="RGB",
            mean=[0.5, 0.5, 0.5],
            std=[0.5, 0.5, 0.5],
            resize="center_crop",
        ),
        metrics=[MetricEntry(name="LFW 验证准确率", value=0.9963, note="6000 对人脸验证")],
    ),
    ModelMeta(
        id="vit_base",
        name="Vision Transformer (ViT)",
        chapter="ch3",
        task="分类",
        level="structure",
        year=2020,
        innovation="将图像切分为图块序列，用自注意力建模全局关系。",
        params="约 8600 万（Base）",
        structure_note="Patch Embedding + 位置编码 + 多层 Transformer Encoder + 分类头",
        pros=["全局建模能力强", "易于多模态扩展"],
        cons=["需要大数据预训练", "计算与显存开销大"],
        datasets=["objects_subset"],
        preprocess=_IMAGENET_PREPROCESS,
    ),
]

# 2022–2025 年最新视觉模型：以模型卡形式登记，提供论文与官方代码入口
_MODELS.extend(LATEST_MODELS)
_MODELS.extend(MODERN_TRAINABLE)

# 已实现算法的模型：其余仍使用占位实现，前端依据 implemented 字段提示“待接入”
_IMPLEMENTED = {
    "lenet5": LeNet5Handler,
    "kmeans": KMeansHandler,
    "svm": SVMHandler,
    "bow": BoWHandler,
}
_IMPLEMENTED.update({meta.id: ModernBackboneHandler for meta in MODERN_TRAINABLE})

for _meta in _MODELS:
    _handler = _IMPLEMENTED.get(_meta.id, PlaceholderModel)
    model_registry.register(_handler(_meta))
