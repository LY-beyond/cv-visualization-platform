"""第 2 章实例：特征点匹配、RANSAC、变换矩阵与图像拼接。"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

from app.cases.base import BaseCase
from app.cases.imaging import (
    example_image,
    image_item,
    load_image,
    param_float,
    param_int,
    param_str,
    stitch_pair,
)
from app.schemas.common import CaseOutput


def _detector(method: str):
    if method == "orb":
        return cv2.ORB_create(nfeatures=1500)
    return cv2.SIFT_create(nfeatures=1500)


def _match_pair(left: np.ndarray, right: np.ndarray, method: str,
                ratio: float = 0.75) -> Tuple[List[cv2.KeyPoint], List[cv2.KeyPoint], List[cv2.DMatch]]:
    gray_left = cv2.cvtColor(left, cv2.COLOR_BGR2GRAY)
    gray_right = cv2.cvtColor(right, cv2.COLOR_BGR2GRAY)
    detector = _detector(method)
    kp_left, des_left = detector.detectAndCompute(gray_left, None)
    kp_right, des_right = detector.detectAndCompute(gray_right, None)
    if des_left is None or des_right is None:
        raise ValueError("示例图特征不足，无法完成匹配")
    norm = cv2.NORM_HAMMING if method == "orb" else cv2.NORM_L2
    matcher = cv2.BFMatcher(norm)
    knn = matcher.knnMatch(des_left, des_right, k=2)
    good = [pair[0] for pair in knn if len(pair) == 2 and pair[0].distance < ratio * pair[1].distance]
    good.sort(key=lambda item: item.distance)
    return kp_left, kp_right, good


class FeatureMatchingCase(BaseCase):
    """特征点匹配连线。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        method = param_str(params, "method", "sift")
        max_matches = param_int(params, "max_matches", 50, 10, 200)
        left, right = stitch_pair()
        kp_left, kp_right, good = _match_pair(left, right, method)

        selected = good[:max_matches]
        if not selected:
            raise ValueError("未找到有效匹配点，可尝试切换匹配方法")
        canvas = cv2.drawMatches(
            left, kp_left, right, kp_right, selected, None,
            matchColor=(40, 200, 90), singlePointColor=(150, 150, 150),
            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS,
        )
        distances = [float(match.distance) for match in selected]
        metrics = {
            "匹配方法": "ORB" if method == "orb" else "SIFT",
            "左图关键点": len(kp_left),
            "右图关键点": len(kp_right),
            "候选匹配": len(good),
            "展示匹配": len(selected),
            "平均距离": round(float(np.mean(distances)), 2),
        }
        images = [
            image_item("匹配连线", canvas, "绿色连线为通过 Lowe 比值检验的可靠匹配"),
            image_item("左图", left),
            image_item("右图", right),
        ]
        steps = [
            {"title": "特征检测", "description": f"在左右两图中分别检测关键点（{metrics['左图关键点']} / {metrics['右图关键点']}）。"},
            {"title": "描述与匹配", "description": "计算描述符后用暴力匹配查找最近邻，并按距离排序。"},
            {"title": "比值检验", "description": "最近距离 < 0.75 × 次近距离时保留，剔除模糊匹配。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="匹配质量决定后续变换估计的稳定性，可对比 SIFT 与 ORB 的连线数量。")


class RansacFilterCase(BaseCase):
    """RANSAC 内外点判定。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        threshold = param_float(params, "threshold", 5.0, 1.0, 20.0)
        iterations = param_int(params, "iterations", 2000, 100, 5000)
        left, right = stitch_pair()
        kp_left, kp_right, good = _match_pair(left, right, "sift")
        if len(good) < 4:
            raise ValueError("匹配点不足 4 对，无法估计单应矩阵")

        src = np.float32([kp_left[match.queryIdx].pt for match in good]).reshape(-1, 1, 2)
        dst = np.float32([kp_right[match.trainIdx].pt for match in good]).reshape(-1, 1, 2)
        homography, mask = cv2.findHomography(src, dst, cv2.RANSAC, threshold, maxIters=iterations)
        if homography is None or mask is None:
            raise ValueError("RANSAC 未能估计出可靠的单应矩阵")

        status = mask.ravel().astype(bool)
        inliers = [match for match, keep in zip(good, status) if keep][:200]
        outliers = [match for match, keep in zip(good, status) if not keep][:200]
        canvas = cv2.drawMatches(
            left, kp_left, right, kp_right, outliers, None,
            matchColor=(60, 60, 230), singlePointColor=(150, 150, 150),
            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS,
        )
        canvas = cv2.drawMatches(
            left, kp_left, right, kp_right, inliers, canvas,
            matchColor=(40, 200, 90), singlePointColor=(150, 150, 150),
            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS,
        )
        inlier_count = int(status.sum())
        ratio = inlier_count / len(good) if good else 0.0
        metrics = {
            "匹配总数": len(good),
            "内点数量": inlier_count,
            "外点数量": len(good) - inlier_count,
            "内点比例": f"{ratio * 100:.1f}%",
            "误差阈值": threshold,
            "迭代次数": iterations,
            "单应矩阵": [[round(float(value), 4) for value in row] for row in homography],
        }
        images = [
            image_item("内外点标记", canvas, "绿色为内点，红色为被剔除的外点"),
        ]
        steps = [
            {"title": "随机采样", "description": "每次随机抽取 4 对匹配点，求解最小二乘单应矩阵。"},
            {"title": "统计内点", "description": f"重投影误差小于阈值 {threshold} 像素的匹配点计为内点。"},
            {"title": "迭代择优", "description": f"重复 {iterations} 次，保留内点最多的模型作为最终结果。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="阈值过小会导致内点不足，过大则引入误匹配，可拖动阈值观察变化。")


class TransformDemoCase(BaseCase):
    """平移、旋转、缩放变换演示。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        src = load_image(image, example_image())
        dx = param_float(params, "dx", 0, -100, 100)
        dy = param_float(params, "dy", 0, -100, 100)
        angle = param_float(params, "angle", 0, -180, 180)
        scale = param_float(params, "scale", 1.0, 0.2, 2.0)

        height, width = src.shape[:2]
        matrix = cv2.getRotationMatrix2D((width / 2.0, height / 2.0), angle, scale)
        matrix[0, 2] += dx
        matrix[1, 2] += dy
        transformed = cv2.warpAffine(
            src, matrix, (width, height),
            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(245, 245, 245),
        )

        # 在结果图上绘制坐标网格，直观展示平移量与旋转角
        grid = transformed.copy()
        for gx in range(0, width, 60):
            cv2.line(grid, (gx, 0), (gx, height), (210, 210, 210), 1)
        for gy in range(0, height, 60):
            cv2.line(grid, (0, gy), (width, gy), (210, 210, 210), 1)
        cv2.circle(grid, (int(width / 2 + dx), int(height / 2 + dy)), 5, (0, 0, 255), -1)

        homography = np.vstack([matrix, [0, 0, 1]])
        metrics = {
            "水平平移 dx": dx,
            "垂直平移 dy": dy,
            "旋转角度": f"{angle}°",
            "缩放比例": scale,
            "仿射矩阵": [[round(float(value), 3) for value in row] for row in homography],
        }
        images = [
            image_item("变换结果", grid, "红色圆点为变换后的图像中心"),
            image_item("原始图像", src),
        ]
        steps = [
            {"title": "齐次坐标", "description": "二维点 (x, y) 扩展为 (x, y, 1)，即可用 3×3 矩阵统一表示平移、旋转与缩放。"},
            {"title": "仿射变换", "description": "矩阵最后一行固定为 (0, 0, 1)，保留平行关系，共 6 个自由度。"},
            {"title": "参数对应", "description": "旋转与缩放由左上 2×2 子矩阵控制，平移由第三列控制。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="调节 dx / dy / angle / scale 可实时观察仿射变换对图像的影响。")


class StitchPreviewCase(BaseCase):
    """配准后的全景拼接结果。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        left, right = stitch_pair()
        kp_left, kp_right, good = _match_pair(left, right, "sift")
        if len(good) < 4:
            raise ValueError("匹配点不足，无法完成拼接")
        src_pts = np.float32([kp_left[match.queryIdx].pt for match in good]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp_right[match.trainIdx].pt for match in good]).reshape(-1, 1, 2)
        homography, _ = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 4.0)
        if homography is None:
            raise ValueError("单应矩阵估计失败")

        height1, width1 = left.shape[:2]
        height2, width2 = right.shape[:2]
        corners = np.float32([[0, 0], [0, height2 - 1], [width2 - 1, height2 - 1], [width2 - 1, 0]]).reshape(-1, 1, 2)
        warped_corners = cv2.perspectiveTransform(corners, homography)
        left_corners = np.float32([[0, 0], [0, height1 - 1], [width1 - 1, height1 - 1], [width1 - 1, 0]]).reshape(-1, 1, 2)
        all_corners = np.concatenate([warped_corners, left_corners], axis=0)
        x_min, y_min = np.floor(all_corners.min(axis=0).ravel()).astype(int)
        x_max, y_max = np.ceil(all_corners.max(axis=0).ravel()).astype(int)
        translate = np.array([[1, 0, -x_min], [0, 1, -y_min], [0, 0, 1]], dtype=np.float64)
        shifted = translate @ homography
        panorama = cv2.warpPerspective(right, shifted, (int(x_max - x_min), int(y_max - y_min)))

        offset_x, offset_y = int(-x_min), int(-y_min)
        roi = panorama[offset_y:offset_y + height1, offset_x:offset_x + width1]
        overlap = roi.sum(axis=2) > 0
        blended = roi.astype(np.float32)
        blended[overlap] = 0.5 * blended[overlap] + 0.5 * left.astype(np.float32)[overlap]
        panorama[offset_y:offset_y + height1, offset_x:offset_x + width1] = np.clip(blended, 0, 255).astype(np.uint8)

        metrics = {
            "匹配点对": len(good),
            "全景尺寸": f"{panorama.shape[1]} × {panorama.shape[0]}",
            "左图尺寸": f"{width1} × {height1}",
            "右图尺寸": f"{width2} × {height2}",
            "重叠处理": "加权平均融合",
        }
        images = [
            image_item("拼接全景图", panorama, "重叠区域采用 0.5/0.5 加权平均，减少接缝"),
            image_item("左图（基准）", left),
            image_item("右图（待配准）", right),
        ]
        steps = [
            {"title": "匹配与估计", "description": f"由 {len(good)} 对匹配点经 RANSAC 求解单应矩阵。"},
            {"title": "坐标重映射", "description": "把右图按单应矩阵投影到左图坐标系，并平移画布避免负坐标。"},
            {"title": "重叠融合", "description": "重叠区域加权平均，亮度差异较大时可改用多频段融合。"},
        ]
        return CaseOutput(images=images, steps=steps, metrics=metrics,
                          message="示例图为同一场景的左右裁剪，因此拼接结果接近无缝；真实场景需考虑曝光补偿。")
