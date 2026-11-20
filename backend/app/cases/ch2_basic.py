"""第 2 章基础知识案例：通道查看、LBP、SIFT、HOG。"""

from __future__ import annotations

import math
from typing import Any, Dict, List

import cv2
import numpy as np

from app.cases.base import BaseCase
from app.cases.imaging import (
    chart_item,
    colorize,
    example_image,
    image_item,
    load_image,
    param_float,
    param_int,
    param_str,
    to_data_url,
)
from app.schemas.common import CaseOutput


class ChannelViewerCase(BaseCase):
    """切换灰度、RGB 单通道与 HSV 通道，查看像素统计。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, example_image())
        mode = param_str(params, "mode", "rgb")
        gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV)
        blue, green, red = cv2.split(src)
        hue, saturation, value = cv2.split(hsv)

        channels = {
            "rgb": ("RGB 原图", src, None),
            "gray": ("灰度图", gray, None),
            "r": ("红色通道", red, cv2.COLORMAP_JET),
            "g": ("绿色通道", green, cv2.COLORMAP_JET),
            "b": ("蓝色通道", blue, cv2.COLORMAP_JET),
            "h": ("色调 H", hue, cv2.COLORMAP_HSV),
            "s": ("饱和度 S", saturation, cv2.COLORMAP_JET),
            "v": ("明度 V", value, cv2.COLORMAP_JET),
        }
        name, channel, colormap = channels.get(mode, channels["rgb"])

        images = [image_item("输入图像", src)]
        if mode != "rgb":
            shown = channel if channel.ndim == 3 else (
                colorize(channel, colormap) if colormap is not None else cv2.cvtColor(channel, cv2.COLOR_GRAY2BGR)
            )
            images.append(image_item(name, shown))
            # 3×3 网格拼合，展示同一点在不同通道的取值
        else:
            images.append(image_item("HSV 伪彩色", cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)))

        stat = channel if channel.ndim == 2 else cv2.cvtColor(channel, cv2.COLOR_BGR2GRAY)
        cx, cy = src.shape[1] // 2, src.shape[0] // 2
        pixel = src[cy, cx]
        metrics = {
            "当前通道": name,
            "尺寸": f"{src.shape[1]} × {src.shape[0]}",
            "通道均值": round(float(stat.mean()), 2),
            "通道标准差": round(float(stat.std()), 2),
            "中心像素(B,G,R)": [int(v) for v in pixel],
            "中心像素灰度": int(gray[cy, cx]),
            "中心像素(H,S,V)": [int(v) for v in hsv[cy, cx]],
        }
        if mode in {"h", "s", "v"}:
            metrics["中心通道值"] = int(channel[cy, cx])
        elif mode in {"r", "g", "b"}:
            metrics["中心通道值"] = int(channel[cy, cx])

        steps = [
            {"title": "灰度转换", "description": "Gray = 0.299R + 0.587G + 0.114B，保留亮度信息。",
             "image": to_data_url(cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR))},
            {"title": "HSV 模型", "description": "H 表示色调、S 表示饱和度、V 表示明度，更接近人眼对颜色的感知。",
             "image": to_data_url(cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR))},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message=f"当前展示：{name}。切换参数可查看不同颜色通道。")


class LbpDemoCase(BaseCase):
    """3×3 邻域 LBP 编码演示。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, example_image())
        gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
        radius = param_int(params, "radius", 1, 1, 5)
        grid = param_int(params, "grid", 16, 4, 64)

        offsets = []
        for index in range(8):
            angle = math.radians(45 * index)
            offsets.append((int(round(radius * math.cos(angle))), int(round(-radius * math.sin(angle)))))
        code = np.zeros_like(gray, dtype=np.uint8)
        for index, (dx, dy) in enumerate(offsets):
            shifted = np.roll(np.roll(gray, -dy, axis=0), -dx, axis=1)
            code |= ((shifted >= gray).astype(np.uint8) << index)
        if radius > 0:
            code[:radius, :] = 0
            code[-radius:, :] = 0
            code[:, :radius] = 0
            code[:, -radius:] = 0

        # 选择局部变化最明显的像素作为讲解中心
        lap = cv2.Laplacian(gray, cv2.CV_32F, ksize=3)
        lap[:radius + 2, :] = 0
        lap[-radius - 2:, :] = 0
        lap[:, :radius + 2] = 0
        lap[:, -radius - 2:] = 0
        cy, cx = np.unravel_index(int(np.argmax(np.abs(lap))), lap.shape)

        neighbors = [int(gray[cy + dy, cx + dx]) for dx, dy in offsets]
        center_value = int(gray[cy, cx])
        bits = ["1" if value >= center_value else "0" for value in neighbors]
        code_text = "".join(bits)

        # 邻域放大图
        span = max(2, radius) + 1
        y0, y1 = max(0, cy - span), min(gray.shape[0], cy + span + 1)
        x0, x1 = max(0, cx - span), min(gray.shape[1], cx + span + 1)
        patch = gray[y0:y1, x0:x1]
        zoom = cv2.resize(patch, ((x1 - x0) * 40, (y1 - y0) * 40), interpolation=cv2.INTER_NEAREST)
        zoom = cv2.cvtColor(zoom, cv2.COLOR_GRAY2BGR)
        for gy in range(0, zoom.shape[0], 40):
            cv2.line(zoom, (0, gy), (zoom.shape[1], gy), (200, 200, 200), 1)
        for gx in range(0, zoom.shape[1], 40):
            cv2.line(zoom, (gx, 0), (gx, zoom.shape[0]), (200, 200, 200), 1)
        highlight = ((cx - radius - x0) * 40, (cy - radius - y0) * 40,
                     (2 * radius + 1) * 40, (2 * radius + 1) * 40)
        cv2.rectangle(zoom, (highlight[0], highlight[1]),
                      (highlight[0] + highlight[2], highlight[1] + highlight[3]), (60, 200, 60), 2)
        for index, (dx, dy) in enumerate(offsets):
            px = (cx + dx - x0) * 40 + 8
            py = (cy + dy - y0) * 40 + 24
            cv2.putText(zoom, bits[index], (px, py), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                        (20, 20, 20), 1, cv2.LINE_AA)

        # 网格叠加
        overlay = src.copy()
        step = max(8, grid)
        for gx in range(0, overlay.shape[1], step):
            cv2.line(overlay, (gx, 0), (gx, overlay.shape[0]), (0, 255, 255), 1)
        for gy in range(0, overlay.shape[0], step):
            cv2.line(overlay, (0, gy), (overlay.shape[1], gy), (0, 255, 255), 1)
        cv2.circle(overlay, (cx, cy), max(4, radius * 4), (0, 0, 255), 2, cv2.LINE_AA)

        images = [
            image_item("LBP 编码结果", colorize(code, cv2.COLORMAP_TURBO), "亮色表示编码值较大的纹理模式"),
            image_item("邻域放大与二值判定", zoom, "绿色框为 3×3 邻域，数字为邻域像素与中心比较结果"),
            image_item("网格采样位置", overlay, "红色圆圈标记当前讲解像素"),
        ]
        steps = [
            {"title": "邻域取值", "description": f"中心像素 {center_value}；8 邻域（半径 {radius}）依次为：{neighbors}。"},
            {"title": "二值比较", "description": f"邻域 ≥ 中心记为 1，否则为 0：{code_text}。"},
            {"title": "十进制编码",
             "description": f"以 45° 起始方向按逆时针编号 b0…b7，编码值 = {int(code[cy, cx])}。"},
            {"title": "直方图意义", "description": "统计全图 LBP 编码的分布即可得到纹理描述子，对整体光照变化不敏感。"},
        ]
        metrics = {
            "中心像素值": center_value,
            "邻域像素": neighbors,
            "二值编码": code_text,
            "十进制编码": int(code[cy, cx]),
            "邻域半径": radius,
        }
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="LBP 通过邻域明暗关系编码纹理，旋转不变模式可进一步提升鲁棒性。")


