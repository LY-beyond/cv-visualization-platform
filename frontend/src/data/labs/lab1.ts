import { labAsset, type LabMeta } from "./types";

export const lab1: LabMeta = {
  id: "lab1",
  title: "上机实验一 · 图像基础操作",
  date: "2026-09",
  cover: labAsset("lab1/images/fig7-channels.jpg"),
  tags: ["imread / imwrite", "ROI", "通道拆合", "插值", "灰度变换", "几何变换", "图像融合"],
  summary:
    "从像素、通道、ROI 这些最底层的数据结构出发，验证 OpenCV 的读写参数、四种插值、灰度化与 LUT、伽马变换、几何/仿射变换以及 addWeighted 融合。实验结论是：参数不是「记住就行」，每一种参数选择都能在结果图上看到具体代价。",
  goals: [
    "掌握 imread / imwrite 的读写参数与像素级访问方式",
    "理解 BGR 与 RGB 的差异、通道拆分合并与 ROI 切片",
    "对比四种插值算法在缩放中的画质与速度差异",
    "用 LUT 实现线性灰度变换，用幂函数实现伽马变换",
    "完成平移、旋转、翻转、缩放、仿射与 addWeighted 融合",
  ],
  sections: [
    {
      id: "tasks",
      title: "实验任务",
      paragraphs: [
        "本次实验分两个练习：练习 1 覆盖图像读写、像素访问、ROI、通道、显示方式、缩放与视频；练习 2 覆盖灰度化、线性变换、伽马变换、几何变换、仿射变换与图像融合。所有脚本在 output/ 下按知识点分目录保存结果图。",
      ],
      bullets: [
        "练习 1：imread/imwrite 参数、像素读写、ROI 截取粘贴、通道拆分合并、Matplotlib 显示、四种插值、视频逐帧读取",
        "练习 2：三种灰度化方式、LUT 线性变换、γ 曲线、平移/旋转/翻转/缩放、三点仿射、addWeighted 融合",
      ],
    },
    {
      id: "read",
      title: "读写、像素与显示",
      paragraphs: [
        "OpenCV 把图像存成 NumPy 数组：彩色图是 [行, 列, 通道] 的三维数组，通道顺序为 BGR。像素修改、ROI 截取都只是数组索引与切片，因此速度取决于是否避免 Python 逐像素循环。",
        "imwrite 的格式与参数直接决定体积与画质：JPEG 用质量系数换压缩比，PNG 的压缩级别只影响体积、不影响像素。Matplotlib 按 RGB 渲染，把 BGR 图像直接传进去会出现红蓝互换，必须先用 cvtColor 转换。",
      ],
      bullets: [
        "ROI 语法 roi = img[y1:y2, x1:x2]，粘贴即对切片赋值",
        "通道拆分 cv.split() 后每个通道是二维灰度矩阵，cv.merge() 还原",
        "视频用 VideoCapture + cap.read() 逐帧读取，按帧号筛选保存后 release()",
      ],
    },
    {
      id: "gray",
      title: "灰度化与灰度变换",
      paragraphs: [
        "加权平均法 Gray = 0.3B + 0.59G + 0.11R 符合人眼对三色的敏感度差异；cv.cvtColor 是同一公式的优化实现，结果一致但快得多。",
        "线性变换预先构造 0~255 的映射表，再用 cv.LUT 批量查表，比逐像素计算快一个量级；伽马变换 s = 255·(r/255)^γ 是非线性的，γ<1 提亮暗部，γ>1 压暗高光。",
      ],
    },
    {
      id: "geometry",
      title: "几何变换与仿射",
      paragraphs: [
        "平移、旋转、缩放都归结为 2×3 仿射矩阵；getRotationMatrix2D 指定中心、角度与缩放比例，warpAffine 完成全图坐标映射。旋转后超出画布的部分会被裁剪，空缺区域默认填黑。",
        "三点式仿射用 getAffineTransform 由三组对应点求矩阵，能同时组合平移、旋转、缩放与错切，并保持平行线仍然平行。",
      ],
    },
    {
      id: "fusion",
      title: "图像融合",
      paragraphs: [
        "addWeighted 按 dst = α·img1 + (1−α)·img2 + γ 逐像素加权。α 从 0.0 增到 0.8 时，图像 1 的占比逐渐升高，过渡平滑。两幅图分辨率不同时必须先 resize 统一尺寸，否则维度不匹配。",
      ],
    },
  ],
  charts: [
    {
      sectionId: "read",
      title: "四种插值算法对比",
      source: "实验一报告 · 上机练习 1 图像缩放",
      kind: "table",
      data: {
        columns: ["算法", "邻域", "速度", "画质", "适用场景"],
        rows: [
          ["INTER_NEAREST", "1 像素", "最快", "锯齿明显", "实时性优先、像素风"],
          ["INTER_LINEAR", "2×2", "较快", "均衡（默认）", "大多数缩放"],
          ["INTER_CUBIC", "4×4", "较慢", "更平滑、细节好", "放大、需要画质"],
          ["INTER_LANCZOS4", "8×8", "最慢", "最优", "高质量缩放"],
        ],
      },
    },
    {
      sectionId: "read",
      title: "保存格式与参数",
      source: "实验一报告 · 保存格式与参数",
      kind: "table",
      data: {
        columns: ["文件", "格式", "参数", "特点"],
        rows: [
          ["基准图", "PNG", "压缩级别 3", "无损，体积适中"],
          ["JPEG 低质量", "JPEG", "质量系数 5", "有损，体积大幅减小，细节丢失"],
          ["PNG 高压缩", "PNG", "压缩级别 9", "无损，体积更小，画质无差异"],
        ],
      },
    },
    {
      sectionId: "gray",
      title: "线性灰度变换",
      source: "实验一报告 · 2.2 线性灰度变换",
      kind: "table",
      data: {
        columns: ["变换", "映射", "效果"],
        rows: [
          ["灰度反转", "s = 255 − r", "亮暗反转，暗部细节转亮部"],
          ["灰度拉伸", "k = 1.2", "扩展动态范围，对比度提升"],
          ["灰度压缩", "k = 0.8", "压缩动态范围，对比度降低"],
        ],
      },
    },
    {
      sectionId: "gray",
      title: "伽马变换的取值规律",
      source: "实验一报告 · 2.3 伽马变换",
      kind: "table",
      data: {
        columns: ["γ", "效果", "典型用途"],
        rows: [
          ["0.2 / 0.4 / 0.67", "提亮暗部，压缩高灰度", "偏暗图像增强"],
          ["1.0", "恒等变换", "对照"],
          ["1.5 / 2.2", "压暗图像，扩展高灰度", "过亮图像校正、显示器校准"],
        ],
      },
    },
    {
      sectionId: "geometry",
      title: "几何变换操作一览",
      source: "实验一报告 · 2.4 几何变换",
      kind: "table",
      data: {
        columns: ["操作", "函数", "参数", "观察"],
        rows: [
          ["垂直镜像", "cv.flip", "flipCode = 0", "沿水平轴上下翻转"],
          ["水平镜像", "cv.flip", "flipCode = 1", "沿垂直轴左右翻转"],
          ["逆时针旋转", "getRotationMatrix2D + warpAffine", "45° / 90°", "超出画布被裁剪，空缺填黑"],
          ["顺时针旋转", "getRotationMatrix2D + warpAffine", "−20°", "负角度表示顺时针"],
          ["缩放", "cv.resize", "200×300 / 800×600", "缩小锯齿、放大看插值差异"],
        ],
      },
    },
  ],
  gallery: [
    { sectionId: "read", src: labAsset("lab1/images/fig1-roi.jpg"), caption: "ROI 截取（行 100~300、列 200~400）并粘贴到左上角" },
    { sectionId: "read", src: labAsset("lab1/images/fig2-save-param.jpg"), caption: "PNG 基准 / JPEG 低质量 / PNG 高压缩对比" },
    { sectionId: "read", src: labAsset("lab1/images/fig3-pixel.jpg"), caption: "像素修改：(100,100) 赋纯红，(200,200) 单独改红色通道" },
    { sectionId: "read", src: labAsset("lab1/images/fig4-resize.jpg"), caption: "四种插值算法缩放对比" },
    { sectionId: "read", src: labAsset("lab1/images/fig5-display.jpg"), caption: "BGR 直接送入 Matplotlib（左）与转 RGB 后（右）" },
    { sectionId: "read", src: labAsset("lab1/images/fig6-video.jpg"), caption: "视频第 0 / 5 / 10 / 15 帧" },
    { sectionId: "read", src: labAsset("lab1/images/fig7-channels.jpg"), caption: "B/G/R 单通道灰度图与仅保留单通道的彩色图" },
    { sectionId: "gray", src: labAsset("lab1/images/fig8-gray.jpg"), caption: "原图、循环加权灰度、cvtColor 灰度" },
    { sectionId: "gray", src: labAsset("lab1/images/fig9-linear.jpg"), caption: "灰度反转、k=1.2 拉伸、k=0.8 压缩" },
    { sectionId: "gray", src: labAsset("lab1/images/fig10-linear-hist.jpg"), caption: "线性变换前后的灰度直方图" },
    { sectionId: "gray", src: labAsset("lab1/images/fig11-gamma.jpg"), caption: "γ = 0.2 / 0.4 / 0.67 / 1.0 / 1.5 / 2.2 的伽马变换" },
    { sectionId: "gray", src: labAsset("lab1/images/fig12-gamma-curve.jpg"), caption: "不同 γ 的输入输出曲线" },
    { sectionId: "geometry", src: labAsset("lab1/images/fig13-translate.jpg"), caption: "平移变换" },
    { sectionId: "geometry", src: labAsset("lab1/images/fig14-rotate.jpg"), caption: "逆时针 45°、顺时针 20°、逆时针 90° 旋转" },
    { sectionId: "geometry", src: labAsset("lab1/images/fig15-flip.jpg"), caption: "垂直镜像与水平镜像" },
    { sectionId: "geometry", src: labAsset("lab1/images/fig16-resize.jpg"), caption: "最邻近缩小 200×300 与双线性放大 800×600" },
    { sectionId: "geometry", src: labAsset("lab1/images/fig17-affine.jpg"), caption: "三点式仿射变换（左：控制点；右：变换结果）" },
    { sectionId: "fusion", src: labAsset("lab1/images/fig18-fusion.jpg"), caption: "α 从 0.0 到 0.8 的 addWeighted 融合" },
    { sectionId: "fusion", src: labAsset("lab1/images/fig19-fusion-result.jpg"), caption: "融合结果细节" },
  ],
  thoughtQuestions: [
    {
      q: "如何从视频中逐帧读取并保存关键帧？",
      a: "cv.VideoCapture 打开视频文件或摄像头，循环调用 cap.read() 得到帧矩阵，按帧号筛选后 imwrite 保存，最后 cap.release() 释放资源。核心流程是：读取视频流 → 循环取帧 → 按帧号筛选 → 保存 → 释放。",
    },
    {
      q: "为什么 OpenCV 读取的图像在 Matplotlib 中颜色不对？",
      a: "OpenCV 以 BGR 顺序存储通道，Matplotlib 按 RGB 渲染。直接显示会把红色通道当蓝色、蓝色通道当红色，整体偏蓝。用 cv.cvtColor(img, cv.COLOR_BGR2RGB) 转换后再显示即可还原。",
    },
    {
      q: "四种插值算法如何选择？",
      a: "最邻近最快但锯齿明显；双线性是默认折中；双立方在 4×4 邻域上计算，放大时更平滑；Lanczos4 用 8×8 邻域，画质最好但最慢。缩小图像时高阶插值边缘更平滑，放大时差异更明显，需要按实时性与画质权衡。",
    },
    {
      q: "为什么要用 LUT 而不是逐像素计算？",
      a: "灰度变换对每个像素执行的是同一个一维映射，0~255 只有 256 种输入。预先算好映射表后，cv.LUT 用查表批量替换，把 Python 层的逐像素循环下沉到 C++ 实现，结果一致而速度快一个量级。",
    },
    {
      q: "addWeighted 中 α 与 γ 分别控制什么？",
      a: "α 控制第一幅图的权重，第二幅图权重为 1−α，二者此消彼长，实现透明度过渡；γ 是对所有像素叠加的常数偏移，用于整体提亮或压暗。两幅图尺寸必须一致，否则需要先 resize。",
    },
  ],
};
