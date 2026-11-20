"""离线生成内置小样本数据集。

生成两类数据：
1. mnist_subset：以 scikit-learn 自带的手写数字集（8×8）为底，放大到 28×28。
2. cifar10_subset / cifar100_subset：用 torchvision 下载 CIFAR 原始数据后，
   按类别抽样导出 64×64 PNG，供 ConvNeXt / MobileNetV4 等现代骨干现场训练。

用法（在 backend 目录下）：
    .venv\\Scripts\\python.exe scripts\\prepare_datasets.py
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.datasets import load_digits

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_DIR = BASE_DIR / "storage" / "datasets" / "mnist_subset"
RAW_DIR = BASE_DIR / ".cache" / "cifar"

SIZE = 28
TRAIN_PER_CLASS = 50
TEST_PER_CLASS = 10
SEED = 42

CIFAR_SIZE = 64


def to_image(pixels: np.ndarray) -> Image.Image:
    """把 8×8、取值 0~16 的像素放大到 28×28 灰度图。"""
    scaled = np.clip(pixels / 16.0 * 255.0, 0, 255).astype(np.uint8)
    image = Image.fromarray(scaled, mode="L")
    return image.resize((SIZE, SIZE), Image.BICUBIC)


def export_cifar(cls, dataset_id: str, train_per_class: int, test_per_class: int) -> None:
    """下载 CIFAR 并导出按类别抽样的 PNG 子集与 manifest。"""
    from torchvision.datasets import CIFAR10, CIFAR100

    target = BASE_DIR / "storage" / "datasets" / dataset_id
    raw_train = cls(root=str(RAW_DIR), train=True, download=True)
    raw_test = cls(root=str(RAW_DIR), train=False, download=True)

    rng = np.random.default_rng(SEED)
    manifest = {"dataset_id": dataset_id, "splits": {"train": [], "test": []}}
    for split, raw, per_class in (
        ("train", raw_train, train_per_class),
        ("test", raw_test, test_per_class),
    ):
        targets = np.asarray(raw.targets)
        for label in range(len(raw.classes)):
            indices = np.where(targets == label)[0]
            rng.shuffle(indices)
            folder = target / split / str(label)
            folder.mkdir(parents=True, exist_ok=True)
            for order, index in enumerate(indices[:per_class]):
                image = Image.fromarray(raw.data[index]).resize(
                    (CIFAR_SIZE, CIFAR_SIZE), Image.BICUBIC
                )
                name = f"{label}_{order:03d}.png"
                image.save(folder / name)
                manifest["splits"][split].append(
                    {"path": f"{split}/{label}/{name}", "label": int(label)}
                )

    (target / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"{dataset_id} 生成完成：训练 {len(manifest['splits']['train'])} 张，"
        f"测试 {len(manifest['splits']['test'])} 张"
    )


def main() -> None:
    rng = np.random.default_rng(SEED)
    digits = load_digits()
    images, targets = digits.images, digits.target

    manifest = {"dataset_id": "mnist_subset", "splits": {"train": [], "test": []}}
    for label in range(10):
        indices = np.where(targets == label)[0]
        rng.shuffle(indices)
        need = TRAIN_PER_CLASS + TEST_PER_CLASS
        if len(indices) < need:
            raise RuntimeError(f"类别 {label} 样本不足：{len(indices)} < {need}")

        for split, chosen in (
            ("train", indices[:TRAIN_PER_CLASS]),
            ("test", indices[TRAIN_PER_CLASS:need]),
        ):
            folder = DATASET_DIR / split / str(label)
            folder.mkdir(parents=True, exist_ok=True)
            for order, index in enumerate(chosen):
                name = f"{label}_{order:03d}.png"
                to_image(images[index]).save(folder / name)
                manifest["splits"][split].append(
                    {"path": f"{split}/{label}/{name}", "label": int(label)}
                )

    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    (DATASET_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"mnist_subset 生成完成：训练 {len(manifest['splits']['train'])} 张，"
        f"测试 {len(manifest['splits']['test'])} 张"
    )

    from torchvision.datasets import CIFAR10, CIFAR100

    # 单轮 CPU 训练耗时约 40–80 秒，控制样本量保证 3 轮内不触发 300 秒上限
    export_cifar(CIFAR10, "cifar10_subset", train_per_class=200, test_per_class=50)
    export_cifar(CIFAR100, "cifar100_subset", train_per_class=20, test_per_class=5)


if __name__ == "__main__":
    main()
