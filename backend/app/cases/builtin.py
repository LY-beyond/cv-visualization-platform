"""内置交互案例清单（对应开发指南第 6 章）。

登记案例元信息与参数契约；已实现的后端案例由 implementations 映射替换占位实现。
chapter 字段使用前端章节标识，便于章节页自动挂载。
"""

from typing import Any, Dict, List, Optional

from app.cases.base import BaseCase
from app.cases.implementations import IMPLEMENTATIONS
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


def _engine() -> ParamSpec:
    return ParamSpec(
        name="engine",
        label="实现方式",
        type="select",
        default="opencv",
        options=[
            ParamOption(label="OpenCV 库实现", value="opencv"),
            ParamOption(label="NumPy 手写步骤", value="numpy"),
        ],
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
             description="切换灰度、RGB 单通道与 HSV 通道，查看像素值。",
             params=[ParamSpec(name="mode", label="显示通道", type="select", default="rgb",
                               options=[ParamOption(label="RGB 原图", value="rgb"),
                                        ParamOption(label="灰度图", value="gray"),
                                        ParamOption(label="红色通道 R", value="r"),
                                        ParamOption(label="绿色通道 G", value="g"),
                                        ParamOption(label="蓝色通道 B", value="b"),
                                        ParamOption(label="色调 H", value="h"),
                                        ParamOption(label="饱和度 S", value="s"),
                                        ParamOption(label="明度 V", value="v")])]),
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
    CaseMeta(id="lab2-filter-compare", name="滤波器对比实验台", chapter="ch2", implementation="backend",
             description="叠加椒盐噪声后对比均值、高斯、中值滤波，实时输出 PSNR、耗时与中间结果。",
             params=[_slider("noise", "噪声比例", 0.06, 0.01, 0.2, 0.01),
                     _slider("ksize", "核大小", 3, 3, 9, 2)]),
    CaseMeta(id="lab2-edge-operators", name="四种边缘算子对比", chapter="ch2", implementation="backend",
             description="Roberts / Prewitt / Sobel / Laplacian 四联图，统计边缘占比与平均梯度。",
             params=[_slider("sigma", "高斯预平滑 σ", 0.0, 0.0, 2.5, 0.1),
                     _slider("threshold", "二值阈值", 40, 0, 200, 5)]),

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
    CaseMeta(id="lab3-bow-explorer", name="BoVW 特征对比浏览器", chapter="ch3", implementation="frontend",
             description="在 5 种描述子、4 种词典规模与 6 种联合特征之间切换，查看实验三的真实准确率。",
             params=[ParamSpec(name="feature", label="描述子", type="select", default="HOG",
                               options=[ParamOption(label="HOG", value="HOG"),
                                        ParamOption(label="稠密 SIFT", value="稠密SIFT"),
                                        ParamOption(label="SIFT", value="SIFT"),
                                        ParamOption(label="LBP", value="LBP"),
                                        ParamOption(label="ORB", value="ORB")]),
                     ParamSpec(name="vocab", label="词典规模 k", type="select", default="100",
                               options=[ParamOption(label="k=25", value="25"),
                                        ParamOption(label="k=50", value="50"),
                                        ParamOption(label="k=100", value="100"),
                                        ParamOption(label="k=200", value="200")])]),
    CaseMeta(id="lab3-lenet-draw", name="LeNet 手写数字在线识别", chapter="ch3", implementation="frontend",
             description="在画板写 0~9，浏览器内用实验三教师模型（ONNX）推理并输出 top-3 概率，可切换两种预处理。"),

    # 第4章 语义分割
    CaseMeta(id="kmeans_seg", name="K-Means 分割迭代", chapter="ch4", implementation="backend",
             description="调节簇数 K，逐轮展示像素聚类收敛与分割帧回放。",
             params=[_slider("k", "簇数 K", 6, 2, 16), _slider("max_iter", "迭代轮数", 20, 1, 60),
                     _engine()]),
    CaseMeta(id="canny_steps", name="Canny 分步演示", chapter="ch4", implementation="backend",
             description="依次展示高斯平滑、梯度计算、非极大值抑制、双阈值连接。",
             params=[_slider("low", "低阈值", 50, 0, 255), _slider("high", "高阈值", 150, 0, 255),
                     _slider("sigma", "高斯核 σ", 1.4, 0.5, 4.0, 0.1), _engine()]),
    CaseMeta(id="threshold_compare", name="阈值分割对比", chapter="ch4", implementation="backend",
             description="固定阈值、双峰法、迭代阈值、自适应阈值结果并排对比。",
             params=[_slider("threshold", "固定阈值", 128, 0, 255), _engine()]),
    CaseMeta(id="slic_demo", name="超像素 SLIC", chapter="ch4", implementation="backend",
             description="展示颜色相近、位置相邻的超像素划分结果。",
             params=[_slider("segments", "超像素数量", 200, 20, 800, 10), _slider("compactness", "紧凑度", 10, 1, 50)]),
    CaseMeta(id="seg_structure", name="分割网络结构示意", chapter="ch4", implementation="frontend",
             description="演示 FCN 上采样与跳跃连接、U-Net 编解码跳连结构。"),
    CaseMeta(id="mask_overlay", name="掩码叠加展示", chapter="ch4", implementation="backend",
             description="将分割掩码以半透明颜色叠加到原图。",
             params=[_slider("alpha", "透明度", 0.5, 0.1, 0.9, 0.05)]),
    CaseMeta(id="onnx_segment", name="浏览器端语义分割（ONNX）", chapter="ch4", implementation="frontend",
             description="在浏览器内运行 SegFormer 模型，逐像素预测并叠加掩码；模型缺失时回退内置示例。"),
    CaseMeta(id="lab4-meanshift", name="Mean Shift 聚类实验室", chapter="ch4", implementation="backend",
             description="调节半径，观察手写 Mean Shift 的中心轨迹与收敛中心数变化。",
             params=[_slider("radius", "半径 radius", 3.0, 1.0, 8.0, 0.5)]),
    CaseMeta(id="lab4-slic-player", name="SLIC 超像素迭代回放", chapter="ch4", implementation="frontend",
             description="回放实验四保留的 loop0~loop9 真实迭代帧，对比 M=40 与 M=5 的边界演化。",
             params=[ParamSpec(name="compactness", label="紧凑度 M", type="select", default="40",
                               options=[ParamOption(label="M=40（紧凑）", value="40"),
                                        ParamOption(label="M=5（贴边）", value="5")])]),
    CaseMeta(id="lab4-canny-steps", name="Canny 五步可视化", chapter="ch4", implementation="backend",
             description="sigma 与双阈值可调，输出六步中间图与非零像素统计。",
             params=[_slider("sigma", "高斯核 σ", 1.0, 0.3, 2.5, 0.1),
                     _slider("low", "低阈值", 30, 0, 150, 5),
                     _slider("high", "高阈值", 60, 10, 255, 5)]),
    CaseMeta(id="lab4-transpose-conv", name="转置卷积矩阵演示器", chapter="ch4", implementation="backend",
             description="编辑 2×2 输入与 stride/kernel，查看输出矩阵热力图、尺寸公式与非零统计。",
             params=[_slider("stride", "stride", 3, 1, 4), _slider("kernel", "kernel", 1, 1, 3),
                     _slider("a", "输入 a", 1, 0, 9), _slider("b", "输入 b", 2, 0, 9),
                     _slider("c", "输入 c", 3, 0, 9), _slider("d", "输入 d", 4, 0, 9)]),

    # 第5章 目标检测
    CaseMeta(id="box_format", name="边界框格式互转", chapter="ch5", implementation="frontend",
             description="在 xyxy 与 xywh 之间切换显示，标注中心与宽高。",
             params=[ParamSpec(name="format", label="显示格式", type="select", default="xyxy",
                               options=[ParamOption(label="左上右下 xyxy", value="xyxy"),
                                        ParamOption(label="中心宽高 xywh", value="xywh")]),
                     _slider("x", "框中心 x", 160, 20, 300),
                     _slider("y", "框中心 y", 140, 20, 280),
                     _slider("w", "框宽", 180, 40, 300),
                     _slider("h", "框高", 120, 40, 240)]),
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
    CaseMeta(id="onnx_detect", name="浏览器端目标检测（ONNX）", chapter="ch5", implementation="frontend",
             description="在浏览器内运行 YOLO 模型，绘制检测框并统计类别；模型缺失时回退内置示例。"),
    CaseMeta(id="lab5-yolo-decode", name="YOLO Anchor 解码", chapter="ch5", implementation="frontend",
             description="调节 tx/ty/tw/th 与网格尺度，实时观察 σ 约束中心、指数恢复宽高的解码过程。",
             params=[ParamSpec(name="scale", label="网格尺度", type="select", default="13",
                               options=[ParamOption(label="13×13（大目标）", value="13"),
                                        ParamOption(label="26×26（中目标）", value="26"),
                                        ParamOption(label="52×52（小目标）", value="52")]),
                     _slider("tx", "tx", 0.0, -2.0, 2.0, 0.1),
                     _slider("ty", "ty", 0.0, -2.0, 2.0, 0.1),
                     _slider("tw", "tw", 0.0, -2.0, 2.0, 0.1),
                     _slider("th", "th", 0.0, -2.0, 2.0, 0.1),
                     _slider("anchor_w", "Anchor 宽", 2.0, 0.5, 4.0, 0.1),
                     _slider("anchor_h", "Anchor 高", 3.0, 0.5, 4.0, 0.1)]),
    CaseMeta(id="lab5-letterbox", name="Letterbox 坐标同步", chapter="ch5", implementation="frontend",
             description="调节目标尺寸，查看等比缩放 + 补边后的框坐标变换 x′ = s·x + p_x。",
             params=[_slider("target", "目标边长", 416, 256, 640, 32),
                     _slider("x1", "框 x1", 120, 0, 480, 5),
                     _slider("y1", "框 y1", 80, 0, 360, 5),
                     _slider("x2", "框 x2", 340, 40, 640, 5),
                     _slider("y2", "框 y2", 260, 40, 480, 5)]),
    CaseMeta(id="lab5-nms-lab", name="置信度与 NMS 双阈值实验台", chapter="ch5", implementation="frontend",
             description="用夜间街景检测候选演示置信度过滤与 NMS 抑制，实时统计保留数与类别分布。",
             params=[_slider("conf", "置信度阈值", 0.5, 0.05, 0.95, 0.05),
                     _slider("iou", "NMS IoU 阈值", 0.45, 0.1, 0.9, 0.05)]),

    # 第6章 识别
    CaseMeta(id="recognition_modes", name="识别模式流程", chapter="ch6", implementation="frontend",
             description="演示注册、1:1 验证、1:N 辨识三种模式的流程与判定关系。"),
    CaseMeta(id="biometric_compare", name="生物特征对比表", chapter="ch6", implementation="frontend",
             description="对比指纹、虹膜、人脸等特征的可采集性、唯一性、稳定性与安全性。"),
    CaseMeta(id="iris_norm", name="虹膜归一化示意", chapter="ch6", implementation="backend",
             description="展示环形虹膜展开为归一化矩形的过程。",
             params=[_slider("inner_radius", "瞳孔半径", 18, 8, 30), _slider("height", "展开高度", 240, 120, 360, 20)]),
    CaseMeta(id="face_embedding", name="人脸嵌入空间", chapter="ch6", implementation="backend",
             description="投影人脸特征，展示同类聚拢、异类推远与 Triplet/角度间隔作用。"),
    CaseMeta(id="face_align", name="关键点对齐示意", chapter="ch6", implementation="backend",
             description="展示五关键点位置与人脸对齐结果。"),
    CaseMeta(id="distance_match", name="匹配距离演示", chapter="ch6", implementation="frontend",
             description="调节阈值，观察同类/异类匹配的接受与拒绝分界与分布曲线。",
             params=[_slider("threshold", "距离阈值", 1.0, 0.2, 2.0, 0.05)]),

    # 第7章 目标跟踪
    CaseMeta(id="tracking_kalman", name="卡尔曼滤波跟踪", chapter="ch7", implementation="backend",
             description="含噪观测下用匀速模型跟踪二维目标，对比滤波前后的轨迹与误差。",
             params=[_slider("noise", "观测噪声 σ", 4, 0.5, 20, 0.5), _slider("steps", "轨迹帧数", 60, 20, 120, 10)]),

    # 第8章 多目视觉
    CaseMeta(id="stereo_depth", name="双目视差与深度", chapter="ch8", implementation="backend",
             description="由视差图按 Z = f·B/d 换算深度，观察基线、焦距对视差—深度关系的影响。",
             params=[_slider("baseline", "基线 B（米）", 0.12, 0.02, 0.6, 0.02),
                     _slider("focal", "焦距 f（像素）", 600, 200, 1500, 50),
                     _slider("disparity", "最大视差", 64, 16, 128, 8)]),

    # 第9章 视觉问答
    CaseMeta(id="vqa_pipeline", name="视觉问答流程", chapter="ch9", implementation="backend",
             description="把图像标签与问题文本映射到同一语义空间，按相似度匹配并生成答案。",
             params=[ParamSpec(name="question", label="问题", type="select", default="dog",
                               options=[ParamOption(label="图里有狗吗？", value="dog"),
                                        ParamOption(label="主要物体是什么？", value="main"),
                                        ParamOption(label="场景在室内还是室外？", value="scene")])]),
]


def _register_builtin_cases() -> None:
    for meta in _CASES:
        implementation = IMPLEMENTATIONS.get(meta.id)
        if implementation is None:
            case_registry.register(PlaceholderCase(meta))
            continue
        case_registry.register(implementation(meta.model_copy(update={"implemented": True})))


_register_builtin_cases()
