"""第 6 章识别案例：虹膜归一化、人脸嵌入空间与关键点对齐。"""

from __future__ import annotations

import math
from typing import Any, Dict, List

import cv2
import numpy as np

from app.cases.base import BaseCase
from app.cases.imaging import (
    chart_item,
    eye_image,
    face_image,
    image_item,
    param_int,
    to_data_url,
)
from app.schemas.common import CaseOutput


class IrisNormCase(BaseCase):
    """环形虹膜展开为归一化矩形。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = eye_image()
        center = (150, 100)
        iris_radius = 50
        inner_radius = param_int(params, "inner_radius", 18, 8, 30)
        height = param_int(params, "height", 240, 120, 360)

        marked = src.copy()
        cv2.circle(marked, center, iris_radius, (0, 220, 255), 2, cv2.LINE_AA)
        cv2.circle(marked, center, inner_radius, (0, 0, 255), 2, cv2.LINE_AA)
        cv2.line(marked, center, (center[0] + iris_radius, center[1]), (0, 220, 255), 1, cv2.LINE_AA)
        cv2.putText(marked, "iris", (center[0] + 54, center[1] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 180, 220), 1, cv2.LINE_AA)
        cv2.putText(marked, "pupil", (center[0] + 22, center[1] - 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 220), 1, cv2.LINE_AA)

        polar = cv2.warpPolar(
            src, (iris_radius - inner_radius + 1, height), center,
            float(iris_radius), cv2.WARP_POLAR_LINEAR,
        )
        strip = cv2.transpose(polar)
        strip = cv2.resize(strip, (height, 120), interpolation=cv2.INTER_LINEAR)
        # 标注角度刻度
        for angle in range(0, 360, 90):
            x = int(angle / 360.0 * strip.shape[1])
            cv2.line(strip, (x, 0), (x, strip.shape[0]), (255, 255, 255), 1)

        metrics = {
            "虹膜外半径": iris_radius,
            "瞳孔半径": inner_radius,
            "归一化尺寸": f"{strip.shape[1]} × {strip.shape[0]}",
            "展开方式": "极坐标展开（warpPolar）",
        }
        images = [
            image_item("虹膜定位", marked, "黄圈为虹膜外边界，红圈为瞳孔边界"),
            image_item("归一化矩形", strip, "横轴为角度（0°~360°），纵轴为半径"),
            image_item("原始眼部图像", src),
        ]
        steps = [
            {"title": "虹膜定位", "description": "用圆检测或边缘拟合确定虹膜内、外边界与圆心。"},
            {"title": "极坐标展开", "description": "把环形区域按角度与半径重采样为矩形，消除拍摄距离差异。"},
            {"title": "特征提取", "description": "在归一化图上做 Gabor 滤波并二值编码，用汉明距离比对。"},
            {"title": "匹配决策", "description": "与注册模板比较加权汉明距离，低于阈值判定为同一虹膜。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="归一化让不同拍摄条件下的虹膜处于同一表示空间，是虹膜识别可用的前提。")


class FaceEmbeddingCase(BaseCase):
    """人脸嵌入空间与类内/类间距离。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        identities: List[str] = ["用户 A", "用户 B", "用户 C", "用户 D", "用户 E", "用户 F"]
        rng = np.random.default_rng(21)
        angle = np.linspace(0, 2 * math.pi, len(identities), endpoint=False)
        series: List[Dict[str, Any]] = []
        intra_distances: List[float] = []
        cluster_centers: List[np.ndarray] = []

        for index, name in enumerate(identities):
            center = np.array([3.4 * math.cos(angle[index]), 3.4 * math.sin(angle[index])])
            points = center + rng.normal(0.0, 0.52, size=(18, 2))
            cluster_centers.append(center)
            for point in points:
                intra_distances.append(float(np.linalg.norm(point - center)))
            series.append({
                "name": name,
                "type": "scatter",
                "symbolSize": 8,
                "data": [[round(float(x), 3), round(float(y), 3)] for x, y in points],
            })

        inter_distances: List[float] = []
        for i in range(len(cluster_centers)):
            for j in range(i + 1, len(cluster_centers)):
                inter_distances.append(float(np.linalg.norm(cluster_centers[i] - cluster_centers[j])))

        option = {
            "tooltip": {"trigger": "item"},
            "legend": {"top": 0, "type": "scroll"},
            "grid": {"left": 40, "right": 20, "top": 40, "bottom": 30},
            "xAxis": {"type": "value", "name": "维度 1", "scale": True},
            "yAxis": {"type": "value", "name": "维度 2", "scale": True},
            "series": series,
        }
        metrics = {
            "身份数量": len(identities),
            "每人样本": 18,
            "类内平均距离": round(float(np.mean(intra_distances)), 3),
            "类间最小距离": round(float(np.min(inter_distances)), 3),
            "分离度": round(float(np.min(inter_distances) / np.mean(intra_distances)), 2),
        }
        steps = [
            {"title": "特征提取", "description": "深度网络把人脸映射为固定维度嵌入向量（示意降维到二维）。"},
            {"title": "类内聚拢", "description": "同身份样本距离应尽量小，减小光照、姿态与表情变化的影响。"},
            {"title": "类间分离", "description": "不同身份样本距离应尽量大，Triplet Loss 与 ArcFace 都为此设计。"},
            {"title": "阈值判定", "description": "验证模式下比较两张人脸的余弦距离与阈值，得到接受或拒绝。"},
        ]
        return CaseOutput(charts=[chart_item("人脸嵌入空间（示意）", option, height=340)],
                          steps=steps, metrics=metrics,
                          message="嵌入空间中类内紧、类间远，是 1:1 验证与 1:N 辨识可靠的基础。")