class SiftDemoCase(BaseCase):
    """SIFT 关键点、主方向与描述符示意。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, example_image())
        max_keypoints = param_int(params, "max_keypoints", 200, 20, 1000)
        gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)

        sift = cv2.SIFT_create(nfeatures=max_keypoints)
        keypoints, descriptors = sift.detectAndCompute(gray, None)
        if keypoints is None or descriptors is None:
            raise ValueError("未检测到 SIFT 关键点，请更换输入图片")

        keypoints = sorted(keypoints, key=lambda item: -item.response)[:max_keypoints]
        rich = cv2.drawKeypoints(
            src, keypoints, None, (0, 220, 120),
            flags=cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS,
        )

        # 描述符示意：取前若干条 128 维描述符绘制热力图
        rows = descriptors[: min(16, descriptors.shape[0])].astype(np.float32)
        rows = cv2.normalize(rows, None, 0, 255, cv2.NORM_MINMAX)
        descriptor_map = cv2.applyColorMap(rows.astype(np.uint8), cv2.COLORMAP_VIRIDIS)
        descriptor_map = cv2.resize(descriptor_map, (512, 160), interpolation=cv2.INTER_NEAREST)

        scales = [float(kp.size) for kp in keypoints]
        angles = [float(kp.angle) for kp in keypoints]
        metrics = {
            "关键点数量": len(keypoints),
            "描述符维度": int(descriptors.shape[1]),
            "尺度范围": f"{min(scales):.1f} ~ {max(scales):.1f}" if scales else "-",
            "主方向范围": f"{min(angles):.0f}° ~ {max(angles):.0f}°" if angles else "-",
        }
        images = [
            image_item("SIFT 关键点叠加", rich, "圆半径表示尺度，半径指向为主方向"),
            image_item("128 维描述符示意", descriptor_map, "每行对应一个关键点，颜色表示梯度方向分箱强度"),
        ]
        steps = [
            {"title": "尺度空间极值检测", "description": "在高斯差分金字塔中寻找尺度与位置同时稳定的候选点。"},
            {"title": "关键点定位", "description": "剔除低对比度与边缘响应点，保留亚像素精度的稳定关键点。"},
            {"title": "主方向分配", "description": "统计邻域梯度方向直方图，为每个关键点赋予主方向以实现旋转不变性。"},
            {"title": "描述符生成", "description": "在 16 个 4×4 子区域上统计 8 方向梯度，得到 128 维特征向量。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message=f"检测到 {len(keypoints)} 个关键点，可直接用于匹配与拼接。")


class HogDemoCase(BaseCase):
    """HOG 梯度方向直方图与 cell/block 可视化。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, example_image())
        cell = param_int(params, "cell_size", 8, 4, 32)
        bins = param_int(params, "bins", 9, 4, 18)
        gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)

        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        magnitude = cv2.magnitude(gx, gy)
        angle = (np.degrees(np.arctan2(gy, gx)) + 180.0) % 180.0

        rows = gray.shape[0] // cell
        cols = gray.shape[1] // cell
        if rows < 2 or cols < 2:
            raise ValueError("Cell 尺寸过大，请调小 cell 参数")
        hog_visual = np.zeros((rows * cell, cols * cell, 3), dtype=np.uint8)
        aggregate = np.zeros(bins, dtype=np.float32)
        cell_hists = np.zeros((rows, cols, bins), dtype=np.float32)

        for row in range(rows):
            for col in range(cols):
                cell_angle = angle[row * cell:(row + 1) * cell, col * cell:(col + 1) * cell]
                cell_mag = magnitude[row * cell:(row + 1) * cell, col * cell:(col + 1) * cell]
                hist, _ = np.histogram(cell_angle, bins=bins, range=(0, 180), weights=cell_mag)
                cell_hists[row, col] = hist
                aggregate += hist

        # 逐 cell 绘制方向线段，长度按该 cell 内最大值归一化
        normalized = cell_hists / (cell_hists.max() + 1e-6)
        for row in range(rows):
            for col in range(cols):
                cx = int((col + 0.5) * cell)
                cy = int((row + 0.5) * cell)
                radius = cell * 0.55
                for index in range(bins):
                    strength = normalized[row, col, index]
                    if strength < 0.15:
                        continue
                    theta = math.radians((index + 0.5) * 180.0 / bins)
                    dx = radius * math.cos(theta)
                    dy = -radius * math.sin(theta)
                    intensity = int(60 + 195 * strength)
                    cv2.line(hog_visual, (int(cx - dx), int(cy - dy)), (int(cx + dx), int(cy + dy)),
                             (intensity, intensity, intensity), 1, cv2.LINE_AA)

        grid_view = src.copy()
        for col in range(cols + 1):
            cv2.line(grid_view, (col * cell, 0), (col * cell, rows * cell), (0, 255, 255), 1)
        for row in range(rows + 1):
            cv2.line(grid_view, (0, row * cell), (cols * cell, row * cell), (0, 255, 255), 1)
        cv2.rectangle(grid_view, (cell, cell), (3 * cell, 3 * cell), (0, 0, 255), 2)

        labels = [f"{(index + 0.5) * 180 / bins:.0f}°" for index in range(bins)]
        option = {
            "tooltip": {"trigger": "axis"},
            "grid": {"left": 48, "right": 20, "top": 30, "bottom": 30},
            "xAxis": {"type": "category", "data": labels, "name": "梯度方向"},
            "yAxis": {"type": "value", "name": "幅值累加"},
            "series": [{
                "type": "bar",
                "data": [round(float(value), 1) for value in aggregate],
                "itemStyle": {"color": "#2563eb"},
            }],
        }

        metrics = {
            "Cell 尺寸": f"{cell} × {cell}",
            "方向分箱": bins,
            "Cell 网格": f"{rows} × {cols}",
            "Block 数量": f"{(rows - 1) * (cols - 1)}（2×2 cell / block）",
            "特征维度": f"{(rows - 1) * (cols - 1) * 4 * bins}",
        }
        images = [
            image_item("Cell 网格划分", grid_view, "每个方格为一个 cell，红框展示一个 2×2 block"),
            image_item("HOG 方向可视化", hog_visual, "线段方向为梯度主方向，长度表示该方向幅值占比"),
        ]
        steps = [
            {"title": "梯度计算", "description": "Sobel 算子分别求水平与垂直梯度，得到幅值与方向。"},
            {"title": "方向分箱", "description": f"把 0°~180° 均分为 {bins} 个区间，按幅值加权累计。"},
            {"title": "Cell 统计", "description": "每个 cell 内得到一条方向直方图，抑制局部形变影响。"},
            {"title": "Block 归一化", "description": "相邻 2×2 cell 组成 block，块内归一化提升光照鲁棒性。"},
        ]
        return CaseOutput(images=images, charts=[chart_item("全图梯度方向直方图", option)],
                          steps=steps, metrics=metrics,
                          message="HOG 通过分块统计梯度方向描述形状，常用于行人检测等任务。")
