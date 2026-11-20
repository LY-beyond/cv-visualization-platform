"""案例公用图像工具：确定性示例图、编码、参数解析与面板拼合。

所有示例图由固定随机种子生成，保证断网环境下每次演示结果一致。
"""

from __future__ import annotations

import base64
import math
from typing import Any, Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

_CACHE: Dict[str, np.ndarray] = {}

_FONT = cv2.FONT_HERSHEY_SIMPLEX


# ---------------------------------------------------------------------------
# 参数解析
# ---------------------------------------------------------------------------
def param_float(params: Dict[str, Any], name: str, default: float,
                minimum: Optional[float] = None, maximum: Optional[float] = None) -> float:
    try:
        value = float(params.get(name, default))
    except (TypeError, ValueError):
        value = float(default)
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def param_int(params: Dict[str, Any], name: str, default: int,
              minimum: Optional[int] = None, maximum: Optional[int] = None) -> int:
    return int(round(param_float(params, name, default, minimum, maximum)))


def param_str(params: Dict[str, Any], name: str, default: str) -> str:
    value = params.get(name, default)
    return default if value is None else str(value)


# ---------------------------------------------------------------------------
# 图像编解码
# ---------------------------------------------------------------------------
def to_data_url(image: np.ndarray) -> str:
    """把 BGR 图像编码为前端可直接使用的 data URL。"""
    ok, buffer = cv2.imencode(".png", image)
    if not ok:
        raise RuntimeError("图像编码失败")
    return "data:image/png;base64," + base64.b64encode(buffer.tobytes()).decode("ascii")


def decode_upload(data: Optional[bytes]) -> Optional[np.ndarray]:
    """解析上传图片，限制宽度避免超大图拖慢案例计算。"""
    if not data:
        return None
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        return None
    height, width = image.shape[:2]
    if width > 720:
        scale = 720.0 / width
        image = cv2.resize(image, (720, max(1, int(height * scale))), interpolation=cv2.INTER_AREA)
    return image


def load_image(data: Optional[bytes], fallback: np.ndarray) -> np.ndarray:
    """优先使用上传图片，否则回退到内置示例图。"""
    uploaded = decode_upload(data)
    return uploaded if uploaded is not None else fallback


