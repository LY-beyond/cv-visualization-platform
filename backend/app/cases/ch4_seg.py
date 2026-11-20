"""第 4 章语义分割案例：K-Means、Canny、阈值对比、SLIC 与掩码叠加。"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

from app.algorithms import numpy_ops
from app.cases.base import BaseCase
from app.cases.imaging import (
    chart_item,
    colorize,
    image_item,
    load_image,
    montage,
    param_float,
    param_int,
    shapes_image,
    to_data_url,
)
from app.schemas.common import CaseOutput


def _downscale(image: np.ndarray, max_width: int = 320) -> Tuple[np.ndarray, float]:
    height, width = image.shape[:2]
    if width <= max_width:
        return image.copy(), 1.0
    scale = max_width / width
    return cv2.resize(image, (max_width, max(1, int(height * scale))), interpolation=cv2.INTER_AREA), scale


def _kmeans_frames(pixels: np.ndarray, k: int, max_iter: int):
    """逐轮记录聚类状态，便于前端回放分割迭代过程。"""
    rng = np.random.default_rng(3)
    indices = rng.choice(len(pixels), size=k, replace=False)
    centers = pixels[indices].copy()
    labels = np.zeros(len(pixels), dtype=np.int32)
    history: List[float] = []
    frames: List[Tuple[int, np.ndarray, np.ndarray]] = []
    used_iterations = 0

    for iteration in range(1, max_iter + 1):
        distances = ((pixels[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        labels = distances.argmin(axis=1)
        sse = float(distances[np.arange(len(pixels)), labels].sum()) / len(pixels)
        history.append(round(sse, 2))
        new_centers = np.array([
            pixels[labels == index].mean(axis=0) if np.any(labels == index) else centers[index]
            for index in range(k)
        ])
        shift = float(np.linalg.norm(new_centers - centers))
        centers = new_centers
        used_iterations = iteration
        if iteration <= 4 or iteration in (6, 8, 12, 20, 30) or iteration == max_iter or shift < 0.5:
            frames.append((iteration, labels.copy(), centers.copy()))
        if shift < 0.5:
            break
    return labels, centers, frames, history, used_iterations


def _quantize(labels: np.ndarray, centers: np.ndarray, shape: Tuple[int, int]) -> np.ndarray:
    quantized = centers[labels].reshape(shape[0], shape[1], 3)
    return np.clip(quantized, 0, 255).astype(np.uint8)


class KMeansSegCase(BaseCase):
    """K-Means 像素聚类分割与迭代帧回放。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, shapes_image())
        k = param_int(params, "k", 6, 2, 16)
        max_iter = param_int(params, "max_iter", 20, 1, 60)
        engine = str(params.get("engine", "opencv"))
        small, scale = _downscale(src, 300)
        pixels = small.reshape(-1, 3).astype(np.float32)

        if engine == "numpy":
            labels, centers, frames, history, used = numpy_ops.kmeans_pixels(pixels, k, max_iter)
        else:
            labels, centers, frames, history, used = _kmeans_frames(pixels, k, max_iter)
        segmented = _quantize(labels, centers, small.shape[:2])
        segmented_full = cv2.resize(segmented, (src.shape[1], src.shape[0]), interpolation=cv2.INTER_NEAREST)

        # 用聚类中心构造掩码：与背景中心差异最大的簇视为前景
        center_l2 = np.linalg.norm(centers - centers.mean(axis=0), axis=1)
        foreground = int(np.argmax(center_l2))
        mask = (labels == foreground).reshape(small.shape[:2]).astype(np.uint8) * 255
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        mask_full = cv2.resize(mask, (src.shape[1], src.shape[0]), interpolation=cv2.INTER_NEAREST)

        frame_items: List[Dict[str, Any]] = []
        interesting = frames[:4] if len(frames) <= 4 else frames[:3] + [frames[-1]]
        for iteration, frame_labels, frame_centers in interesting:
            frame_image = _quantize(frame_labels, frame_centers, small.shape[:2])
            frame_items.append({
                "title": f"第 {iteration} 轮",
                "description": f"簇内平方误差均值 {history[min(iteration, len(history)) - 1]}",
                "formula": "labels = argmin_k ||x − μ_k||²，μ_k = mean(C_k)",
                "image": to_data_url(frame_image),
            })

        option = {
            "tooltip": {"trigger": "axis"},
            "grid": {"left": 52, "right": 20, "top": 30, "bottom": 30},
            "xAxis": {"type": "category", "data": [f"{index + 1}" for index in range(len(history))], "name": "轮次"},
            "yAxis": {"type": "value", "name": "SSE"},
            "series": [{"type": "line", "smooth": True, "data": history, "itemStyle": {"color": "#2563eb"}}],
        }
        metrics = {
            "实现方式": "NumPy 手写" if engine == "numpy" else "OpenCV",
            "簇数 K": k,
            "实际迭代": used,
            "最终 SSE": history[-1] if history else "-",
            "前景簇": f"第 {foreground} 簇",
            "前景像素占比": f"{float((mask > 0).mean()) * 100:.1f}%",
        }
        images = [
            image_item("分割结果", segmented_full, "每个像素用所属簇中心颜色替换"),
            image_item("前景掩码", mask_full, "取与平均颜色差异最大的簇作为前景"),
            image_item("原始图像", src),
        ]
        return CaseOutput(images=images, charts=[chart_item("簇内误差收敛曲线", option)],
                          steps=frame_items, metrics=metrics,
                          message="K-Means 仅依据颜色聚类，缺少空间约束，可对比 SLIC 超像素结果。")


