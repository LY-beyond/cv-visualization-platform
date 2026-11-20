"""上机实验转化的交互案例（实验二 / 四）。

这些案例与实验中心档案双向关联：档案页的「动手试试」跳到本章案例，
案例的 guidance 文案引用实验报告中的原始公式与结论。
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

from app.cases.base import BaseCase
from app.cases.imaging import (
    chart_item,
    colorize,
    example_image,
    image_item,
    load_image,
    montage,
    param_float,
    param_int,
    to_data_url,
)
from app.schemas.common import CaseOutput


def _psnr(reference: np.ndarray, target: np.ndarray) -> float:
    mse = float(np.mean((reference.astype(np.float32) - target.astype(np.float32)) ** 2))
    if mse <= 1e-9:
        return 99.0
    return round(10.0 * math.log10(255.0 ** 2 / mse), 2)


def _odd(value: int) -> int:
    return value if value % 2 == 1 else value + 1


class LabFilterCompareCase(BaseCase):
    """实验二·练习 1：椒盐噪声下均值 / 高斯 / 中值滤波对比。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, example_image())
        height, width = src.shape[:2]
        if width > 460:
            scale = 460.0 / width
            src = cv2.resize(src, (460, max(1, int(height * scale))), interpolation=cv2.INTER_AREA)

        ratio = param_float(params, "noise", 0.06, 0.01, 0.2)
        ksize = _odd(param_int(params, "ksize", 3, 3, 9))
        rng = np.random.default_rng(7)
        noisy = src.copy()
        salt = rng.random(noisy.shape[:2])
        pepper = rng.random(noisy.shape[:2])
        noisy[salt < ratio / 2] = 255
        noisy[pepper > 1 - ratio / 2] = 0

        mean = cv2.blur(noisy, (ksize, ksize))
        gaussian = cv2.GaussianBlur(noisy, (ksize, ksize), 0)
        median = cv2.medianBlur(noisy, ksize)

        results: List[Tuple[str, np.ndarray, float, float]] = []
        for name, output in (("MEAN", mean), ("GAUSSIAN", gaussian), ("MEDIAN", median)):
            start = time.perf_counter()
            if name == "MEAN":
                refreshed = cv2.blur(noisy, (ksize, ksize))
            elif name == "GAUSSIAN":
                refreshed = cv2.GaussianBlur(noisy, (ksize, ksize), 0)
            else:
                refreshed = cv2.medianBlur(noisy, ksize)
            elapsed = (time.perf_counter() - start) * 1000.0
            results.append((name, refreshed, _psnr(src, refreshed), round(elapsed, 2)))

        canvas = montage(
            [(f"NOISY {int(ratio * 100)}%", noisy)]
            + [(f"{name} {ksize}x{ksize}", output) for name, output, _, _ in results],
            cols=2,
            cell=(300, 220),
        )

        steps = [
            {
                "title": "① 叠加椒盐噪声",
                "description": f"以 {ratio * 100:.0f}% 的比例把像素置为 0 或 255，黑白各占一半。",
                "formula": "p(x)=0 或 255，概率 p/2；其余保持不变",
                "image": to_data_url(noisy),
            },
            {
                "title": "② 均值滤波",
                "description": "邻域等权平均，能稀释噪声，但边缘一起被模糊。",
                "formula": "g(x,y) = (1/k²)·Σ f(x+i, y+j)",
                "image": to_data_url(mean),
            },
            {
                "title": "③ 高斯滤波",
                "description": "按距离加权，中心权重最大，平滑更自然。",
                "formula": "G(x,y) = (1/2πσ²)·exp(−(x²+y²)/2σ²)",
                "image": to_data_url(gaussian),
            },
            {
                "title": "④ 中值滤波",
                "description": "排序后取中间值，孤立的 0/255 被直接排除，对椒盐噪声最有效。",
                "formula": "g(x,y) = median{f(x+i, y+j)}",
                "image": to_data_url(median),
            },
        ]

        option = {
            "grid": {"left": 46, "right": 20, "top": 36, "bottom": 34},
            "tooltip": {"trigger": "axis", "valueFormatter": "{value} dB"},
            "xAxis": {"type": "category", "data": [name for name, _, _, _ in results]},
            "yAxis": {"type": "value", "name": "PSNR/dB", "min": 0},
            "series": [{
                "type": "bar",
                "barMaxWidth": 46,
                "data": [psnr for _, _, psnr, _ in results],
                "label": {"show": True, "position": "top", "formatter": "{c} dB"},
            }],
        }

        metrics = {
            "噪声比例": f"{ratio * 100:.0f}%",
            "核大小": f"{ksize} × {ksize}",
            "均值 PSNR": f"{results[0][2]} dB",
            "高斯 PSNR": f"{results[1][2]} dB",
            "中值 PSNR": f"{results[2][2]} dB",
            "均值耗时": f"{results[0][3]} ms",
            "中值耗时": f"{results[2][3]} ms",
        }

        return CaseOutput(
            images=[
                image_item("滤波对比", canvas),
                image_item("噪声图", noisy),
            ],
            charts=[chart_item("三种滤波器的 PSNR", option)],
            steps=steps,
            metrics=metrics,
            message="实验结论：椒盐噪声下中值 3×3 的 PSNR 明显高于线性滤波（报告中为 32.00 dB）。核继续增大反而损伤细节。",
        )


