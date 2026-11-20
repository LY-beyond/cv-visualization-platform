"""第 8 章：多目视觉与双目深度。"""

from __future__ import annotations

from typing import Any, Dict

import cv2
import numpy as np

from app.algorithms import numpy_ops
from app.cases.base import BaseCase
from app.cases.imaging import image_item, param_float, param_int, to_data_url
from app.schemas.common import CaseOutput


class StereoDepthCase(BaseCase):
    """由视差图换算深度：Z = f·B / d。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        baseline = param_float(params, "baseline", 0.12, 0.02, 0.6)
        focal = param_int(params, "focal", 600, 200, 1500)
        disparity_max = param_int(params, "disparity", 64, 16, 128)

        height, width = 240, 360
        columns = np.linspace(disparity_max, 2.0, width, dtype=np.float32)
        disparity = np.tile(columns, (height, 1))
        depth = numpy_ops.depth_from_disparity(disparity, float(focal), baseline)
        depth = np.nan_to_num(depth, nan=0.0, posinf=0.0)

        normalized = np.clip(depth / max(float(np.nanmax(depth)), 1e-6) * 255, 0, 255).astype(np.uint8)
        heatmap = cv2.applyColorMap(normalized, cv2.COLORMAP_TURBO)

        curve_x = np.linspace(2, disparity_max, 200)
        curve_depth = numpy_ops.depth_from_disparity(curve_x, float(focal), baseline)
        option = {
            "tooltip": {"trigger": "axis"},
            "grid": {"left": 56, "right": 20, "top": 30, "bottom": 34},
            "xAxis": {"type": "value", "name": "视差 d（像素）", "min": 0},
            "yAxis": {"type": "value", "name": "深度 Z（米）"},
            "series": [{
                "type": "line",
                "smooth": True,
                "showSymbol": False,
                "data": [[float(x), round(float(z), 3)] for x, z in zip(curve_x, curve_depth) if np.isfinite(z)],
                "lineStyle": {"color": "#0d9488", "width": 2},
            }],
        }

        near = float(focal * baseline / disparity_max)
        far = float(focal * baseline / 2.0)
        metrics = {
            "焦距 f": f"{focal} px",
            "基线 B": f"{baseline:.2f} m",
            "视差范围": f"2 ~ {disparity_max} px",
            "最近深度": f"{near:.2f} m",
            "最远深度": f"{far:.2f} m",
        }
        steps = [
            {"title": "① 双目校正", "description": "把左右图像校正到同一极线，使同名点只在水平方向存在视差。",
             "formula": "x_left − x_right = d"},
            {"title": "② 视差计算", "description": "对每个像素在右图同一行搜索最相似的匹配点，得到视差图。",
             "formula": "d(x, y) = argmin_s ||I_L(x, y) − I_R(x − s, y)||"},
            {"title": "③ 深度换算", "description": "视差与深度成反比，视差越大目标越近。",
             "formula": "Z = f · B / d"},
            {"title": "④ 深度可视化", "description": "把深度归一化后伪彩色显示，近处偏暖色、远处偏冷色。",
             "image": to_data_url(heatmap)},
        ]
        return CaseOutput(
            images=[image_item("深度伪彩色", heatmap, "按 Z = f·B/d 由视差换算")],
            charts=[{"title": "视差—深度曲线", "option": option}],
            steps=steps,
            metrics=metrics,
            message="增大基线 B 或焦距 f 都会把同一视差映射为更远的距离。",
        )
