"""内置小样本数据集登记（对应开发指南 7.1 节）。"""

from app.datasets.base import BaseDataset
from app.datasets.registry import dataset_registry
from app.schemas.dataset import DatasetMeta

_BUILTIN_DATASETS = [
    DatasetMeta(
        id="mnist_subset",
        name="手写数字小样本",
        chapter="ch3",
        task="分类",
        modality="灰度图 28×28",
        description="对应 LeNet-5 与浅层 CNN 演示，按类别裁剪后离线内置。",
        class_names=[str(i) for i in range(10)],
        example_image="mnist_subset/example.png",
    ),
    DatasetMeta(
        id="objects_subset",
        name="通用物体小样本",
        chapter="ch3",
        task="分类",
        modality="RGB 图像",
        description="飞机、鸟类等少量类别，用于 BoW 与经典模型对比。",
        class_names=["airplane", "bird"],
        example_image="objects_subset/example.jpg",
    ),
    DatasetMeta(
        id="natural_images",
        name="自然图像样本",
        chapter="ch2",
        task="基础算子与分割",
        modality="RGB 图像",
        description="用于通道查看、LBP/SIFT/HOG、边缘检测、阈值与聚类分割演示。",
        class_names=["scene"],
        example_image="natural_images/example.jpg",
    ),
    DatasetMeta(
        id="stereo_pairs",
        name="重叠图像对",
        chapter="ch2-stitch",
        task="图像拼接",
        modality="RGB 图像对",
        description="两张存在重叠区域的图像，用于特征匹配、RANSAC 与全景拼接。",
        class_names=["pair"],
        example_image="stereo_pairs/example.jpg",
    ),
    DatasetMeta(
        id="detection_scene",
        name="带标注场景图",
        chapter="ch5",
        task="检测",
        modality="RGB 图像 + 边界框标注",
        description="用于边界框格式、IoU、NMS 与检测结果叠加演示。",
        class_names=["person", "car", "bicycle"],
        example_image="detection_scene/example.jpg",
    ),
    DatasetMeta(
        id="cifar10_subset",
        name="CIFAR-10 子集（64×64）",
        chapter="ch3",
        task="分类",
        modality="RGB 图像 64×64",
        description="从 CIFAR-10 按类别抽样：每类 200 张训练、50 张测试（共 2500 张，64×64），用于 ResNet / ConvNeXt / MobileNetV4 / RepViT 现场训练与预训练微调对比。",
        class_names=[
            "airplane", "automobile", "bird", "cat", "deer",
            "dog", "frog", "horse", "ship", "truck",
        ],
        source="torchvision CIFAR-10",
    ),
    DatasetMeta(
        id="cifar100_subset",
        name="CIFAR-100 子集（64×64）",
        chapter="ch3",
        task="分类",
        modality="RGB 图像 64×64",
        description="从 CIFAR-100 的 100 类中每类抽样 20 张训练、5 张测试（共 2500 张，64×64），用于演示细粒度多分类下的迁移学习效果。",
        class_names=[
            "apple", "aquarium_fish", "baby", "bear", "beaver", "bed", "bee", "beetle",
            "bicycle", "bottle", "bowl", "boy", "bridge", "bus", "butterfly", "camel",
            "can", "castle", "caterpillar", "cattle", "chair", "chimpanzee", "clock", "cloud",
            "cockroach", "couch", "crab", "crocodile", "cup", "dinosaur", "dolphin", "elephant",
            "flatfish", "forest", "fox", "girl", "hamster", "house", "kangaroo", "keyboard",
            "lamp", "lawn_mower", "leopard", "lion", "lizard", "lobster", "man", "maple_tree",
            "motorcycle", "mountain", "mouse", "mushroom", "oak_tree", "orange", "orchid", "otter",
            "palm_tree", "pear", "pickup_truck", "pine_tree", "plain", "plate", "poppy", "porcupine",
            "possum", "rabbit", "raccoon", "ray", "road", "rocket", "rose", "sea",
            "seal", "shark", "shrew", "skunk", "skyscraper", "snail", "snake", "spider",
            "squirrel", "streetcar", "sunflower", "sweet_pepper", "table", "tank", "telephone", "television",
            "tiger", "tractor", "train", "trout", "tulip", "turtle", "wardrobe", "whale",
            "willow_tree", "wolf", "woman", "worm",
        ],
        source="torchvision CIFAR-100",
    ),
    DatasetMeta(
        id="biometric_samples",
        name="人脸 / 指纹 / 虹膜样例",
        chapter="ch6",
        task="识别",
        modality="RGB / 灰度图像",
        description="用于关键点对齐、特征嵌入投影与匹配距离演示。",
        class_names=["face", "fingerprint", "iris"],
        example_image="biometric_samples/example.jpg",
    ),
]


def _register_builtin_datasets() -> None:
    for meta in _BUILTIN_DATASETS:
        dataset_registry.register(BaseDataset(meta))


_register_builtin_datasets()
