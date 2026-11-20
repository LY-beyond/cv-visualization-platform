"""上机实验素材迁移脚本（一次性）。

把 `实验项目/` 中的结果图、预测 JSON 复制并压缩到 `frontend/public/labs/`，
供实验中心离线浏览。图片统一缩放到宽 1400 以内并转 JPEG，预测 JSON 会被
清洗为只含标签、置信度、框坐标与掩膜统计的精简结构（去掉绝对路径与外链）。

用法：
    backend/.venv/Scripts/python.exe scripts/migrate_lab_assets.py
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "实验项目"
DST = ROOT / "frontend" / "public" / "labs"
MAX_WIDTH = 1400
JPEG_QUALITY = 86

# 目标相对路径 -> 源相对路径（相对 `实验项目/`）
IMAGE_MAP: Dict[str, str] = {
    # 实验一 图像基础操作
    "lab1/images/fig1-roi.jpg": "第一次上机实验/output/01_图像读写与显示/ROI截取粘贴/exp1_fig1_roi.png",
    "lab1/images/fig2-save-param.jpg": "第一次上机实验/output/01_图像读写与显示/保存格式与参数/lena_gray_c9.png",
    "lab1/images/fig3-pixel.jpg": "第一次上机实验/output/01_图像读写与显示/像素读取与修改/lena_pixel_edit.png",
    "lab1/images/fig4-resize.jpg": "第一次上机实验/output/01_图像读写与显示/图像缩放/exp1_fig4_resize.png",
    "lab1/images/fig5-display.jpg": "第一次上机实验/output/01_图像读写与显示/显示方式对比/exp1_fig3_plt_vs_cv.png",
    "lab1/images/fig6-video.jpg": "第一次上机实验/output/01_图像读写与显示/视频读写/exp1_fig5_video.png",
    "lab1/images/fig7-channels.jpg": "第一次上机实验/output/01_图像读写与显示/通道拆分合并/exp1_fig2_channels.png",
    "lab1/images/fig8-gray.jpg": "第一次上机实验/output/02_灰度变换与几何变换/灰度化/exp2_fig1_to_gray.png",
    "lab1/images/fig9-linear.jpg": "第一次上机实验/output/02_灰度变换与几何变换/线性灰度变换/exp2_fig2_linear.png",
    "lab1/images/fig10-linear-hist.jpg": "第一次上机实验/output/02_灰度变换与几何变换/线性灰度变换/exp2_fig3_linear_hist.png",
    "lab1/images/fig11-gamma.jpg": "第一次上机实验/output/02_灰度变换与几何变换/伽马变换/exp2_fig4_gamma.png",
    "lab1/images/fig12-gamma-curve.jpg": "第一次上机实验/output/02_灰度变换与几何变换/伽马变换/exp2_fig5_gamma_curve.png",
    "lab1/images/fig13-translate.jpg": "第一次上机实验/output/02_灰度变换与几何变换/几何变换/exp2_fig6_translate.png",
    "lab1/images/fig14-rotate.jpg": "第一次上机实验/output/02_灰度变换与几何变换/几何变换/exp2_fig7_rotate.png",
    "lab1/images/fig15-flip.jpg": "第一次上机实验/output/02_灰度变换与几何变换/几何变换/exp2_fig8_flip.png",
    "lab1/images/fig16-resize.jpg": "第一次上机实验/output/02_灰度变换与几何变换/几何变换/exp2_fig9_resize.png",
    "lab1/images/fig17-affine.jpg": "第一次上机实验/output/02_灰度变换与几何变换/仿射变换/exp2_fig10_affine.png",
    "lab1/images/fig18-fusion.jpg": "第一次上机实验/output/02_灰度变换与几何变换/图像融合/exp2_fig11_fusion.png",
    "lab1/images/fig19-fusion-result.jpg": "第一次上机实验/output/02_灰度变换与几何变换/图像融合/fusion_result.png",
    # 实验二 滤波、边缘与 SIFT
    "lab2/images/fig1-1.jpg": "第二次上机实验/图片/图1-1_2D卷积与不同核.png",
    "lab2/images/fig1-2.jpg": "第二次上机实验/图片/图1-2_均值滤波对比.png",
    "lab2/images/fig1-3.jpg": "第二次上机实验/图片/图1-3_高斯滤波对比.png",
    "lab2/images/fig1-4.jpg": "第二次上机实验/图片/图1-4_中值滤波去椒盐噪声.png",
    "lab2/images/fig1-5.jpg": "第二次上机实验/图片/图1-5_椒盐噪声定量对比.png",
    "lab2/images/fig1-6.jpg": "第二次上机实验/图片/图1-6_滤波器PSNR柱状图.png",
    "lab2/images/fig1-7.jpg": "第二次上机实验/图片/图1-7_Roberts与Prewitt算子.png",
    "lab2/images/fig1-8.jpg": "第二次上机实验/图片/图1-8_Sobel算子.png",
    "lab2/images/fig1-9.jpg": "第二次上机实验/图片/图1-9_Laplacian算子与锐化.png",
    "lab2/images/fig1-10.jpg": "第二次上机实验/图片/图1-10_四种边缘算子对比.png",
    "lab2/images/fig2-1.jpg": "第二次上机实验/图片/图2-1_高斯金字塔与DoG金字塔.png",
    "lab2/images/fig2-2.jpg": "第二次上机实验/图片/图2-2_自实现SIFT关键点.png",
    "lab2/images/fig2-3.jpg": "第二次上机实验/图片/图2-3_描述子旋转尺度不变性验证.png",
    "lab2/images/fig2-4.jpg": "第二次上机实验/图片/图2-4_待匹配图像与关键点.png",
    "lab2/images/fig2-5.jpg": "第二次上机实验/图片/图2-5_暴力匹配crossCheck前50.png",
    "lab2/images/fig2-6.jpg": "第二次上机实验/图片/图2-6_比值检验与RANSAC.png",
    "lab2/images/fig2-7.jpg": "第二次上机实验/图片/图2-7_单应性定量验证.png",
    "lab2/images/fig2-8.jpg": "第二次上机实验/图片/图2-8_拼接匹配与RANSAC.png",
    "lab2/images/fig2-9.jpg": "第二次上机实验/图片/图2-9_拼接与融合对比.png",
    "lab2/images/fig2-10.jpg": "第二次上机实验/图片/图2-10_接缝局部放大.png",
    "lab2/images/fig2-11.jpg": "第二次上机实验/图片/图2-11_融合权重图.png",
    "lab2/images/panorama.jpg": "第二次上机实验/图片/结果2-3_全景图.png",
    # 实验三 练习1 BoVW
    "lab3/images/bow-accuracy-single.jpg": "第三次上机实验/上机练习1/results/20261029-193227-feature-compare/accuracy-single.png",
    "lab3/images/bow-accuracy-fused.jpg": "第三次上机实验/上机练习1/results/20261029-193227-feature-compare/accuracy-fused.png",
    "lab3/images/bow-accuracy-k.jpg": "第三次上机实验/上机练习1/results/20261029-193227-feature-compare/accuracy-vs-clusters.png",
    "lab3/images/bow-recall-heatmap.jpg": "第三次上机实验/上机练习1/results/20261029-193227-feature-compare/recall-heatmap.png",
    "lab3/images/bow-keypoints.jpg": "第三次上机实验/上机练习1/results/20261029-193323-visualization/keypoints.png",
    "lab3/images/bow-visual-words.jpg": "第三次上机实验/上机练习1/results/20261029-193323-visualization/visual-words.png",
    "lab3/images/bow-example.jpg": "第三次上机实验/上机练习1/results/20261029-193323-visualization/bow-example.png",
    "lab3/images/bow-tsne.jpg": "第三次上机实验/上机练习1/results/20261029-193323-visualization/tsne.png",
    # 实验三 练习2 LeNet
    "lab3/images/lenet-curves.jpg": "第三次上机实验/上机练习2/lenet/results/20261029-184818-439473-LeNet/learning-curves.png",
    "lab3/images/lenet-confusion.jpg": "第三次上机实验/上机练习2/lenet/results/20261029-184818-439473-LeNet/confusion.png",
    "lab3/images/lenet-predictions.jpg": "第三次上机实验/上机练习2/lenet/results/20261029-184818-439473-LeNet/predictions.png",
    "lab3/images/lenet-mnist-3.jpg": "第三次上机实验/上机练习2/lenet/web-results/20261029-185323-web/images/mnist-3-raw.png",
    "lab3/images/lenet-handwritten-3.jpg": "第三次上机实验/上机练习2/lenet/web-results/20261029-185323-web/images/handwritten-3-auto.png",
    # 实验三 练习3 CIFAR100
    "lab3/images/cifar-curves-student.jpg": "第三次上机实验/上机练习3/cifar100/results/20261029-204409-resnet18-fast3ep/learning-curves.png",
    "lab3/images/cifar-curves-teacher.jpg": "第三次上机实验/上机练习3/cifar100/results/20261030-160417-resnet18-full200/report-02-curves.png",
    "lab3/images/cifar-confusion.jpg": "第三次上机实验/上机练习3/cifar100/results/20261030-160417-resnet18-full200/confusion.png",
    "lab3/images/cifar-errors.jpg": "第三次上机实验/上机练习3/cifar100/analysis/20261030-173955-errors/error-analysis.png",
    "lab3/images/cifar-apple.jpg": "第三次上机实验/上机练习3/cifar100/images/cifar-apple.png",
    "lab3/images/cifar-bus.jpg": "第三次上机实验/上机练习3/cifar100/images/cifar-bus.png",
    "lab3/images/cifar-web-rose.jpg": "第三次上机实验/上机练习3/cifar100/images/web-rose.png",
    # 实验四 分割
    "lab4/images/fig1-2-radius4.jpg": "第四次上机实验/results/ex1/fig1_2_radius4.png",
    "lab4/images/fig1-3-radius-compare.jpg": "第四次上机实验/results/ex1/fig1_3_radius_compare.png",
    "lab4/images/fig1-4-radius-sweep.jpg": "第四次上机实验/results/ex1/fig1_4_radius_sweep.png",
    "lab4/images/fig2-2-meanshift3d.jpg": "第四次上机实验/results/ex2/fig2_2_meanshift3d.png",
    "lab4/images/fig2-4-bandwidth.jpg": "第四次上机实验/results/ex2/fig2_4_bandwidth.png",
    "lab4/images/fig2-5-bw-curve.jpg": "第四次上机实验/results/ex2/fig2_5_bw_curve.png",
    "lab4/images/fig2-6-segmentation.jpg": "第四次上机实验/results/ex2/fig2_6_segmentation.png",
    "lab4/images/fig3-1-K.jpg": "第四次上机实验/results/ex3/fig3_1_K_compare.png",
    "lab4/images/fig3-2-M.jpg": "第四次上机实验/results/ex3/fig3_2_M_compare.png",
    "lab4/images/fig3-4-iterations.jpg": "第四次上机实验/results/ex3/fig3_4_iterations.png",
    "lab4/images/fig3-5-convergence.jpg": "第四次上机实验/results/ex3/fig3_5_convergence.png",
    "lab4/images/fig3-6-mecca.jpg": "第四次上机实验/results/ex3/fig3_6_mecca.png",
    "lab4/images/fig4-2-step123.jpg": "第四次上机实验/results/ex4/fig4_2_step123.png",
    "lab4/images/fig4-3-step45.jpg": "第四次上机实验/results/ex4/fig4_3_step45.png",
    "lab4/images/fig4-4-threshold.jpg": "第四次上机实验/results/ex4/fig4_4_threshold.png",
    "lab4/images/fig4-5-direction.jpg": "第四次上机实验/results/ex4/fig4_5_direction_color.png",
    "lab4/images/fig4-6-sigma.jpg": "第四次上机实验/results/ex4/fig4_6_sigma.png",
    "lab4/images/fig4-7-thresholds.jpg": "第四次上机实验/results/ex4/fig4_7_thresholds.png",
    "lab4/images/fig4-9-ref-vs-fixed.jpg": "第四次上机实验/results/ex4/fig4_9_ref_vs_fixed.png",
    "lab4/images/fig5-1-grid.jpg": "第四次上机实验/results/ex5/fig5_1_grid.png",
    "lab4/images/fig6-2-curves.jpg": "第四次上机实验/results/ex6/fig6_2_curves.png",
    "lab4/images/fig6-4-predictions.jpg": "第四次上机实验/results/ex6/fig6_4_predictions.png",
    "lab4/images/fig6-5-errors.jpg": "第四次上机实验/results/ex6/fig6_5_errors.png",
    "lab4/images/fig7-4-bars.jpg": "第四次上机实验/results/ex6/fig7_4_bars.png",
    "lab4/images/fcn-curves-gpu.jpg": "第四次上机实验/gpu_results/results_gpu/curves.png",
    "lab4/images/fcn-rider-compare.jpg": "第四次上机实验/gpu_results/results_gpu/rider_compare.png",
    # 实验五 目标检测
    "lab5/images/frcnn-dog.jpg": "第五次上机实验/实验留档/01_运行结果/A_FasterRCNN/dog-cycle-car.png",
    "lab5/images/frcnn-cup.jpg": "第五次上机实验/实验留档/01_运行结果/A_FasterRCNN/cup1.jpg",
    "lab5/images/maskrcnn-1.jpg": "第五次上机实验/实验留档/01_运行结果/B_MaskRCNN/mask_rcnn_12283150_12d37e6389_z_prediction.jpg",
    "lab5/images/maskrcnn-2.jpg": "第五次上机实验/实验留档/01_运行结果/B_MaskRCNN/mask_rcnn_2383514521_1fc8d7b0de_z_prediction.jpg",
    "lab5/images/maskrcnn-3.jpg": "第五次上机实验/实验留档/01_运行结果/B_MaskRCNN/mask_rcnn_3862500489_6fd195d183_z_prediction.jpg",
    "lab5/images/yolov3-dog.jpg": "第五次上机实验/实验留档/01_运行结果/C_YOLOv3/dog-cycle-car.jpg",
    "lab5/images/yolov3-cup.jpg": "第五次上机实验/实验留档/01_运行结果/C_YOLOv3/cup1.jpg",
    "lab5/images/yolov3-eagle.jpg": "第五次上机实验/实验留档/01_运行结果/C_YOLOv3/eagle.jpg",
    "lab5/images/yolov3-traffic.jpg": "第五次上机实验/实验留档/01_运行结果/C_YOLOv3/traffic.jpg",
    "lab5/images/yolov1-grid.jpg": "第五次上机实验/实验报告素材/fig_yolov1_grid.png",
    "lab5/images/yolov1-loss.jpg": "第五次上机实验/实验报告素材/fig_yolov1_loss.png",
    "lab5/images/yolov1-label.jpg": "第五次上机实验/实验留档/01_运行结果/D_YOLOv1/demo_labelled.png",
    "lab5/images/fig-frcnn-threshold.jpg": "第五次上机实验/实验报告素材/fig_frcnn_threshold.png",
    "lab5/images/fig-mask-stats.jpg": "第五次上机实验/实验报告素材/fig_mask_stats.png",
    "lab5/images/fig-speed.jpg": "第五次上机实验/实验报告素材/fig_speed.png",
    "lab5/images/fig-yolov3-stats.jpg": "第五次上机实验/实验报告素材/fig_yolov3_stats.png",
    "lab5/images/mask-flow.jpg": "第五次上机实验/实验报告素材/mask_flow.png",
}

# 实验四 SLIC 迭代帧：K=500 / M=40 完整 10 帧 + M=5 首末帧
for _i in range(10):
    IMAGE_MAP[f"lab4/images/slic-loop{_i}.jpg"] = (
        f"第四次上机实验/results/ex3/lenna_M40_K500_loop{_i}.png"
    )
for _i in (0, 9):
    IMAGE_MAP[f"lab4/images/slic-m5-loop{_i}.jpg"] = (
        f"第四次上机实验/results/ex3/lenna_M5_K500_loop{_i}.png"
    )

COCO80 = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
    "toothbrush",
]


def _convert_image(src: Path, dest: Path) -> tuple[int, int]:
    image = Image.open(src)
    if image.mode in {"RGBA", "LA", "P"}:
        background = Image.new("RGB", image.size, (255, 255, 255))
        rgba = image.convert("RGBA")
        background.paste(rgba, mask=rgba.split()[-1])
        image = background
    else:
        image = image.convert("RGB")
    if image.width > MAX_WIDTH:
        height = round(image.height * MAX_WIDTH / image.width)
        image = image.resize((MAX_WIDTH, height), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return dest.stat().st_size, image.width


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _yolo_predictions() -> None:
    for name in ("cup1", "dog-cycle-car", "eagle", "traffic"):
        raw = json.loads(
            (SRC / f"第五次上机实验/实验留档/01_运行结果/C_YOLOv3/{name}.json").read_text(
                encoding="utf-8"
            )
        )
        detections = [
            {
                "label": COCO80[item["class_id"]] if item["class_id"] < len(COCO80) else "unknown",
                "confidence": round(float(item["confidence"]), 6),
                "box": [round(float(value), 1) for value in item["box_xyxy"]],
            }
            for item in raw.get("detections", [])
        ]
        _write_json(
            DST / f"lab5/predictions/yolo-{name}.json",
            {
                "model": "YOLO v3（Darknet-53，COCO 官方权重）",
                "image": f"{name}.jpg",
                "count": len(detections),
                "detections": detections,
            },
        )


def _mask_predictions() -> None:
    for path in (SRC / "第五次上机实验/实验留档/01_运行结果/B_MaskRCNN").glob("*.json"):
        if "prediction" not in path.name:
            continue
        raw = json.loads(path.read_text(encoding="utf-8"))
        detections = [
            {
                "label": item.get("class_name", "unknown"),
                "confidence": round(float(item.get("score", 0)), 6),
                "box": [
                    item["box_yxyx"][1],
                    item["box_yxyx"][0],
                    item["box_yxyx"][3],
                    item["box_yxyx"][2],
                ],
                "mask_pixels": int(item.get("mask_pixels", 0)),
            }
            for item in raw.get("detections", [])
        ]
        _write_json(
            DST / f"lab5/predictions/mask-{path.stem.replace('_prediction', '')}.json",
            {
                "model": "Mask R-CNN（ResNet-101-FPN，COCO 官方权重）",
                "image": path.stem.replace("_prediction", ".jpg"),
                "count": len(detections),
                "detections": detections,
            },
        )


def _faster_predictions() -> None:
    raw = json.loads(
        (SRC / "第五次上机实验/实验留档/01_运行结果/A_FasterRCNN/course_predictions.json").read_text(
            encoding="utf-8"
        )
    )
    images: List[Dict[str, Any]] = []
    for result in raw.get("results", []):
        images.append(
            {
                "image": result["image"],
                "raw_count": int(result.get("raw_prediction_count", 0)),
                "threshold": float(result.get("threshold", 0)),
                "count": int(result.get("drawn_count", 0)),
                "detections": [
                    {
                        "label": item.get("category", "unknown"),
                        "confidence": round(float(item.get("score", 0)), 6),
                        "box": [round(float(value), 1) for value in item["box_xyxy"]],
                    }
                    for item in result.get("detections", [])
                ],
            }
        )
    _write_json(
        DST / "lab5/predictions/faster-rcnn.json",
        {
            "model": "Faster R-CNN（ResNet-50-FPN，COCO 官方权重）",
            "threshold": 0.7,
            "images": images,
        },
    )


def main() -> None:
    missing: List[str] = []
    total_bytes = 0
    for dest_name, src_name in IMAGE_MAP.items():
        src = SRC / src_name
        if not src.exists():
            missing.append(src_name)
            continue
        size, _ = _convert_image(src, DST / dest_name)
        total_bytes += size
    _faster_predictions()
    _mask_predictions()
    _yolo_predictions()
    print(f"迁移完成：{len(IMAGE_MAP) - len(missing)} 张图片，约 {total_bytes / 1024 / 1024:.1f} MB")
    if missing:
        print("缺失素材：")
        for item in missing:
            print(" -", item)


if __name__ == "__main__":
    main()
