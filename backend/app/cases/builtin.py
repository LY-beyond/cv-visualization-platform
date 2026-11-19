"""内置交互案例清单（对应开发指南第 6 章）。

当前阶段先登记案例元信息与参数契约，算法实现按章节逐步补入 cases/ 目录。
chapter 字段使用前端章节标识，便于章节页自动挂载。
"""

from typing import Any, Dict, List, Optional

from app.cases.base import BaseCase
from app.cases.registry import case_registry
from app.schemas.case import CaseMeta
from app.schemas.common import CaseOutput, ParamOption, ParamSpec


class PlaceholderCase(BaseCase):
    """待实现的案例占位，接口可列出但执行时给出明确提示。"""

    def execute(self, params: Dict[str, Any], image: Any = None) -> CaseOutput:
        raise NotImplementedError(f"案例「{self.meta.name}」后端计算尚未实现")


def _slider(name: str, label: str, default: float, minimum: float, maximum: float, step: float = 1) -> ParamSpec:
    return ParamSpec(
        name=name,
        label=label,
        type="slider",
        default=default,
        minimum=minimum,
        maximum=maximum,
        step=step,
    )


def _match_type() -> ParamSpec:
    return ParamSpec(
        name="method",
        label="匹配方法",
        type="select",
        default="sift",
        options=[
            ParamOption(label="SIFT", value="sift"),
            ParamOption(label="ORB", value="orb"),
        ],
    )


