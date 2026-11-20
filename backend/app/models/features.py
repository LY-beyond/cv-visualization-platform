"""传统算法的特征公用工具：读取划分图片与二维投影。

K-Means、SVM、BoW 都需要把数据集样本转成统一尺寸的灰度数组，
以及把高维特征压到二维供前端散点展示。
"""

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError

from app.core.config import TRAIN_MAX_SAMPLES
from app.core.paths import dataset_dir
from app.datasets.base import BaseDataset

INPUT_SIZE = 28
EMBEDDING_LIMIT = 300


def load_split_images(
    dataset: BaseDataset,
    split: str = "train",
    limit: Optional[int] = None,
) -> Tuple[np.ndarray, np.ndarray, List[int]]:
    """读取指定划分为 [N,28,28] 的浮点数组、标签与原始样本下标。

    默认训练划分受 TRAIN_MAX_SAMPLES 限制；下标用于拼接错误样例图片链接。
    """
    root = dataset_dir(dataset.meta.id)
    records = dataset.samples(split)
    if limit is not None and limit > 0:
        records = records[:limit]
    elif split == "train":
        records = records[:TRAIN_MAX_SAMPLES]

    images: List[np.ndarray] = []
    labels: List[int] = []
    positions: List[int] = []
    for index, raw in enumerate(records):
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
        positions.append(index)

    if not images:
        return (
            np.zeros((0, INPUT_SIZE, INPUT_SIZE), dtype=np.float32),
            np.zeros((0,), dtype=np.int64),
            [],
        )
    return (
        np.stack(images).astype(np.float32),
        np.asarray(labels, dtype=np.int64),
        positions,
    )


def flatten_images(images: np.ndarray) -> np.ndarray:
    """把 [N,28,28] 拉平为 [N,784] 特征矩阵。"""
    return images.reshape(images.shape[0], -1)


def project_2d(
    features: np.ndarray,
    labels: np.ndarray,
    class_names: List[str],
    limit: int = EMBEDDING_LIMIT,
    method: str = "pca",
) -> List[Dict[str, Any]]:
    """把高维特征投影到二维散点，返回 [{"x","y","label"}]。"""
    if features.shape[0] == 0:
        return []
    sample = features[:limit]
    coords: np.ndarray
    try:
        if method == "tsne" and sample.shape[0] > 5:
            from sklearn.manifold import TSNE

            perplexity = min(30, sample.shape[0] - 1)
            coords = TSNE(
                n_components=2, random_state=0, perplexity=perplexity, init="pca"
            ).fit_transform(sample)
        else:
            from sklearn.decomposition import PCA

            if sample.shape[0] >= 2:
                coords = PCA(n_components=2, random_state=0).fit_transform(sample)
            else:
                coords = np.zeros((sample.shape[0], 2), dtype=np.float32)
    except Exception:  # noqa: BLE001 投影失败不影响评估主体结果
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