class LabEdgeOperatorsCase(BaseCase):
    """实验二·练习 1：Roberts / Prewitt / Sobel / Laplacian 四算子对比。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, example_image())
        height, width = src.shape[:2]
        if width > 460:
            scale = 460.0 / width
            src = cv2.resize(src, (460, max(1, int(height * scale))), interpolation=cv2.INTER_AREA)

        sigma = param_float(params, "sigma", 0.0, 0.0, 2.5)
        threshold = param_float(params, "threshold", 40, 0, 200)
        gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
        if sigma > 0.05:
            ksize = _odd(int(round(sigma * 3)) * 2 + 1)
            gray = cv2.GaussianBlur(gray, (ksize, ksize), sigma)

        roberts_x = np.array([[1, 0], [0, -1]], dtype=np.float32)
        roberts_y = np.array([[0, 1], [-1, 0]], dtype=np.float32)
        prewitt_x = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float32)
        prewitt_y = prewitt_x.T.copy()
        sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
        sobel_y = sobel_x.T.copy()

        operators = [
            ("ROBERTS", roberts_x, roberts_y),
            ("PREWITT", prewitt_x, prewitt_y),
            ("SOBEL", sobel_x, sobel_y),
            ("LAPLACIAN", None, None),
        ]

        panels: List[Tuple[str, np.ndarray]] = []
        steps: List[Dict[str, Any]] = []
        ratios: List[float] = []
        gradients: List[float] = []
        for name, kx, ky in operators:
            if kx is None:
                response = np.abs(cv2.Laplacian(gray, cv2.CV_32F, ksize=3))
                formula = "∇²f = f(x+1,y) + f(x−1,y) + f(x,y+1) + f(x,y−1) − 4f(x,y)"
            else:
                gx = cv2.filter2D(gray, cv2.CV_32F, kx)
                gy = cv2.filter2D(gray, cv2.CV_32F, ky)
                response = np.abs(gx) + np.abs(gy)
                formula = "G = |Gx| + |Gy|"
            ratio = float((response > threshold).mean()) * 100.0
            mean_gradient = float(response.mean())
            ratios.append(round(ratio, 2))
            gradients.append(round(mean_gradient, 2))
            panels.append((f"{name} {ratio:.1f}%", colorize(response)))
            steps.append({
                "title": name,
                "description": f"高于阈值 {threshold:.0f} 的像素占 {ratio:.2f}%，平均梯度 {mean_gradient:.2f}。",
                "formula": formula,
                "image": to_data_url(colorize(response)),
            })

        canvas = montage(panels, cols=2, cell=(300, 220))
        ratio_option = {
            "grid": {"left": 46, "right": 20, "top": 30, "bottom": 32},
            "tooltip": {"trigger": "axis"},
            "xAxis": {"type": "category", "data": [item[0].split(" ")[0] for item in panels]},
            "yAxis": {"type": "value", "name": "占比/%"},
            "series": [{"type": "bar", "barMaxWidth": 42, "data": ratios,
                        "label": {"show": True, "position": "top", "formatter": "{c}%"}}],
        }
        gradient_option = {
            "grid": {"left": 46, "right": 20, "top": 30, "bottom": 32},
            "tooltip": {"trigger": "axis"},
            "xAxis": {"type": "category", "data": [item[0].split(" ")[0] for item in panels]},
            "yAxis": {"type": "value", "name": "平均梯度"},
            "series": [{"type": "bar", "barMaxWidth": 42, "data": gradients,
                        "label": {"show": True, "position": "top"}}],
        }

        metrics = {
            "预处理": "高斯平滑" if sigma > 0.05 else "无（原图直接求导）",
            "二值阈值": int(threshold),
            "Roberts 占比": f"{ratios[0]}%",
            "Sobel 占比": f"{ratios[2]}%",
            "Laplacian 平均梯度": f"{gradients[3]}",
        }

        return CaseOutput(
            images=[image_item("四算子对比", canvas)],
            charts=[
                chart_item("边缘像素占比", ratio_option),
                chart_item("平均梯度", gradient_option),
            ],
            steps=steps,
            metrics=metrics,
            message="观察点：Roberts 边缘最细但碎片多；Sobel 的加权平滑使其更连续；Laplacian 平均梯度最高，也最容易放大噪声。",
        )


def _mean_shift(points: np.ndarray, radius: float, max_iter: int = 60) -> Tuple[List[np.ndarray], List[List[np.ndarray]]]:
    centers: List[np.ndarray] = []
    trajectories: List[List[np.ndarray]] = []
    for point in points:
        current = point.astype(np.float64).copy()
        path = [current.copy()]
        for _ in range(max_iter):
            distances = np.linalg.norm(points - current, axis=1)
            neighbours = points[distances <= radius]
            if len(neighbours) == 0:
                break
            updated = neighbours.mean(axis=0)
            shift = float(np.linalg.norm(updated - current))
            current = updated
            path.append(current.copy())
            if shift < 1e-3:
                break
        trajectories.append(path)
        if not any(np.linalg.norm(current - center) <= radius * 0.5 for center in centers):
            centers.append(current)
    return centers, trajectories


def _plot_meanshift(points: np.ndarray, centers: List[np.ndarray],
                    trajectories: List[List[np.ndarray]], radius: float) -> np.ndarray:
    width, height = 520, 400
    canvas = np.full((height, width, 3), 250, dtype=np.uint8)
    for x in range(0, width, 40):
        cv2.line(canvas, (x, 0), (x, height), (236, 239, 243), 1)
    for y in range(0, height, 40):
        cv2.line(canvas, (0, y), (width, y), (236, 239, 243), 1)

    all_points = np.vstack([points, np.array(centers) if centers else points])
    minimum = all_points.min(axis=0) - 1.5
    maximum = all_points.max(axis=0) + 1.5
    span = np.maximum(maximum - minimum, 1e-6)

    def project(point: np.ndarray) -> Tuple[int, int]:
        x = int(30 + (point[0] - minimum[0]) / span[0] * (width - 60))
        y = int(height - 30 - (point[1] - minimum[1]) / span[1] * (height - 60))
        return x, y

    for path in trajectories:
        for start, end in zip(path[:-1], path[1:]):
            cv2.line(canvas, project(start), project(end), (210, 190, 120), 1, cv2.LINE_AA)
    for point in points:
        cv2.circle(canvas, project(point), 5, (90, 110, 220), -1, cv2.LINE_AA)
    for index, center in enumerate(centers):
        position = project(center)
        cv2.circle(canvas, position, 9, (60, 170, 90), -1, cv2.LINE_AA)
        cv2.putText(canvas, f"C{index + 1}", (position[0] + 10, position[1] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (40, 120, 60), 1, cv2.LINE_AA)
    cv2.putText(canvas, f"radius={radius:.1f}  centers={len(centers)}", (16, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (60, 70, 90), 1, cv2.LINE_AA)
    return canvas


class LabMeanShiftCase(BaseCase):
    """实验四·练习 1：手写 Mean Shift 的半径实验台。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        radius = param_float(params, "radius", 3.0, 1.0, 8.0)
        points = np.array([
            [1.0, 1.0], [1.4, 1.3], [2.0, 1.0],
            [4.5, 2.0], [5.2, 2.6],
            [7.5, 6.0], [8.0, 6.6], [7.0, 7.0],
            [4.0, 6.5],
        ], dtype=np.float64)
        centers, trajectories = _mean_shift(points, radius)
        canvas = _plot_meanshift(points, centers, trajectories, radius)

        option = {
            "grid": {"left": 42, "right": 20, "top": 30, "bottom": 36},
            "tooltip": {"trigger": "item"},
            "xAxis": {"type": "value", "name": "x"},
            "yAxis": {"type": "value", "name": "y"},
            "series": [
                {"type": "scatter", "symbolSize": 9, "name": "样本点",
                 "data": points.tolist(), "itemStyle": {"color": "#4f6cd6"}},
                {"type": "scatter", "symbolSize": 16, "name": "收敛中心",
                 "data": [center.tolist() for center in centers],
                 "itemStyle": {"color": "#2f9e58"}},
            ],
        }

        metrics = {
            "半径 radius": radius,
            "样本点数": len(points),
            "收敛中心数": len(centers),
            "收敛判据": "最大位移 < 1e-3",
            "中心合并": "相距小于 radius/2 视为同一中心",
        }
        steps = [
            {
                "title": "① 从每个点出发",
                "description": "Mean Shift 不需要预设簇数，每个样本都作为初始中心。",
                "formula": "c_i^(0) = x_i",
            },
            {
                "title": "② 计算邻域均值",
                "description": f"取半径 {radius:.1f} 内的所有样本，把中心移到它们的均值。",
                "formula": "c_i^(t+1) = mean{ x_j : ‖x_j − c_i^(t)‖ ≤ r }",
            },
            {
                "title": "③ 迭代至收敛",
                "description": "位移小于阈值停止；相距小于 radius/2 的中心合并。",
                "formula": "‖c^(t+1) − c^(t)‖ < ε",
            },
        ]

        return CaseOutput(
            images=[image_item("Mean Shift 轨迹", canvas)],
            charts=[chart_item("样本点与收敛中心", option)],
            steps=steps,
            metrics=metrics,
            message="把半径从 1 调到 8：半径越大，邻域越容易跨过簇间空隙，中心数单调减少——报告中 9 个点从 5 个中心收敛到 1 个。",
        )