# ---------------------------------------------------------------------------
# 示例图（确定性生成）
# ---------------------------------------------------------------------------
def scene(seed: int = 11, size: Tuple[int, int] = (360, 840)) -> np.ndarray:
    """生成带丰富纹理与几何形状的合成场景，用于特征点与拼接案例。"""
    key = f"scene:{seed}:{size}"
    if key in _CACHE:
        return _CACHE[key]

    height, width = size
    rng = np.random.default_rng(seed)
    x = np.linspace(0.0, 1.0, width, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    base = np.zeros((height, width, 3), dtype=np.float32)
    base[..., 0] = 95 + 70 * x + 30 * y
    base[..., 1] = 85 + 55 * y
    base[..., 2] = 75 + 65 * (1.0 - x) + 25 * (1.0 - y)
    image = np.clip(base, 0, 255).astype(np.uint8)

    palette = [
        (60, 130, 240), (80, 200, 120), (230, 200, 60),
        (200, 90, 200), (60, 190, 220), (240, 120, 80),
    ]
    for index in range(34):
        color = palette[index % len(palette)]
        cx = int(rng.integers(24, width - 24))
        cy = int(rng.integers(24, height - 24))
        radius = int(rng.integers(9, 30))
        kind = index % 3
        if kind == 0:
            cv2.rectangle(image, (cx - radius, cy - radius), (cx + radius, cy + radius), color, -1)
        elif kind == 1:
            pts = rng.integers(-radius, radius, size=(3, 2)) + np.array([cx, cy])
            cv2.fillPoly(image, [pts.astype(np.int32)], color)
        else:
            cv2.circle(image, (cx, cy), radius, color, -1)
        cv2.line(
            image,
            (cx, cy),
            (cx + int(rng.integers(-70, 70)), cy + int(rng.integers(-50, 50))),
            (250, 250, 250),
            1,
            lineType=cv2.LINE_AA,
        )

    noise = rng.normal(0.0, 5.0, (height, width, 3)).astype(np.float32)
    image = np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    _CACHE[key] = image
    return image


def example_image() -> np.ndarray:
    """基础知识类案例的默认输入图。"""
    key = "example"
    if key not in _CACHE:
        image = scene()[:, 70:590].copy()
        cv2.putText(image, "CV DEMO", (18, image.shape[0] - 18), _FONT, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
        _CACHE[key] = image
    return _CACHE[key]


def stitch_pair() -> Tuple[np.ndarray, np.ndarray]:
    """构造左右两幅具有重叠区域的图像，用于匹配与拼接案例。"""
    key = "stitch_pair"
    if key not in _CACHE:
        panorama = scene(seed=23)
        left = panorama[:, :520].copy()
        right = panorama[:, 360:880].copy()
        _CACHE[key] = (left, right)
    return _CACHE[key]


def shapes_image() -> np.ndarray:
    """分割与检测案例使用的彩色形状图。"""
    key = "shapes"
    if key not in _CACHE:
        height, width = 320, 460
        image = np.full((height, width, 3), 246, dtype=np.uint8)
        for offset in range(-height, width, 26):
            cv2.line(image, (offset, 0), (offset + height, height), (238, 240, 242), 9)
        cv2.circle(image, (110, 120), 72, (70, 120, 220), -1)
        cv2.rectangle(image, (238, 58), (398, 208), (95, 190, 95), -1)
        triangle = np.array([[200, 292], [318, 292], [258, 196]], dtype=np.int32)
        cv2.fillPoly(image, [triangle], (225, 130, 65))
        cv2.circle(image, (352, 262), 34, (200, 120, 210), -1)
        _CACHE[key] = image
    return _CACHE[key]


def face_image() -> np.ndarray:
    """关键点对齐案例使用的合成人脸。"""
    key = "face"
    if key not in _CACHE:
        image = np.full((280, 260, 3), 238, dtype=np.uint8)
        cv2.ellipse(image, (130, 140), (92, 118), 0, 0, 360, (176, 198, 226), -1)
        cv2.ellipse(image, (88, 112), (20, 10), 0, 0, 360, (70, 80, 95), -1)
        cv2.ellipse(image, (172, 112), (20, 10), 0, 0, 360, (70, 80, 95), -1)
        cv2.circle(image, (88, 112), 6, (30, 30, 30), -1)
        cv2.circle(image, (172, 112), 6, (30, 30, 30), -1)
        cv2.line(image, (86, 88), (52, 80), (90, 95, 110), 3, cv2.LINE_AA)
        cv2.line(image, (174, 88), (208, 80), (90, 95, 110), 3, cv2.LINE_AA)
        nose = np.array([[130, 120], [118, 160], [142, 160]], dtype=np.int32)
        cv2.polylines(image, [nose], False, (140, 160, 190), 3, cv2.LINE_AA)
        cv2.ellipse(image, (130, 202), (38, 16), 0, 0, 180, (110, 120, 170), 3, cv2.LINE_AA)
        _CACHE[key] = image
    return _CACHE[key]


def eye_image() -> np.ndarray:
    """虹膜归一化案例使用的合成眼部图像。"""
    key = "eye"
    if key not in _CACHE:
        image = np.full((200, 300, 3), 240, dtype=np.uint8)
        cv2.ellipse(image, (150, 100), (130, 62), 0, 0, 360, (248, 248, 248), -1)
        cv2.circle(image, (150, 100), 50, (120, 90, 70), -1)
        cv2.circle(image, (150, 100), 50, (60, 45, 35), 4, cv2.LINE_AA)
        for angle in range(0, 360, 15):
            rad = math.radians(angle)
            p1 = (int(150 + 40 * math.cos(rad)), int(100 + 40 * math.sin(rad)))
            p2 = (int(150 + 46 * math.cos(rad)), int(100 + 46 * math.sin(rad)))
            cv2.line(image, p1, p2, (150, 120, 95), 1, cv2.LINE_AA)
        cv2.circle(image, (150, 100), 17, (20, 20, 22), -1)
        cv2.circle(image, (142, 92), 4, (200, 200, 210), -1)
        cv2.ellipse(image, (150, 100), (130, 62), 0, 0, 180, (30, 30, 30), 3, cv2.LINE_AA)
        cv2.ellipse(image, (150, 100), (130, 62), 0, 180, 360, (30, 30, 30), 3, cv2.LINE_AA)
        _CACHE[key] = image
    return _CACHE[key]


# ---------------------------------------------------------------------------
# 面板拼合
# ---------------------------------------------------------------------------
def _fit_cell(image: np.ndarray, size: Tuple[int, int]) -> np.ndarray:
    cell_w, cell_h = size
    height, width = image.shape[:2]
    scale = min(cell_w / width, cell_h / height)
    resized = cv2.resize(
        image,
        (max(1, int(width * scale)), max(1, int(height * scale))),
        interpolation=cv2.INTER_AREA,
    )
    if resized.ndim == 2:
        resized = cv2.cvtColor(resized, cv2.COLOR_GRAY2BGR)
    canvas = np.full((cell_h, cell_w, 3), 248, dtype=np.uint8)
    top = (cell_h - resized.shape[0]) // 2
    left = (cell_w - resized.shape[1]) // 2
    canvas[top:top + resized.shape[0], left:left + resized.shape[1]] = resized
    return canvas


def montage(items: Sequence[Tuple[str, np.ndarray]], cols: int = 2,
            cell: Tuple[int, int] = (300, 220)) -> np.ndarray:
    """把多张图带标题拼成一张图，标题使用 ASCII 以兼容 OpenCV 内置字体。"""
    tiles: List[np.ndarray] = []
    for title, image in items:
        tile = _fit_cell(image, cell)
        cv2.rectangle(tile, (0, 0), (cell[0] - 1, 22), (32, 38, 48), -1)
        cv2.putText(tile, title, (8, 16), _FONT, 0.45, (240, 240, 240), 1, cv2.LINE_AA)
        tiles.append(tile)
    rows: List[np.ndarray] = []
    for start in range(0, len(tiles), cols):
        row = tiles[start:start + cols]
        while len(row) < cols:
            row.append(np.full((cell[1], cell[0], 3), 248, dtype=np.uint8))
        rows.append(np.hstack(row))
    return np.vstack(rows)


def gray_to_bgr(image: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR) if image.ndim == 2 else image


def colorize(gray: np.ndarray, colormap: int = cv2.COLORMAP_JET) -> np.ndarray:
    """把单通道结果映射为伪彩色，便于观察数值差异。"""
    normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    return cv2.applyColorMap(normalized.astype(np.uint8), colormap)


def image_item(title: str, image: np.ndarray, caption: str = "") -> Dict[str, Any]:
    item: Dict[str, Any] = {"title": title, "src": to_data_url(image)}
    if caption:
        item["caption"] = caption
    return item


def chart_item(title: str, option: Dict[str, Any], height: int = 260) -> Dict[str, Any]:
    return {"title": title, "option": option, "height": height}
