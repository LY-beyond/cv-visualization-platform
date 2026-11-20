"""第 9 章：视觉问答流程演示（规则版）。"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

from app.algorithms import numpy_ops
from app.cases.base import BaseCase
from app.cases.imaging import image_item, param_str, to_data_url
from app.schemas.common import CaseOutput

TAGS = ["person", "dog", "frisbee", "grass", "sky", "tree"]
IMAGE_VECTOR = np.array([0.92, 0.81, 0.58, 0.86, 0.72, 0.55], dtype=np.float32)

QUESTIONS: Dict[str, Dict[str, Any]] = {
    "dog": {
        "text": "图里有狗吗？",
        "vector": np.array([0.1, 0.95, 0.0, 0.1, 0.0, 0.0], dtype=np.float32),
        "answer": "有，图中有一只狗，位于画面右侧草地上。",
    },
    "main": {
        "text": "主要物体是什么？",
        "vector": np.array([0.85, 0.65, 0.35, 0.1, 0.0, 0.0], dtype=np.float32),
        "answer": "主要物体是人（正在抛掷飞盘）和狗，背景为草地与天空。",
    },
    "scene": {
        "text": "场景在室内还是室外？",
        "vector": np.array([0.0, 0.0, 0.0, 0.75, 0.62, 0.5], dtype=np.float32),
        "answer": "场景在室外：包含草地、天空和树木等典型户外元素。",
    },
}


def _scene_canvas() -> np.ndarray:
    canvas = np.zeros((300, 440, 3), dtype=np.uint8)
    canvas[:170] = (235, 206, 135)
    canvas[170:] = (90, 160, 90)
    cv2.rectangle(canvas, (300, 70), (330, 180), (60, 90, 120), -1)
    cv2.circle(canvas, (315, 55), 42, (60, 150, 60), -1, cv2.LINE_AA)
    # 人
    cv2.circle(canvas, (170, 145), 16, (60, 60, 200), -1, cv2.LINE_AA)
    cv2.rectangle(canvas, (156, 160), (184, 225), (40, 80, 200), -1)
    # 狗
    cv2.ellipse(canvas, (270, 215), (42, 24), 0, 0, 360, (50, 110, 170), -1, cv2.LINE_AA)
    cv2.circle(canvas, (307, 196), 13, (50, 110, 170), -1, cv2.LINE_AA)
    # 飞盘
    cv2.ellipse(canvas, (215, 125), (16, 6), -20, 0, 360, (40, 160, 240), -1, cv2.LINE_AA)
    cv2.putText(canvas, "person  dog  frisbee  grass  sky  tree", (12, 288),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (245, 245, 245), 1, cv2.LINE_AA)
    return canvas


class VqaPipelineCase(BaseCase):
    """图像标签与问题文本做相似度匹配，按规则生成答案。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        preset = param_str(params, "question", "dog")
        question = QUESTIONS.get(preset, QUESTIONS["dog"])
        text_vector: np.ndarray = question["vector"]

        similarity = numpy_ops.cosine_similarity(IMAGE_VECTOR, text_vector)
        activation = (IMAGE_VECTOR * text_vector).astype(np.float32)
        ranked: List[Tuple[str, float]] = sorted(
            zip(TAGS, activation.tolist()), key=lambda item: item[1], reverse=True
        )
        hits = [f"{tag} {value:.2f}" for tag, value in ranked if value > 0.2]

        canvas = _scene_canvas()
        option = {
            "tooltip": {"trigger": "axis"},
            "grid": {"left": 60, "right": 20, "top": 30, "bottom": 30},
            "xAxis": {"type": "value", "name": "激活值", "max": 1},
            "yAxis": {"type": "category", "data": [tag for tag, _ in ranked][::-1]},
            "series": [{
                "type": "bar",
                "data": [round(value, 3) for _, value in ranked][::-1],
                "itemStyle": {"color": "#7c3aed"},
                "barMaxWidth": 18,
            }],
        }
        metrics = {
            "问题": question["text"],
            "图文相似度": round(similarity, 3),
            "命中标签": ", ".join(hits) if hits else "-",
            "答案": question["answer"],
        }
        steps = [
            {"title": "① 图像特征提取", "description": "用检测/分类模型把图像编码为标签或向量表示。",
             "formula": "v_img = Encoder(image)"},
            {"title": "② 文本特征提取", "description": "把问题编码到同一语义空间，得到文本向量。",
             "formula": "v_text = Encoder(question)"},
            {"title": "③ 相似度匹配", "description": "计算图文向量余弦相似度，并对标签激活值排序。",
             "formula": "sim = (v_img · v_text) / (||v_img||·||v_text||)"},
            {"title": "④ 生成答案", "description": f"按最高激活标签组织答案：{question['answer']}",
             "image": to_data_url(canvas)},
        ]
        return CaseOutput(
            images=[image_item("示例场景", canvas, "人物、狗、飞盘、草地、天空与树木")],
            charts=[{"title": "标签激活值", "option": option}],
            steps=steps,
            metrics=metrics,
            message="该案例为规则版 VQA：先匹配标签再套用答案模板，真实系统会用图文对齐模型直接生成。",
        )
