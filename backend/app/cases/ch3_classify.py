"""第 3 章图像分类后端案例：模型对比、混淆矩阵与错误样例、特征嵌入投影。

优先读取本地训练任务保存的真实评估结果；无结果时回退到明确标注的示例数据，
保证断网答辩时案例仍可演示。
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.cases.base import BaseCase
from app.cases.imaging import chart_item, image_item, montage, param_str
from app.datasets.registry import dataset_registry
from app.models.features import flatten_images, load_split_images, project_2d
from app.models.registry import model_registry
from app.schemas.common import CaseOutput
from app.trainer.manager import task_manager

_CLASS_COUNT = 10


def _dataset_id(params: Dict[str, Any]) -> str:
    return param_str(params, "dataset", "mnist_subset")


def _demo_matrix(accuracy: float) -> List[List[int]]:
    """按给定准确率构造 10×10 混淆矩阵，共 100 个测试样本。"""
    matrix = [[0 for _ in range(_CLASS_COUNT)] for _ in range(_CLASS_COUNT)]
    for label in range(_CLASS_COUNT):
        correct = int(round(accuracy * 10))
        matrix[label][label] = correct
        for offset in range(_CLASS_COUNT - correct):
            matrix[label][(label + 1 + offset) % _CLASS_COUNT] += 1
    return matrix


def _demo_items() -> List[Dict[str, Any]]:
    specs = [
        ("svm", "SVM（RBF 核）", "约 1.2 万支持向量", 0.94),
        ("lenet5", "LeNet-5", "约 6.2 万参数", 0.91),
        ("kmeans", "K-Means", "K=10，无监督聚类", 0.63),
    ]
    return [
        {
            "task_id": "demo",
            "model_id": model_id,
            "name": name,
            "params": params,
            "accuracy": accuracy,
            "top5": None,
            "confusion_matrix": _demo_matrix(accuracy),
            "class_names": [str(index) for index in range(_CLASS_COUNT)],
            "error_samples": [],
            "embedding": [],
            "finished_at": None,
        }
        for model_id, name, params, accuracy in specs
    ]


def _latest_items(dataset_id: str) -> Tuple[List[Dict[str, Any]], bool]:
    """返回数据集上各模型最近一次评估；第二个返回值表示是否使用了示例数据。"""
    items: List[Dict[str, Any]] = []
    for task in task_manager.latest_evaluations(dataset_id):
        evaluation = task.evaluation or {}
        try:
            meta = model_registry.get(task.model_id).meta
            name = meta.name
            params_text = meta.params
        except Exception:  # noqa: BLE001 模型下线后仍可展示历史结果
            name, params_text = task.model_id, ""
        items.append(
            {
                "task_id": task.id,
                "model_id": task.model_id,
                "name": name,
                "params": params_text,
                "accuracy": evaluation.get("accuracy"),
                "top5": evaluation.get("top5_accuracy"),
                "confusion_matrix": evaluation.get("confusion_matrix") or [],
                "class_names": evaluation.get("class_names") or [],
                "error_samples": evaluation.get("error_samples") or [],
                "embedding": evaluation.get("embedding") or [],
                "finished_at": task.finished_at,
            }
        )
    if items:
        return items, False
    return _demo_items(), True


def _heatmap(matrix: List[List[int]], title: str) -> np.ndarray:
    count = len(matrix)
    cell = 30
    margin = 34
    size = count * cell
    canvas = np.full((size + margin, size + margin, 3), 255, dtype=np.uint8)

    normalized = np.zeros((count, count), dtype=np.uint8)
    maximum = max((max(row) for row in matrix), default=0) or 1
    for row in range(count):
        for col in range(count):
            normalized[row, col] = int(255 * matrix[row][col] / maximum)
    # 自建由白到深蓝的色带（BGR），避免依赖不同 OpenCV 版本的 COLORMAP 常量
    ratio = normalized.astype(np.float32) / 255.0
    colored = np.zeros((count, count, 3), dtype=np.uint8)
    colored[..., 0] = (255 - 148 * ratio).astype(np.uint8)
    colored[..., 1] = (255 - 207 * ratio).astype(np.uint8)
    colored[..., 2] = (255 - 247 * ratio).astype(np.uint8)
    colored = cv2.resize(colored, (size, size), interpolation=cv2.INTER_NEAREST)
    canvas[margin:, margin:] = colored

    for index in range(count):
        position = margin + int((index + 0.5) * cell)
        cv2.putText(canvas, str(index), (position - 4, margin - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.34, (90, 90, 90), 1, cv2.LINE_AA)
        cv2.putText(canvas, str(index), (4, position + 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.34, (90, 90, 90), 1, cv2.LINE_AA)
        cv2.putText(canvas, "pred", (margin + size + 2, margin - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (120, 120, 120), 1, cv2.LINE_AA)
        cv2.putText(canvas, "true", (2, 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (120, 120, 120), 1, cv2.LINE_AA)

    for row in range(count):
        for col in range(count):
            value = matrix[row][col]
            if value == 0:
                continue
            strength = value / maximum
            color = (255, 255, 255) if strength > 0.5 else (30, 30, 30)
            text = str(value)
            x = margin + col * cell + max(2, (cell - 6 * len(text)) // 2)
            y = margin + row * cell + cell // 2 + 4
            cv2.putText(canvas, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.32, color, 1, cv2.LINE_AA)

    cv2.putText(canvas, title, (margin, size + margin + 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (60, 60, 60), 1, cv2.LINE_AA)
    return canvas


def _class_recalls(matrix: List[List[int]], names: List[str]) -> Tuple[List[str], List[float]]:
    labels: List[str] = []
    recalls: List[float] = []
    for index, row in enumerate(matrix):
        total = sum(row)
        recalls.append(round(row[index] / total * 100, 1) if total else 0.0)
        labels.append(names[index] if index < len(names) else str(index))
    return labels, recalls


def _error_montage(items: List[Dict[str, Any]], dataset_id: str) -> Optional[np.ndarray]:
    try:
        dataset = dataset_registry.get(dataset_id)
    except Exception:  # noqa: BLE001 数据集不可用时跳过错误样例
        return None

    tiles: List[Tuple[str, np.ndarray]] = []
    for sample in items[:8]:
        index = sample.get("index")
        if not isinstance(index, int):
            continue
        try:
            path = dataset.image_path(index, "test")
            image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
        except Exception:  # noqa: BLE001 个别样本缺失不影响其余展示
            continue
        if image is None:
            continue
        image = cv2.resize(image, (96, 96), interpolation=cv2.INTER_AREA)
        tiles.append((f"t{sample.get('true_label')} p{sample.get('predicted_label')}", image))
    if not tiles:
        return None
    return montage(tiles, cols=min(4, len(tiles)), cell=(120, 128))


class ModelCompareCase(BaseCase):
    """同一数据集下多个模型的准确率与混淆矩阵对比。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        dataset_id = _dataset_id(params)
        items, is_demo = _latest_items(dataset_id)
        items = [item for item in items if item["confusion_matrix"]]

        heatmaps = [
            (f"{item['model_id']} {item['accuracy']:.0%}" if item["accuracy"] is not None else item["model_id"],
             _heatmap(item["confusion_matrix"], item["model_id"]))
            for item in items
        ]
        chart_option = {
            "tooltip": {"trigger": "axis"},
            "grid": {"left": 56, "right": 20, "top": 30, "bottom": 34},
            "xAxis": {"type": "category", "data": [item["name"] for item in items], "axisLabel": {"interval": 0}},
            "yAxis": {"type": "value", "name": "Top-1 准确率 (%)", "max": 100},
            "series": [{
                "type": "bar",
                "barWidth": "46%",
                "data": [round((item["accuracy"] or 0) * 100, 1) for item in items],
                "itemStyle": {"color": "#2563eb"},
                "label": {"show": True, "position": "top", "formatter": "{c}%"},
            }],
        }

        best = items[0] if items else None
        metrics: Dict[str, Any] = {
            "数据集": dataset_id,
            "对比模型数": len(items),
            "最佳模型": best["name"] if best else "-",
            "最佳准确率": f"{(best['accuracy'] or 0) * 100:.1f}%" if best else "-",
        }
        for item in items:
            metrics[f"{item['name']} 准确率"] = f"{(item['accuracy'] or 0) * 100:.1f}%"
        steps = [
            {
                "title": item["name"],
                "description": (
                    f"Top-1 {(item['accuracy'] or 0) * 100:.1f}%"
                    + (f"，Top-5 {item['top5'] * 100:.1f}%" if item["top5"] else "")
                    + f"；{item['params'] or '参数量未登记'}；任务 {item['task_id']}"
                ),
            }
            for item in items
        ]
        message = "数据来自本地最近一次训练评估，按准确率降序排列。"
        if is_demo:
            message = "本地暂无训练结果，当前展示内置示例数据；可在分类章训练模型后自动切换为真实结果。"
        return CaseOutput(
            images=[image_item("各模型混淆矩阵", montage(heatmaps, cols=2, cell=(320, 320)))] if heatmaps else [],
            charts=[chart_item("模型准确率对比", chart_option)],
            steps=steps,
            metrics=metrics,
            message=message,
        )