_CASES: List[CaseMeta] = [
    # 第1章 概述
    CaseMeta(id="timeline", name="发展时间线", chapter="ch1", implementation="frontend",
             description="按年代呈现关键算法与里程碑事件，可点击查看简介。"),
    CaseMeta(id="method_compare", name="传统方法与深度学习方法对比", chapter="ch1", implementation="frontend",
             description="并排呈现两类方法在数据、硬件、可解释性等维度的差异。"),
    CaseMeta(id="application_gallery", name="应用场景画廊", chapter="ch1", implementation="frontend",
             description="按工业、交通、安防、消费级应用展示示例与说明。"),

    # 第2章 基础知识
    CaseMeta(id="channel_viewer", name="图像通道查看", chapter="ch2", implementation="hybrid",
             description="切换灰度、RGB 单通道与 HSV 通道，查看像素值。"),
    CaseMeta(id="lbp_demo", name="LBP 编码演示", chapter="ch2", implementation="backend",
             description="展示中心像素与 3×3 邻域明暗关系及二值编码结果。",
             params=[_slider("radius", "邻域半径", 1, 1, 5), _slider("grid", "网格步长", 16, 4, 64, 4)]),
    CaseMeta(id="sift_demo", name="SIFT 关键点展示", chapter="ch2", implementation="backend",
             description="提取关键点、主方向与描述符示意并叠加到图像上。",
             params=[_slider("max_keypoints", "关键点上限", 200, 20, 1000, 10)]),
    CaseMeta(id="hog_demo", name="HOG 梯度直方图", chapter="ch2", implementation="backend",
             description="计算梯度方向直方图，展示 cell/block 分块统计结果。",
             params=[_slider("cell_size", "Cell 尺寸", 8, 4, 32, 4), _slider("bins", "方向分箱数", 9, 4, 18)]),
    CaseMeta(id="conv_slide", name="卷积滑窗动画", chapter="ch2", implementation="hybrid",
             description="以给定卷积核滑动，逐帧展示加权求和与特征图结果。",
             params=[ParamSpec(name="kernel", label="卷积核", type="select", default="sobel_x",
                               options=[ParamOption(label="Sobel 横向", value="sobel_x"),
                                        ParamOption(label="Sobel 纵向", value="sobel_y"),
                                        ParamOption(label="Laplace", value="laplace"),
                                        ParamOption(label="模糊", value="blur")]),
                     _slider("stride", "步长", 1, 1, 4)]),
    CaseMeta(id="pooling_demo", name="池化过程演示", chapter="ch2", implementation="frontend",
             description="展示最大池化/平均池化的窗口划分与取值过程。",
             params=[ParamSpec(name="mode", label="池化方式", type="select", default="max",
                               options=[ParamOption(label="最大池化", value="max"),
                                        ParamOption(label="平均池化", value="avg")]),
                     _slider("window", "窗口大小", 2, 2, 8)]),

    # 第2章实例 图像拼接
    CaseMeta(id="feature_matching", name="特征点匹配连线", chapter="ch2-stitch", implementation="backend",
             description="对两幅重叠图像提取特征点并匹配，绘制匹配连线。",
             params=[_match_type(), _slider("max_matches", "匹配数量", 50, 10, 200, 10)]),
    CaseMeta(id="ransac_filter", name="RANSAC 筛选", chapter="ch2-stitch", implementation="backend",
             description="调节误差阈值，观察内点/外点标记与最佳单应矩阵变化。",
             params=[_slider("threshold", "误差阈值", 5.0, 1.0, 20.0, 0.5), _slider("iterations", "迭代次数", 2000, 100, 5000, 100)]),
    CaseMeta(id="transform_demo", name="变换矩阵演示", chapter="ch2-stitch", implementation="hybrid",
             description="调节平移、旋转、缩放参数，观察齐次变换与图像结果。",
             params=[_slider("dx", "水平平移", 0, -100, 100), _slider("dy", "垂直平移", 0, -100, 100),
                     _slider("angle", "旋转角度", 0, -180, 180), _slider("scale", "缩放比例", 1.0, 0.2, 2.0, 0.1)]),
    CaseMeta(id="stitch_preview", name="拼接结果展示", chapter="ch2-stitch", implementation="backend",
             description="展示配准后全景图与重叠区域融合效果。"),

    # 第3章 图像分类
    CaseMeta(id="bow_animation", name="BoW 分步动画", chapter="ch3", implementation="hybrid",
             description="依次展示特征提取、K-Means 造词典、直方图量化到分类的流程。",
             params=[_slider("vocab_size", "词典规模", 64, 16, 256), _slider("step", "当前步骤", 0, 0, 4)]),
    CaseMeta(id="model_compare", name="模型对比面板", chapter="ch3", implementation="backend",
             description="同一数据集下并排比较准确率、参数量与混淆矩阵。",
             params=[ParamSpec(name="dataset", label="数据集", type="select", default="mnist_subset",
                               options=[ParamOption(label="手写数字小样本", value="mnist_subset"),
                                        ParamOption(label="通用物体小样本", value="objects_subset")])]),
    CaseMeta(id="training_curve", name="训练曲线回放", chapter="ch3", implementation="hybrid",
             description="展示损失与准确率曲线；现场训练模型可通过 SSE 实时更新。"),
    CaseMeta(id="confusion_gallery", name="混淆矩阵与错误样例", chapter="ch3", implementation="backend",
             description="热力图展示误判类别，画廊展示错误样本与预测标签。"),
    CaseMeta(id="feature_embedding", name="特征嵌入投影", chapter="ch3", implementation="backend",
             description="将分类特征降维投影到二维平面，按类别着色展示分布。",
             params=[ParamSpec(name="method", label="降维方法", type="select", default="tsne",
                               options=[ParamOption(label="t-SNE", value="tsne"),
                                        ParamOption(label="PCA", value="pca")])]),
    CaseMeta(id="cnn_structure", name="网络结构浏览", chapter="ch3", implementation="frontend",
             description="逐层查看经典 CNN 的层组成与特征图变化示意。"),

    # 第4章 语义分割
    CaseMeta(id="kmeans_seg", name="K-Means 分割迭代", chapter="ch4", implementation="backend",
             description="调节簇数 K，逐轮展示像素聚类收敛与分割帧回放。",
             params=[_slider("k", "簇数 K", 6, 2, 16), _slider("max_iter", "迭代轮数", 20, 1, 60)]),
    CaseMeta(id="canny_steps", name="Canny 分步演示", chapter="ch4", implementation="backend",
             description="依次展示高斯平滑、梯度计算、非极大值抑制、双阈值连接。",
             params=[_slider("low", "低阈值", 50, 0, 255), _slider("high", "高阈值", 150, 0, 255),
                     _slider("sigma", "高斯核 σ", 1.4, 0.5, 4.0, 0.1)]),
    CaseMeta(id="threshold_compare", name="阈值分割对比", chapter="ch4", implementation="backend",
             description="固定阈值、双峰法、迭代阈值、自适应阈值结果并排对比。",
             params=[_slider("threshold", "固定阈值", 128, 0, 255)]),
    CaseMeta(id="slic_demo", name="超像素 SLIC", chapter="ch4", implementation="backend",
             description="展示颜色相近、位置相邻的超像素划分结果。",
             params=[_slider("segments", "超像素数量", 200, 20, 800, 10), _slider("compactness", "紧凑度", 10, 1, 50)]),
    CaseMeta(id="seg_structure", name="分割网络结构示意", chapter="ch4", implementation="frontend",
             description="演示 FCN 上采样与跳跃连接、U-Net 编解码跳连结构。"),
    CaseMeta(id="mask_overlay", name="掩码叠加展示", chapter="ch4", implementation="backend",
             description="将分割掩码以半透明颜色叠加到原图。",
             params=[_slider("alpha", "透明度", 0.5, 0.1, 0.9, 0.05)]),

    # 第5章 目标检测
    CaseMeta(id="box_format", name="边界框格式互转", chapter="ch5", implementation="frontend",
             description="在 xyxy 与 xywh 之间切换显示，标注中心与宽高。"),
    CaseMeta(id="iou_calc", name="IoU 计算器", chapter="ch5", implementation="frontend",
             description="调节两个框的位置与尺寸，实时计算交并比并图形叠加。",
             params=[_slider("x1", "框A x", 40, 0, 300), _slider("y1", "框A y", 40, 0, 300),
                     _slider("w1", "框A 宽", 120, 10, 300), _slider("h1", "框A 高", 100, 10, 300),
                     _slider("x2", "框B x", 100, 0, 300), _slider("y2", "框B y", 80, 0, 300),
                     _slider("w2", "框B 宽", 140, 10, 300), _slider("h2", "框B 高", 120, 10, 300)]),
    CaseMeta(id="nms_steps", name="NMS 逐步抑制", chapter="ch5", implementation="frontend",
             description="按得分依次保留最高分框，抑制高重叠同类框。",
             params=[_slider("iou_threshold", "IoU 阈值", 0.45, 0.1, 0.9, 0.05)]),
    CaseMeta(id="two_stage_flow", name="两阶段检测流程", chapter="ch5", implementation="frontend",
             description="展示候选区域、特征提取、分类与框回归、掩码分支流程。"),
    CaseMeta(id="yolo_grid", name="YOLO 网格与锚框", chapter="ch5", implementation="frontend",
             description="展示网格划分、锚框与多尺度检测头示意。",
             params=[_slider("grid", "网格划分", 7, 3, 19, 2)]),
    CaseMeta(id="detect_overlay", name="检测结果叠加", chapter="ch5", implementation="backend",
             description="在示例图上绘制检测框、类别与置信度。",
             params=[_slider("conf", "置信度阈值", 0.5, 0.05, 0.95, 0.05), _slider("iou", "NMS IoU", 0.45, 0.1, 0.9, 0.05)]),

    # 第6章 识别
    CaseMeta(id="recognition_modes", name="识别模式流程", chapter="ch6", implementation="frontend",
             description="演示注册、1:1 验证、1:N 辨识三种模式的流程与判定关系。"),
    CaseMeta(id="biometric_compare", name="生物特征对比表", chapter="ch6", implementation="frontend",
             description="对比指纹、虹膜、人脸等特征的可采集性、唯一性、稳定性与安全性。"),
    CaseMeta(id="iris_norm", name="虹膜归一化示意", chapter="ch6", implementation="backend",
             description="展示环形虹膜展开为归一化矩形的过程。"),
    CaseMeta(id="face_embedding", name="人脸嵌入空间", chapter="ch6", implementation="backend",
             description="投影人脸特征，展示同类聚拢、异类推远与 Triplet/角度间隔作用。"),
    CaseMeta(id="face_align", name="关键点对齐示意", chapter="ch6", implementation="backend",
             description="展示五关键点位置与人脸对齐结果。"),
    CaseMeta(id="distance_match", name="匹配距离演示", chapter="ch6", implementation="frontend",
             description="调节阈值，观察同类/异类匹配的接受与拒绝分界与分布曲线。",
             params=[_slider("threshold", "距离阈值", 1.0, 0.2, 2.0, 0.05)]),
]


def _register_builtin_cases() -> None:
    for meta in _CASES:
        case_registry.register(PlaceholderCase(meta))


_register_builtin_cases()
