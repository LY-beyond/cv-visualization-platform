"""评估指标计算工具：分类准确率、混淆矩阵、IoU 等。"""

from typing import List, Sequence, Tuple


def accuracy(predictions: Sequence[int], targets: Sequence[int]) -> float:
    if not targets:
        return 0.0
    hits = sum(1 for pred, target in zip(predictions, targets) if pred == target)
    return hits / len(targets)


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
