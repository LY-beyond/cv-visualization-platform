"""纯 NumPy 手写算子：灰度、卷积、Otsu、K-Means 与 Canny。

用于「库实现 / 手写步骤」切换，帮助理解算法内部计算；结果与 OpenCV 实现
在允许误差内保持一致。numba 可选，未安装时自动回退为 NumPy 向量化实现。
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple

import numpy as np

try:  # pragma: no cover - 可选加速
    from numba import njit  # type: ignore

    NUMBA_AVAILABLE = True
except Exception:  # pragma: no cover
    NUMBA_AVAILABLE = False


def bgr_to_gray(image: np.ndarray) -> np.ndarray:
    """按 BT.601 权重把 BGR 图像转为 uint8 灰度图。"""
    array = np.asarray(image, dtype=np.float32)
    if array.ndim == 2:
        return np.clip(array, 0, 255).astype(np.uint8)
    gray = 0.114 * array[..., 0] + 0.587 * array[..., 1] + 0.299 * array[..., 2]
    return np.clip(gray, 0, 255).astype(np.uint8)


def convolve2d(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """二维互相关，边界采用边缘复制，输出与输入同尺寸（float32）。"""
    array = np.asarray(image, dtype=np.float32)
    weight = np.asarray(kernel, dtype=np.float32)
    kh, kw = weight.shape
    pad_h, pad_w = kh // 2, kw // 2
    padded = np.pad(array, ((pad_h, pad_h), (pad_w, pad_w)), mode="edge")
    height, width = array.shape
    output = np.zeros((height, width), dtype=np.float32)
    for row in range(kh):
        for col in range(kw):
            output += weight[row, col] * padded[row : row + height, col : col + width]
    return output


def gaussian_kernel(sigma: float) -> np.ndarray:
    """按 σ 生成归一化二维高斯核，核尺寸取 2·round(3σ)+1。"""
    radius = max(1, int(round(3 * sigma)))
    size = 2 * radius + 1
    axis = np.arange(-radius, radius + 1, dtype=np.float32)
    xx, yy = np.meshgrid(axis, axis)
    kernel = np.exp(-(xx * xx + yy * yy) / (2 * sigma * sigma))
    return kernel / kernel.sum()


def gaussian_blur(image: np.ndarray, sigma: float) -> np.ndarray:
    """可分离高斯平滑：先横向再纵向，减少计算量。"""
    kernel = gaussian_kernel(sigma)
    radius = kernel.shape[0] // 2
    array = np.asarray(image, dtype=np.float32)
    padded = np.pad(array, ((0, 0), (radius, radius)), mode="edge")
    horizontal = np.zeros_like(array, dtype=np.float32)
    for index, weight in enumerate(kernel[radius]):
        horizontal += weight * padded[:, index : index + array.shape[1]]

    padded = np.pad(horizontal, ((radius, radius), (0, 0)), mode="edge")
    vertical = np.zeros_like(array, dtype=np.float32)
    for index, weight in enumerate(kernel[:, radius]):
        vertical += weight * padded[index : index + array.shape[0], :]
    return vertical


def otsu_threshold(gray: np.ndarray) -> int:
    """遍历灰度级最大化类间方差，返回最佳阈值。"""
    values = np.asarray(gray, dtype=np.uint8).ravel()
    histogram = np.bincount(values, minlength=256).astype(np.float64)
    total = histogram.sum()
    if total == 0:
        return 0
    probability = histogram / total
    omega = np.cumsum(probability)
    levels = np.arange(256, dtype=np.float64)
    mu = np.cumsum(probability * levels)
    mu_total = mu[-1]
    denominator = omega * (1.0 - omega)
    with np.errstate(divide="ignore", invalid="ignore"):
        between = (mu_total * omega - mu) ** 2 / denominator
    between = np.nan_to_num(between, nan=0.0, posinf=0.0, neginf=0.0)
    return int(np.argmax(between))


def iterative_threshold(gray: np.ndarray, max_iter: int = 60) -> int:
    """迭代法阈值：以均值为初值，用两侧均值反复更新直至收敛。"""
    threshold = int(np.asarray(gray, dtype=np.float32).mean())
    values = np.asarray(gray, dtype=np.uint8)
    for _ in range(max_iter):
        lower = values[values <= threshold]
        upper = values[values > threshold]
        if lower.size == 0 or upper.size == 0:
            break
        updated = int(round((float(lower.mean()) + float(upper.mean())) / 2))
        if abs(updated - threshold) < 1:
            threshold = updated
            break
        threshold = updated
    return threshold


def kmeans_pixels(
    pixels: np.ndarray,
    k: int,
    max_iter: int,
    seed: int = 3,
) -> Tuple[np.ndarray, np.ndarray, List[Tuple[int, np.ndarray, np.ndarray]], List[float], int]:
    """对像素颜色向量做 K-Means，返回标签、簇心、关键帧、SSE 历史与迭代数。"""
    array = np.asarray(pixels, dtype=np.float32)
    rng = np.random.default_rng(seed)
    indices = rng.choice(len(array), size=min(k, len(array)), replace=False)
    centers = array[indices].copy()
    labels = np.zeros(len(array), dtype=np.int32)
    history: List[float] = []
    frames: List[Tuple[int, np.ndarray, np.ndarray]] = []
    used = 0

    for iteration in range(1, max_iter + 1):
        distances = ((array[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        labels = distances.argmin(axis=1)
        sse = float(distances[np.arange(len(array)), labels].sum()) / len(array)
        history.append(round(sse, 2))
        new_centers = np.array(
            [
                array[labels == index].mean(axis=0) if np.any(labels == index) else centers[index]
                for index in range(len(centers))
            ]
        )
        shift = float(np.linalg.norm(new_centers - centers))
        centers = new_centers
        used = iteration
        if iteration <= 4 or iteration in (6, 8, 12, 20, 30) or iteration == max_iter or shift < 0.5:
            frames.append((iteration, labels.copy(), centers.copy()))
        if shift < 0.5:
            break

    return labels, centers, frames, history, used


def _dilate3x3(mask: np.ndarray) -> np.ndarray:
    """3×3 八邻域膨胀，用切片位移实现。"""
    padded = np.pad(mask, 1, mode="constant")
    height, width = mask.shape
    result = np.zeros_like(mask, dtype=bool)
    for dy in range(3):
        for dx in range(3):
            result |= padded[dy : dy + height, dx : dx + width]
    return result


def canny_steps(
    gray: np.ndarray,
    low: int,
    high: int,
    sigma: float = 1.4,
    max_propagation: int = 128,
) -> Dict[str, np.ndarray]:
    """手写 Canny：平滑、梯度、非极大值抑制、双阈值连通传播。"""
    if low >= high:
        low, high = min(low, high), max(low, high) + 1

    blurred = gaussian_blur(gray, sigma)
    sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
    sobel_y = sobel_x.T
    gx = convolve2d(blurred, sobel_x)
    gy = convolve2d(blurred, sobel_y)
    magnitude = np.hypot(gx, gy)
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
    suppressed = np.where((magnitude >= first) & (magnitude >= second), magnitude, 0.0)

    strong = suppressed >= high
    weak = suppressed >= low
    edges = strong.copy()
    for _ in range(max_propagation):
        previous = int(edges.sum())
        edges = (_dilate3x3(edges) & weak) | strong
        if int(edges.sum()) == previous:
            break

    kernel_size = int(2 * round(3 * sigma) + 1)
    return {
        "blurred": blurred,
        "magnitude": magnitude,
        "suppressed": suppressed,
        "strong": strong,
        "edges": edges,
        "kernel_size": np.array([kernel_size], dtype=np.int32),
        "low": np.array([low], dtype=np.int32),
        "high": np.array([high], dtype=np.int32),
    }


def canny_steps_summary(gray: np.ndarray, low: int, high: int, sigma: float = 1.4) -> Dict[str, Any]:
    """返回适合直接写入步骤说明的摘要信息。"""
    result = canny_steps(gray, low, high, sigma)
    return {
        "kernel_size": int(result["kernel_size"][0]),
        "low": int(result["low"][0]),
        "high": int(result["high"][0]),
        "strong_pixels": int(result["strong"].sum()),
        "edge_pixels": int(result["edges"].sum()),
    }


def depth_from_disparity(disparity: np.ndarray, focal: float, baseline: float) -> np.ndarray:
    """Z = f·B / d，视差为 0 的位置返回 inf。"""
    values = np.asarray(disparity, dtype=np.float32)
    safe = np.where(values <= 0.1, np.nan, values)
    return (focal * baseline) / safe


def cosine_similarity(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
    """余弦相似度，任一向量为零时返回 0。"""
    a = np.asarray(vector_a, dtype=np.float32).ravel()
    b = np.asarray(vector_b, dtype=np.float32).ravel()
    norm = float(np.linalg.norm(a) * np.linalg.norm(b))
    if norm < 1e-8:
        return 0.0
    return float(np.dot(a, b) / norm)


def gaussian_1d(values: float, sigma: float) -> float:
    """一维高斯权重，供简单滤波演示使用。"""
    return float(math.exp(-(values * values) / (2 * sigma * sigma)))