class ConfusionGalleryCase(BaseCase):
    """最佳模型的混淆矩阵与错误样例画廊。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        dataset_id = _dataset_id(params)
        items, is_demo = _latest_items(dataset_id)
        items = [item for item in items if item["confusion_matrix"]]
        if not items:
            raise ValueError("没有可用的评估结果，请先在分类章完成一次训练")
        best = items[0]
        matrix = best["confusion_matrix"]
        class_names = best["class_names"] or [str(index) for index in range(len(matrix))]
        labels, recalls = _class_recalls(matrix, class_names)
        total = int(sum(sum(row) for row in matrix))
        correct = int(sum(matrix[index][index] for index in range(len(matrix))))

        images = [image_item("混淆矩阵", _heatmap(matrix, best["model_id"]), "行为真实类别，列为预测类别")]
        error_montage = _error_montage(best["error_samples"], dataset_id)
        if error_montage is not None:
            images.append(
                image_item("错误样例", error_montage, "标题为 t 真实标签 / p 预测标签（测试集抽样）")
            )

        weakest = int(np.argmin(recalls)) if recalls else 0
        option = {
            "tooltip": {"trigger": "axis"},
            "grid": {"left": 48, "right": 20, "top": 30, "bottom": 34},
            "xAxis": {"type": "category", "data": labels, "name": "类别"},
            "yAxis": {"type": "value", "name": "召回率 (%)", "max": 100},
            "series": [{
                "type": "bar",
                "data": recalls,
                "itemStyle": {"color": "#10b981"},
                "label": {"show": True, "position": "top", "formatter": "{c}"},
            }],
        }
        metrics: Dict[str, Any] = {
            "数据集": dataset_id,
            "模型": best["name"],
            "准确率": f"{(best['accuracy'] or 0) * 100:.1f}%",
            "样本总数": total,
            "正确样本": correct,
            "错误样例数": len(best["error_samples"]),
            "召回最低类别": f"{labels[weakest]}（{recalls[weakest]}%）" if recalls else "-",
        }
        steps = [
            {"title": "读取评估结果", "description": f"取 {best['name']} 最近一次评估，共 {total} 个测试样本。"},
            {"title": "定位错误类型", "description": "对角线为正确预测；非对角线数值反映类别间的混淆程度。"},
            {"title": "查看错误样例", "description": "从测试集抽取被误判的样本，对照真实与预测标签分析原因。"},
        ]
        message = "混淆矩阵能看出错误集中在哪些类别对，配合错误样例可定位特征或数据问题。"
        if is_demo:
            message = "本地暂无训练结果，当前展示内置示例数据；训练后会自动展示真实混淆矩阵与错误样例。"
        return CaseOutput(images=images, charts=[chart_item("各类别召回率", option)],
                          steps=steps, metrics=metrics, message=message)


def _fallback_embedding(method: str) -> List[Dict[str, Any]]:
    rng = np.random.default_rng(5 if method == "pca" else 9)
    points: List[Dict[str, Any]] = []
    for label in range(_CLASS_COUNT):
        angle = 2 * np.pi * label / _CLASS_COUNT
        center = np.array([3.0 * np.cos(angle), 3.0 * np.sin(angle)])
        for _ in range(12):
            point = center + rng.normal(0, 0.55, size=2)
            points.append({"x": round(float(point[0]), 3), "y": round(float(point[1]), 3), "label": str(label)})
    return points


class FeatureEmbeddingCase(BaseCase):
    """把分类特征降维到二维平面，按类别着色展示分布。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        dataset_id = _dataset_id(params)
        method = param_str(params, "method", "tsne")
        points: List[Dict[str, Any]] = []
        source = "真实样本"
        try:
            dataset = dataset_registry.get(dataset_id)
            images, labels, _ = load_split_images(dataset, split="test", limit=180)
            if images.shape[0] > 5:
                class_names = list(dataset.meta.class_names) or [str(index) for index in range(_CLASS_COUNT)]
                points = project_2d(flatten_images(images), labels, class_names, limit=180, method=method)
        except Exception:  # noqa: BLE001 数据集缺失时回退到示例分布
            points = []
        if not points:
            points = _fallback_embedding(method)
            source = "示例分布"

        grouped: Dict[str, List[List[float]]] = {}
        for point in points:
            grouped.setdefault(str(point["label"]), []).append([point["x"], point["y"]])
        series = [
            {"name": label, "type": "scatter", "symbolSize": 7, "data": coords}
            for label, coords in sorted(grouped.items())
        ]
        option = {
            "tooltip": {"trigger": "item"},
            "legend": {"top": 0, "type": "scroll"},
            "grid": {"left": 48, "right": 24, "top": 44, "bottom": 34},
            "xAxis": {"type": "value", "scale": True, "name": "维度 1"},
            "yAxis": {"type": "value", "scale": True, "name": "维度 2"},
            "series": series,
        }
        label_count = len(grouped)
        metrics: Dict[str, Any] = {
            "数据集": dataset_id,
            "降维方法": "t-SNE" if method == "tsne" else "PCA",
            "样本数量": len(points),
            "类别数量": label_count,
            "数据来源": source,
        }
        steps = [
            {"title": "提取特征", "description": "使用 28×28 像素展平为 784 维向量，作为聚类与分类的输入表示。"},
            {"title": "降维投影", "description": "PCA 保留方差最大的方向，速度快；t-SNE 更关注局部邻域结构，类别分离通常更明显。"},
            {"title": "观察分布", "description": "同类样本越聚拢、异类间隔越大，说明特征判别性越强。"},
        ]
        return CaseOutput(charts=[chart_item("特征二维投影", option, height=360)],
                          steps=steps, metrics=metrics,
                          message="切换 PCA / t-SNE 可对比线性降维与非线性降维的类别分离效果。")
