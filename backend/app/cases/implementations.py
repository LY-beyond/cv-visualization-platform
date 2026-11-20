"""已实现的交互案例汇总。

维护「案例标识 → 实现类」映射，builtin 注册时据此把占位案例替换为真实实现。
新增案例实现后只需在此登记一行。
"""

from typing import Dict, Type

from app.cases.base import BaseCase
from app.cases.ch2_basic import ChannelViewerCase, HogDemoCase, LbpDemoCase, SiftDemoCase
from app.cases.ch2_stitch import (
    FeatureMatchingCase,
    RansacFilterCase,
    StitchPreviewCase,
    TransformDemoCase,
)
from app.cases.ch3_classify import (
    ConfusionGalleryCase,
    FeatureEmbeddingCase,
    ModelCompareCase,
)
from app.cases.ch4_seg import (
    CannyStepsCase,
    KMeansSegCase,
    MaskOverlayCase,
    SlicDemoCase,
    ThresholdCompareCase,
)
from app.cases.ch5_detect import DetectOverlayCase
from app.cases.ch_labs import (
    LabCannyStepsCase,
    LabEdgeOperatorsCase,
    LabFilterCompareCase,
    LabMeanShiftCase,
    LabTransposeConvCase,
)
from app.cases.ch6_recog import FaceAlignCase, FaceEmbeddingCase, IrisNormCase
from app.cases.ch7_tracking import TrackingKalmanCase
from app.cases.ch8_stereo import StereoDepthCase
from app.cases.ch9_vqa import VqaPipelineCase

IMPLEMENTATIONS: Dict[str, Type[BaseCase]] = {
    "channel_viewer": ChannelViewerCase,
    "lbp_demo": LbpDemoCase,
    "sift_demo": SiftDemoCase,
    "hog_demo": HogDemoCase,
    "feature_matching": FeatureMatchingCase,
    "ransac_filter": RansacFilterCase,
    "transform_demo": TransformDemoCase,
    "stitch_preview": StitchPreviewCase,
    "model_compare": ModelCompareCase,
    "confusion_gallery": ConfusionGalleryCase,
    "feature_embedding": FeatureEmbeddingCase,
    "kmeans_seg": KMeansSegCase,
    "canny_steps": CannyStepsCase,
    "threshold_compare": ThresholdCompareCase,
    "slic_demo": SlicDemoCase,
    "mask_overlay": MaskOverlayCase,
    "detect_overlay": DetectOverlayCase,
    "iris_norm": IrisNormCase,
    "face_embedding": FaceEmbeddingCase,
    "face_align": FaceAlignCase,
    "tracking_kalman": TrackingKalmanCase,
    "stereo_depth": StereoDepthCase,
    "vqa_pipeline": VqaPipelineCase,
    "lab2-filter-compare": LabFilterCompareCase,
    "lab2-edge-operators": LabEdgeOperatorsCase,
    "lab4-meanshift": LabMeanShiftCase,
    "lab4-canny-steps": LabCannyStepsCase,
    "lab4-transpose-conv": LabTransposeConvCase,
}
