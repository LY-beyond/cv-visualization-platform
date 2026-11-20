"""第 5 章目标检测案例：置信度过滤、IoU 与 NMS 叠加展示。"""

from __future__ import annotations

from typing import Any, Dict, List

import cv2
import numpy as np

from app.cases.base import BaseCase
from app.cases.imaging import image_item, load_image, param_float, shapes_image
from app.schemas.common import CaseOutput


def _iou(box_a: List[int], box_b: List[int]) -> float:
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    inter_x1, inter_y1 = max(ax1, bx1), max(ay1, by1)
    inter_x2, inter_y2 = min(ax2, bx2), min(ay2, by2)
    inter_width = max(0, inter_x2 - inter_x1)
    inter_height = max(0, inter_y2 - inter_y1)
    intersection = inter_width * inter_height
    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)
    union = area_a + area_b - intersection
    return intersection / union if union > 0 else 0.0


def _nms(candidates: List[Dict[str, Any]], threshold: float):
    ordered = sorted(candidates, key=lambda item: -item["score"])
    kept: List[Dict[str, Any]] = []
    suppressed: List[Dict[str, Any]] = []
    for item in ordered:
        if all(_iou(item["box"], other["box"]) <= threshold for other in kept):
            kept.append(item)
        else:
            suppressed.append(item)
    return kept, suppressed


class DetectOverlayCase(BaseCase):
    """检测框、类别与置信度叠加（内置示例检测结果）。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, shapes_image())
        confidence = param_float(params, "conf", 0.5, 0.05, 0.95)
        iou_threshold = param_float(params, "iou", 0.45, 0.1, 0.9)

        raw = [
            {"box": [38, 48, 182, 192], "score": 0.92, "label": "circle", "color": (70, 120, 220)},
            {"box": [45, 52, 180, 190], "score": 0.58, "label": "circle", "color": (70, 120, 220)},
            {"box": [236, 56, 400, 210], "score": 0.90, "label": "rectangle", "color": (95, 190, 95)},
            {"box": [244, 62, 394, 204], "score": 0.66, "label": "rectangle", "color": (95, 190, 95)},
            {"box": [196, 192, 322, 296], "score": 0.84, "label": "triangle", "color": (225, 130, 65)},
            {"box": [316, 226, 388, 298], "score": 0.79, "label": "circle", "color": (200, 120, 210)},
            {"box": [24, 252, 128, 312], "score": 0.31, "label": "background", "color": (140, 140, 140)},
        ]
        filtered = [item for item in raw if item["score"] >= confidence]
        kept, suppressed = _nms(filtered, iou_threshold)

        canvas = src.copy()
        for item in suppressed:
            x1, y1, x2, y2 = item["box"]
            cv2.rectangle(canvas, (x1, y1), (x2, y2), (150, 150, 150), 1)
        for item in kept:
            x1, y1, x2, y2 = item["box"]
            color = item["color"]
            cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)
            label = f"{item['label']} {item['score']:.2f}"
            (text_width, text_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
            cv2.rectangle(canvas, (x1, max(0, y1 - text_height - 6)), (x1 + text_width + 6, y1), color, -1)
            cv2.putText(canvas, label, (x1 + 3, max(12, y1 - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)

        metrics = {
            "候选框": len(raw),
            "置信度过滤后": len(filtered),
            "最终保留": len(kept),
            "被 NMS 抑制": len(suppressed),
            "置信度阈值": confidence,
            "NMS IoU 阈值": iou_threshold,
        }
        images = [
            image_item("检测结果", canvas, "彩色框为保留结果，灰色细框为被抑制的重复框"),
            image_item("原始图像", src),
        ]
        steps = [
            {"title": "置信度过滤", "description": f"丢弃得分低于 {confidence:.2f} 的候选框。"},
            {"title": "非极大值抑制", "description": f"按得分从高到低保留，与已保留框 IoU 大于 {iou_threshold:.2f} 的同类框被抑制。"},
            {"title": "结果绘制", "description": "绘制边界框、类别与置信度，供人工核对。"},
        ]
        return CaseOutput(
            images=images, steps=steps, metrics=metrics,
            overlay={"boxes": [{"box": item["box"], "label": item["label"], "score": item["score"]}
                               for item in kept]},
            message="本案例使用内置示例检测结果演示后处理流程，调整阈值可观察框数量的变化。",
        )