class FaceAlignCase(BaseCase):
    """五关键点检测与人脸对齐。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = face_image()
        source = np.float32([[88, 112], [172, 112], [130, 160], [105, 202], [155, 202]])
        template = np.float32([[38.29, 51.69], [73.53, 51.50], [56.02, 71.73], [41.55, 92.37], [70.73, 92.20]])

        matrix, _ = cv2.estimateAffinePartial2D(source, template, method=cv2.LMEDS)
        if matrix is None:
            matrix = cv2.getAffineTransform(source[:3], template[:3])
        aligned = cv2.warpAffine(src, matrix, (112, 112), flags=cv2.INTER_LINEAR, borderValue=(245, 245, 245))

        marked = cv2.resize(src, (src.shape[1] * 2, src.shape[0] * 2), interpolation=cv2.INTER_LINEAR)
        names = ["L-eye", "R-eye", "nose", "L-mouth", "R-mouth"]
        for (x, y), name in zip(source, names):
            px, py = int(x * 2), int(y * 2)
            cv2.circle(marked, (px, py), 6, (0, 220, 255), -1, cv2.LINE_AA)
            cv2.putText(marked, name, (px + 8, py - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.42,
                        (20, 20, 20), 1, cv2.LINE_AA)
        aligned_view = cv2.resize(aligned, (224, 224), interpolation=cv2.INTER_LINEAR)

        a, b = float(matrix[0, 0]), float(matrix[0, 1])
        scale = math.hypot(a, b)
        rotation = math.degrees(math.atan2(-b, a))
        metrics = {
            "关键点数量": len(source),
            "输出尺寸": "112 × 112",
            "估计缩放": round(scale, 3),
            "估计旋转": f"{rotation:.2f}°",
            "变换矩阵": [[round(float(value), 4) for value in row] for row in matrix],
        }
        images = [
            image_item("五关键点标注", marked, "黄色圆点为检测到的五个关键点"),
            image_item("对齐结果", aligned_view, "对齐后五官位于标准位置，便于比对"),
            image_item("原始图像", src),
        ]
        steps = [
            {"title": "关键点检测", "description": "RetinaFace 等模型同时输出人脸框与五个关键点。"},
            {"title": "相似变换估计", "description": "用关键点与标准模板求最小二乘相似变换（旋转、缩放、平移）。"},
            {"title": "图像裁剪对齐", "description": "按变换矩阵重采样到固定尺寸，消除姿态与尺度差异。"},
            {"title": "送入识别网络", "description": "对齐后的人脸送入嵌入网络，显著提升比对稳定性。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="对齐是深度人脸识别流程中的关键预处理步骤，能明显降低姿态变化带来的误差。")