class LabCannyStepsCase(BaseCase):
    """实验四·练习 4：Canny 五步与 sigma / 双阈值定量观察。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, example_image())
        height, width = src.shape[:2]
        if width > 460:
            scale = 460.0 / width
            src = cv2.resize(src, (460, max(1, int(height * scale))), interpolation=cv2.INTER_AREA)

        sigma = param_float(params, "sigma", 1.0, 0.3, 2.5)
        low = param_float(params, "low", 30, 0, 150)
        high = param_float(params, "high", 60, 10, 255)
        if high <= low:
            high = low + 10

        gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY).astype(np.float32)
        ksize = _odd(int(round(sigma * 3)) * 2 + 1)
        smooth = cv2.GaussianBlur(gray, (ksize, ksize), sigma)
        gx = cv2.Sobel(smooth, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(smooth, cv2.CV_32F, 0, 1, ksize=3)
        magnitude = cv2.magnitude(gx, gy)
        direction = cv2.phase(gx, gy, angleInDegrees=True)

        angle = (np.round(direction / 45.0) * 45.0) % 180.0
        padded = np.pad(magnitude, 1, mode="constant")
        neighbours = np.zeros_like(magnitude)
        for deg, (dy, dx) in {
            0.0: (0, 1), 45.0: (-1, 1), 90.0: (-1, 0), 135.0: (-1, -1),
        }.items():
            mask = np.isclose(angle, deg)
            forward = padded[1 + dy:1 + dy + magnitude.shape[0], 1 + dx:1 + dx + magnitude.shape[1]]
            backward = padded[1 - dy:1 - dy + magnitude.shape[0], 1 - dx:1 - dx + magnitude.shape[1]]
            neighbours[mask] = np.maximum(forward[mask], backward[mask])
        nms = np.where((magnitude >= neighbours) & (magnitude > 0), magnitude, 0.0)

        strong = (nms >= high).astype(np.uint8) * 255
        weak = ((nms >= low) & (nms < high)).astype(np.uint8) * 255
        merged = cv2.add(strong, weak)
        final = cv2.Canny(smooth.astype(np.uint8), low, high)

        canvas = montage([
            ("1 SMOOTH", smooth),
            ("2 GX", colorize(cv2.convertScaleAbs(gx))),
            ("3 GY", colorize(cv2.convertScaleAbs(gy))),
            ("4 MAGNITUDE", colorize(magnitude)),
            ("5 NMS", colorize(nms)),
            ("6 FINAL", final),
        ], cols=3, cell=(230, 180))

        steps = [
            {
                "title": "① 高斯平滑",
                "description": f"σ={sigma:.1f}，核大小 {ksize}×{ksize}，先压制噪声再求导。",
                "formula": "I_s = G_σ * I",
                "image": to_data_url(smooth.astype(np.uint8)),
            },
            {
                "title": "② 梯度幅值与方向",
                "description": "Sobel 求 Gx、Gy，幅值与方向分别为 sqrt(Gx²+Gy²) 与 atan2(Gy, Gx)。",
                "formula": "M = √(Gx²+Gy²)，θ = atan2(Gy, Gx)",
                "image": to_data_url(colorize(magnitude)),
            },
            {
                "title": "③ 非极大值抑制",
                "description": f"沿梯度方向比较相邻像素，非零像素从 {int((magnitude > 0).sum())} 细化到 {int((nms > 0).sum())}。",
                "formula": "保留 M(x,y) ≥ M(x±1,y±1) 的像素",
                "image": to_data_url(colorize(nms)),
            },
            {
                "title": "④ 双阈值与滞后连接",
                "description": f"强边缘 {int((strong > 0).sum())} 像素，弱边缘 {int((weak > 0).sum())} 像素；与强边缘连通的弱边缘保留。",
                "formula": "E = Strong ∪ (Weak ∩ Connected(Strong))",
                "image": to_data_url(merged),
            },
        ]

        counts_option = {
            "grid": {"left": 46, "right": 20, "top": 30, "bottom": 32},
            "tooltip": {"trigger": "axis"},
            "xAxis": {"type": "category", "data": ["梯度非零", "NMS", "强边缘", "最终边缘"]},
            "yAxis": {"type": "value", "name": "像素数"},
            "series": [{
                "type": "bar",
                "barMaxWidth": 42,
                "data": [int((magnitude > 0).sum()), int((nms > 0).sum()),
                         int((strong > 0).sum()), int((final > 0).sum())],
                "label": {"show": True, "position": "top"},
            }],
        }

        metrics = {
            "sigma": sigma,
            "高斯核": f"{ksize} × {ksize}",
            "双阈值": f"({low:.0f}, {high:.0f})",
            "NMS 后像素": int((nms > 0).sum()),
            "最终边缘像素": int((final > 0).sum()),
            "强/弱边缘": f"{int((strong > 0).sum())} / {int((weak > 0).sum())}",
        }

        return CaseOutput(
            images=[
                image_item("Canny 分步", canvas),
                image_item("最终边缘", final),
            ],
            charts=[chart_item("各步骤非零像素数", counts_option)],
            steps=steps,
            metrics=metrics,
            message="实验报告的关键数字：合成圆图上 NMS 把非零像素从 20028 细化到 4399，最终约 863 像素。真实图像会更依赖 sigma 与双阈值。",
        )


class LabTransposeConvCase(BaseCase):
    """实验四·练习 5：转置卷积的网格摆放、重叠相加与尺寸公式。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        stride = param_int(params, "stride", 3, 1, 4)
        kernel = param_int(params, "kernel", 1, 1, 3)
        values = [param_float(params, name, default, 0, 9) for name, default in
                  (("a", 1), ("b", 2), ("c", 3), ("d", 4))]
        weight = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]], dtype=np.float32)[:kernel, :kernel]

        output_size = 2 * stride + max(kernel - stride, 0)
        output = np.zeros((output_size, output_size), dtype=np.float32)
        for row in range(2):
            for col in range(2):
                value = values[row * 2 + col]
                if value == 0:
                    continue
                y0 = row * stride
                x0 = col * stride
                output[y0:y0 + kernel, x0:x0 + kernel] += weight * value

        cell = max(28, int(280 / output_size))
        canvas = np.full((output_size * cell + 40, output_size * cell + 40, 3), 250, dtype=np.uint8)
        maximum = float(output.max()) if output.max() > 0 else 1.0
        for row in range(output_size):
            for col in range(output_size):
                value = float(output[row, col])
                ratio = value / maximum
                color = (int(245 - 120 * ratio), int(245 - 170 * ratio), int(250 - 40 * ratio))
                top = 20 + row * cell
                left = 20 + col * cell
                cv2.rectangle(canvas, (left, top), (left + cell - 2, top + cell - 2), color, -1)
                cv2.rectangle(canvas, (left, top), (left + cell - 2, top + cell - 2), (210, 214, 222), 1)
                text = f"{value:g}"
                cv2.putText(canvas, text, (left + 3, top + cell // 2 + 4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.32 if cell < 42 else 0.4,
                            (60, 66, 80), 1, cv2.LINE_AA)

        nonzero = int((output != 0).sum())
        metrics = {
            "输入尺寸": "2 × 2",
            "stride": stride,
            "kernel": kernel,
            "输出公式": f"H_out = H·s + max(k−s, 0) = 2×{stride} + max({kernel}−{stride}, 0) = {output_size}",
            "输出尺寸": f"{output_size} × {output_size}",
            "非零元素": nonzero,
            "元素总和": round(float(output.sum()), 2),
        }

        steps = [
            {
                "title": "① 输入与卷积核",
                "description": "输入 2×2，每个元素乘以卷积核得到一个 k×k 块。",
                "formula": "B_ij = x_ij · K",
            },
            {
                "title": "② 按 stride 摆放",
                "description": f"第 (i,j) 个块的左上角固定在 ({stride}·i, {stride}·j)。",
                "formula": "左上角 = (s·j, s·i)",
            },
            {
                "title": "③ 重叠相加",
                "description": "块与块重叠的位置累加；TF 在 valid 下不裁剪尾部，输出按 H·s + max(k−s,0) 补满。",
                "formula": "out = Σ B_ij",
            },
        ]

        return CaseOutput(
            images=[image_item("转置卷积输出", canvas)],
            steps=steps,
            metrics=metrics,
            message="实验四用同一组参数验证了：s=3,k=1 → 6×6；s=2,k=3 → 5×5 且几乎填满；权重乘 2，输出和也乘 2。",
        )
