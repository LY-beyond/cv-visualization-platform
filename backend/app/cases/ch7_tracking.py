"""第 7 章：目标跟踪（卡尔曼滤波）。"""

from __future__ import annotations

from typing import Any, Dict

import cv2
import numpy as np

from app.cases.base import BaseCase
from app.cases.imaging import image_item, param_float, param_int
from app.schemas.common import CaseOutput


class TrackingKalmanCase(BaseCase):
    """二维匀速目标跟踪：观测含噪，卡尔曼滤波平滑轨迹。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        noise = param_float(params, "noise", 4.0, 0.5, 20.0)
        steps_count = param_int(params, "steps", 60, 20, 120)
        rng = np.random.default_rng(7)

        time = np.arange(steps_count, dtype=np.float32)
        truth = np.stack([60 + 4.2 * time, 190 + 55 * np.sin(time / 9.0)], axis=1)
        measurement = truth + rng.normal(0, noise, truth.shape)

        # 状态 [x, y, vx, vy]
        state = np.array([measurement[0, 0], measurement[0, 1], 0.0, 0.0], dtype=np.float64)
        transition = np.array([[1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0], [0, 0, 0, 1]], dtype=np.float64)
        observation = np.array([[1, 0, 0, 0], [0, 1, 0, 0]], dtype=np.float64)
        covariance = np.eye(4) * 50.0
        process_noise = np.eye(4) * 1.0
        measurement_noise = np.eye(2) * (noise ** 2)

        filtered = []
        for point in measurement:
            state = transition @ state
            covariance = transition @ covariance @ transition.T + process_noise
            innovation_cov = observation @ covariance @ observation.T + measurement_noise
            gain = covariance @ observation.T @ np.linalg.inv(innovation_cov)
            state = state + gain @ (point - observation @ state)
            covariance = (np.eye(4) - gain @ observation) @ covariance
            filtered.append(state[:2].copy())
        filtered = np.array(filtered)

        before = float(np.sqrt(np.mean(np.sum((measurement - truth) ** 2, axis=1))))
        after = float(np.sqrt(np.mean(np.sum((filtered - truth) ** 2, axis=1))))

        canvas = np.full((360, 640, 3), 245, dtype=np.uint8)
        offset = np.array([20.0, 30.0])
        def project(points: np.ndarray) -> np.ndarray:
            return np.round(points + offset).astype(np.int32)

        truth_pts = project(truth)
        filtered_pts = project(filtered)
        measured_pts = project(measurement)
        cv2.polylines(canvas, [truth_pts], False, (60, 60, 60), 2, cv2.LINE_AA)
        for point in measured_pts:
            cv2.circle(canvas, tuple(point), 2, (200, 160, 40), -1, cv2.LINE_AA)
        cv2.polylines(canvas, [filtered_pts], False, (220, 80, 40), 2, cv2.LINE_AA)
        cv2.circle(canvas, tuple(filtered_pts[0]), 5, (40, 160, 40), -1, cv2.LINE_AA)
        cv2.putText(canvas, "truth=gray  measure=yellow  kalman=red", (16, 350),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (90, 90, 90), 1, cv2.LINE_AA)

        option = {
            "tooltip": {"trigger": "axis"},
            "legend": {"data": ["真值", "观测", "滤波"], "top": 0},
            "grid": {"left": 48, "right": 20, "top": 36, "bottom": 30},
            "xAxis": {"type": "category", "data": [str(index) for index in range(steps_count)], "name": "帧"},
            "yAxis": {"type": "value", "name": "纵坐标"},
            "series": [
                {"name": "真值", "type": "line", "showSymbol": False, "data": truth[:, 1].round(1).tolist(),
                 "lineStyle": {"color": "#64748b", "width": 2}},
                {"name": "观测", "type": "scatter", "symbolSize": 4, "data": measurement[:, 1].round(1).tolist(),
                 "itemStyle": {"color": "#eab308"}},
                {"name": "滤波", "type": "line", "showSymbol": False, "data": filtered[:, 1].round(1).tolist(),
                 "lineStyle": {"color": "#dc2626", "width": 2}},
            ],
        }
        metrics = {
            "观测噪声 σ": noise,
            "轨迹帧数": steps_count,
            "滤波前 RMSE": round(before, 2),
            "滤波后 RMSE": round(after, 2),
            "误差下降": f"{(1 - after / max(before, 1e-6)) * 100:.1f}%",
        }
        steps = [
            {"title": "① 初始化状态", "description": "以首帧观测初始化位置，速度设为 0，协方差给较大初值。",
             "formula": "x₀ = [z₀, 0]，P₀ = 50·I"},
            {"title": "② 预测", "description": "按匀速模型外推位置，并累加过程噪声。",
             "formula": "x̂ₖ = F·xₖ₋₁，P̂ₖ = F·Pₖ₋₁·Fᵀ + Q"},
            {"title": "③ 更新", "description": "用当前观测修正预测值，卡尔曼增益权衡预测与观测的可信度。",
             "formula": "K = P̂Hᵀ(HP̂Hᵀ + R)⁻¹，x = x̂ + K(z − Hx̂)"},
            {"title": "④ 轨迹对比", "description": f"滤波后 RMSE 从 {before:.2f} 降到 {after:.2f}，说明运动模型有效抑制了观测噪声。",
             "image": None},
        ]
        return CaseOutput(
            images=[image_item("跟踪轨迹", canvas, "灰色真值、黄色观测、红色滤波")],
            charts=[{"title": "纵坐标随时间变化", "option": option}],
            steps=steps,
            metrics=metrics,
            message="调大噪声 σ 可观察观测抖动增强，而滤波轨迹仍保持平滑。",
        )