class CannyStepsCase(BaseCase):
    """Canny 四阶段分步演示。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, shapes_image())
        low = param_int(params, "low", 50, 0, 255)
        high = param_int(params, "high", 150, 0, 255)
        sigma = param_float(params, "sigma", 1.4, 0.5, 4.0)
        engine = str(params.get("engine", "opencv"))
        if low >= high:
            low, high = min(low, high), max(low, high) + 1

        if engine == "numpy":
            gray = numpy_ops.bgr_to_gray(src)
            result = numpy_ops.canny_steps(gray, low, high, sigma)
            low = int(result["low"][0])
            high = int(result["high"][0])
            ksize = int(result["kernel_size"][0])
            blurred = np.clip(result["blurred"], 0, 255).astype(np.uint8)
            magnitude = result["magnitude"]
            nms = result["suppressed"]
            strong = result["strong"]
            edges = result["edges"]
        else:
            gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
            ksize = int(2 * round(3 * sigma) + 1)
            blurred = cv2.GaussianBlur(gray, (ksize, ksize), sigma)
            gx = cv2.Sobel(blurred, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(blurred, cv2.CV_32F, 0, 1, ksize=3)
            magnitude = cv2.magnitude(gx, gy)
            angle = (np.degrees(np.arctan2(gy, gx)) + 180.0) % 180.0

            quantized = (np.round(angle / 45.0).astype(np.int32)) % 4
            padded = np.pad(magnitude, 1, mode="constant")
            left = padded[1:-1, :-2]
            right = padded[1:-1, 2:]
            up = padded[:-2, 1:-1]
            down = padded[2:, 1:-1]
            upper_left = padded[:-2, :-2]
            lower_right = padded[2:, 2:]
            upper_right = padded[:-2, 2:]
            lower_left = padded[2:, :-2]
            first = np.choose(quantized, [left, upper_left, up, upper_right])
            second = np.choose(quantized, [right, lower_right, down, lower_left])
            nms = np.where((magnitude >= first) & (magnitude >= second), magnitude, 0.0)

            strong = nms >= high
            weak = nms >= low
            count, component = cv2.connectedComponents(weak.astype(np.uint8), connectivity=8)
            keep_labels = np.unique(component[strong])
            edges = np.isin(component, keep_labels) & weak
        edge_map = (edges.astype(np.uint8) * 255)

        overlay = src.copy()
        overlay[edges] = (40, 40, 230)

        metrics = {
            "实现方式": "NumPy 手写" if engine == "numpy" else "OpenCV",
            "高斯核": f"{ksize} × {ksize}（σ={sigma}）",
            "低阈值": low,
            "高阈值": high,
            "强边缘像素": int(strong.sum()),
            "最终边缘像素": int(edges.sum()),
            "边缘占比": f"{float(edges.mean()) * 100:.2f}%",
        }
        steps = [
            {"title": "① 高斯平滑", "description": f"使用 {ksize}×{ksize} 高斯核抑制噪声，避免把噪点判为边缘。",
             "formula": "G(x,y) = exp(−(x²+y²) / (2σ²))",
             "image": to_data_url(blurred)},
            {"title": "② 梯度计算", "description": "Sobel 算子求水平与垂直梯度，合成幅值与方向。",
             "formula": "|∇I| = √(Gx² + Gy²)，θ = arctan(Gy / Gx)",
             "image": to_data_url(colorize(magnitude))},
            {"title": "③ 非极大值抑制", "description": "沿梯度方向比较相邻像素，只保留局部极大值，细化边缘。",
             "formula": "保留 M(x,y) ≥ M(x±1,y±1) 的像素",
             "image": to_data_url(colorize(nms))},
            {"title": "④ 双阈值连接", "description": f"高于 {high} 为强边缘，介于 {low}~{high} 且与强边缘连通则保留。",
             "formula": "E = Strong ∪ (Weak ∩ Connected(Strong))",
             "image": to_data_url(edge_map)},
        ]
        images = [
            image_item("Canny 边缘", edge_map),
            image_item("边缘叠加", overlay, "红色为检测到的边缘像素"),
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="调低阈值可保留更多细节，但也会引入更多由纹理产生的伪边缘。")


def _iterative_threshold(gray: np.ndarray) -> int:
    threshold = int(gray.mean())
    for _ in range(60):
        lower = gray[gray <= threshold]
        upper = gray[gray > threshold]
        if lower.size == 0 or upper.size == 0:
            break
        updated = int(round((lower.mean() + upper.mean()) / 2))
        if abs(updated - threshold) < 1:
            threshold = updated
            break
        threshold = updated
    return threshold


class ThresholdCompareCase(BaseCase):
    """固定阈值、Otsu、迭代阈值与自适应阈值并排对比。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, shapes_image())
        fixed = param_int(params, "threshold", 128, 0, 255)
        engine = str(params.get("engine", "opencv"))
        gray = (
            numpy_ops.bgr_to_gray(src)
            if engine == "numpy"
            else cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
        )

        if engine == "numpy":
            fixed_mask = (gray > fixed).astype(np.uint8) * 255
            otsu_value = numpy_ops.otsu_threshold(gray)
            otsu_mask = (gray > otsu_value).astype(np.uint8) * 255
            iterative_value = numpy_ops.iterative_threshold(gray)
            iterative_mask = (gray > iterative_value).astype(np.uint8) * 255
        else:
            _, fixed_mask = cv2.threshold(gray, fixed, 255, cv2.THRESH_BINARY)
            otsu_value, otsu_mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            iterative_value = _iterative_threshold(gray)
            _, iterative_mask = cv2.threshold(gray, iterative_value, 255, cv2.THRESH_BINARY)
        adaptive_mask = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 31, 5,
        )

        canvas = montage([
            ("FIXED T=%d" % fixed, fixed_mask),
            ("OTSU T=%d" % int(otsu_value), otsu_mask),
            ("ITERATIVE T=%d" % iterative_value, iterative_mask),
            ("ADAPTIVE 31x31", adaptive_mask),
        ], cols=2, cell=(320, 240))

        metrics = {
            "实现方式": "NumPy 手写" if engine == "numpy" else "OpenCV",
            "固定阈值": fixed,
            "Otsu 阈值": int(otsu_value),
            "迭代阈值": iterative_value,
            "自适应窗口": "31 × 31",
            "前景占比(固定)": f"{float((fixed_mask > 0).mean()) * 100:.1f}%",
            "前景占比(Otsu)": f"{float((otsu_mask > 0).mean()) * 100:.1f}%",
        }
        images = [
            image_item("四种阈值方法对比", canvas),
            image_item("原始图像", src),
        ]
        steps = [
            {"title": "固定阈值", "description": "直接指定 T，实现简单，但对光照变化敏感。",
             "formula": "g(x) = 255 if f(x) > T else 0"},
            {"title": "Otsu 双峰法", "description": "遍历灰度级最大化类间方差，自动选取全局最优阈值。",
             "formula": "T* = argmax_T σ²_b(T) = ω0(μ0−μ)² + ω1(μ1−μ)²"},
            {"title": "迭代阈值", "description": "以均值为初值，反复用两侧均值更新，直到收敛。",
             "formula": "T_{k+1} = (mean(f ≤ T_k) + mean(f > T_k)) / 2"},
            {"title": "自适应阈值", "description": "逐像素比较邻域均值，适合光照不均的图像。",
             "formula": "g(x) = 255 if f(x) > mean(N(x)) − C else 0"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="拖动固定阈值可观察其与 Otsu、自适应方法结果的差异。")


def _slic(image: np.ndarray, segments: int, compactness: float, iterations: int = 4) -> np.ndarray:
    height, width = image.shape[:2]
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
    step = max(6, int(math.sqrt(height * width / max(segments, 1))))
    centers = []
    for cy in range(step // 2, height, step):
        for cx in range(step // 2, width, step):
            centers.append([float(cx), float(cy), *lab[cy, cx].tolist()])
    centers = np.array(centers, dtype=np.float32)

    labels = -np.ones((height, width), dtype=np.int32)
    distances = np.full((height, width), np.inf, dtype=np.float32)
    spatial_weight = (compactness * compactness) / float(step * step)

    for _ in range(iterations):
        for index, center in enumerate(centers):
            cx, cy = int(center[0]), int(center[1])
            x0, x1 = max(0, cx - step), min(width, cx + step + 1)
            y0, y1 = max(0, cy - step), min(height, cy + step + 1)
            ys, xs = np.mgrid[y0:y1, x0:x1]
            color_distance = ((lab[y0:y1, x0:x1] - center[2:]) ** 2).sum(axis=2)
            spatial_distance = (xs - cx) ** 2 + (ys - cy) ** 2
            total = color_distance + spatial_weight * spatial_distance
            window = total < distances[y0:y1, x0:x1]
            if not np.any(window):
                continue
            distances[y0:y1, x0:x1][window] = total[window]
            labels[y0:y1, x0:x1][window] = index

        updated = []
        for index in range(len(centers)):
            pixels = np.where(labels == index)
            if pixels[0].size == 0:
                updated.append(centers[index])
                continue
            updated.append([float(pixels[1].mean()), float(pixels[0].mean()),
                            *lab[pixels[0], pixels[1]].mean(axis=0).tolist()])
        centers = np.array(updated, dtype=np.float32)
        distances.fill(np.inf)

    boundaries = np.zeros((height, width), dtype=np.uint8)
    boundaries[:, :-1] |= (labels[:, :-1] != labels[:, 1:]).astype(np.uint8)
    boundaries[:-1, :] |= (labels[:-1, :] != labels[1:, :]).astype(np.uint8)
    return boundaries * 255


class SlicDemoCase(BaseCase):
    """SLIC 超像素划分。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, shapes_image())
        segments = param_int(params, "segments", 200, 20, 800)
        compactness = param_float(params, "compactness", 10, 1, 50)
        small, _ = _downscale(src, 320)
        boundaries = _slic(small, segments, compactness)

        overlay = small.copy()
        overlay[boundaries > 0] = (255, 255, 255)
        overlay = cv2.addWeighted(overlay, 0.85, small, 0.15, 0)
        metrics = {
            "期望超像素数": segments,
            "紧凑度": compactness,
            "两侧像素宽": max(6, int(math.sqrt(small.shape[0] * small.shape[1] / segments))),
            "边界像素占比": f"{float((boundaries > 0).mean()) * 100:.2f}%",
        }
        images = [
            image_item("超像素边界", overlay, "白色为不同超像素之间的边界"),
            image_item("原始图像", small),
        ]
        steps = [
            {"title": "初始化种子", "description": "按固定步长均匀撒点，每个种子代表一个超像素中心。"},
            {"title": "距离度量", "description": "颜色距离与空间距离加权组合，紧凑度越大空间约束越强。"},
            {"title": "局部迭代", "description": "仅在种子附近窗口内比较，快速收敛到颜色相近且位置相邻的区域。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="SLIC 生成的超像素可作为分割、跟踪等任务的预处理单元。")


class MaskOverlayCase(BaseCase):
    """分割掩码半透明叠加。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, shapes_image())
        alpha = param_float(params, "alpha", 0.5, 0.1, 0.9)
        gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        kernel = np.ones((5, 5), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        count, labels = cv2.connectedComponents(binary)
        palette = [
            (60, 130, 240), (80, 200, 120), (230, 200, 60),
            (200, 90, 200), (60, 190, 220), (240, 120, 80),
        ]
        colored = np.zeros_like(src)
        for index in range(1, count):
            colored[labels == index] = palette[(index - 1) % len(palette)]

        mask = (binary > 0)
        overlay = src.astype(np.float32).copy()
        overlay[mask] = (1 - alpha) * overlay[mask] + alpha * colored[mask].astype(np.float32)
        overlay = np.clip(overlay, 0, 255).astype(np.uint8)

        metrics = {
            "透明度 α": alpha,
            "分割区域数": max(0, count - 1),
            "前景像素占比": f"{float(mask.mean()) * 100:.1f}%",
            "二值化方法": "Otsu + 形态学开闭",
        }
        images = [
            image_item("掩码叠加", overlay, "不同连通区域使用不同颜色"),
            image_item("二值掩码", binary),
            image_item("原始图像", src),
        ]
        steps = [
            {"title": "生成掩码", "description": "Otsu 二值化后用开闭运算去噪并填补空洞。"},
            {"title": "区域着色", "description": "连通域分析为每个目标分配独立颜色。"},
            {"title": "透明叠加", "description": "Result = (1-α)·原图 + α·彩色掩码，参数 α 控制叠加强度。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="拖动透明度可对比原图与分割结果的对应关系。")
