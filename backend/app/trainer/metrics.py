"""评估指标计算工具：分类准确率、混淆矩阵、IoU 等。"""

from typing import Dict, List, Sequence, Tuple

import numpy as np


def accuracy(predictions: Sequence[int], targets: Sequence[int]) -> float:
    if not targets:
        return 0.0
    hits = sum(1 for pred, target in zip(predictions, targets) if pred == target)
    return hits / len(targets)


def cluster_label_mapping(
    cluster_ids: Sequence[int],
    targets: Sequence[int],
    num_clusters: int,
    num_classes: int,
) -> Dict[int, int]:
    """把无监督簇映射到类别：匈牙利匹配最大化重合样本，未匹配簇取多数类。"""
    counts = np.zeros((num_clusters, num_classes), dtype=np.int64)
    for cluster, target in zip(cluster_ids, targets):
        if 0 <= target < num_classes and 0 <= cluster < num_clusters:
            counts[int(cluster), int(target)] += 1

    mapping: Dict[int, int] = {}
    if counts.size:
        try:
            from scipy.optimize import linear_sum_assignment

            rows, cols = linear_sum_assignment(-counts)
            mapping = {int(row): int(col) for row, col in zip(rows, cols)}
        except ImportError:  # 缺少 scipy 时退化为每簇取多数类
            mapping = {index: int(row.argmax()) for index, row in enumerate(counts)}

    for cluster in range(num_clusters):
        if cluster not in mapping:
            mapping[cluster] = int(counts[cluster].argmax()) if counts.any() else 0
    return mapping


def confusion_matrix(
    predictions: Sequence[int], targets: Sequence[int], num_classes: int
) -> List[List[int]]:
    matrix = [[0 for _ in range(num_classes)] for _ in range(num_classes)]
    for pred, target in zip(predictions, targets):
        if 0 <= target < num_classes and 0 <= pred < num_classes:
            matrix[target][pred] += 1
    return matrix


def box_iou(box_a: Tuple[float, float, float, float], box_b: Tuple[float, float, float, float]) -> float:
    """计算两个 xyxy 边界框的交并比。"""
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    inter_x1, inter_y1 = max(ax1, bx1), max(ay1, by1)
    inter_x2, inter_y2 = min(ax2, bx2), min(ay2, by2)
    inter_w, inter_h = max(0.0, inter_x2 - inter_x1), max(0.0, inter_y2 - inter_y1)
    intersection = inter_w * inter_h
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - intersection
    return intersection / union if union > 0 else 0.0
