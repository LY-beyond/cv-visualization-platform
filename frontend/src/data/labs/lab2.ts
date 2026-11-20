import { labAsset, type LabMeta } from "./types";

export const lab2: LabMeta = {
  id: "lab2",
  title: "上机实验二 · 滤波、边缘与 SIFT",
  date: "2026-10",
  cover: labAsset("lab2/images/fig1-6.jpg"),
  tags: ["filter2D", "均值/高斯/中值", "PSNR", "Roberts/Prewitt/Sobel/Laplacian", "SIFT", "RANSAC", "图像拼接"],
  summary:
    "用同一张图、同一强度噪声（10% 椒盐）横向比较三种线性/非线性滤波，再做四种边缘算子的定量统计；后半程从零实现 SIFT，用比值检验与 RANSAC 完成匹配和全景拼接。数据说明：椒盐噪声下中值 3×3 的 PSNR 比线性滤波高约 7~8 dB。",
  goals: [
    "掌握 filter2D 与均值、高斯、中值滤波的实现与适用场景",
    "用 PSNR 定量比较滤波器，而不是只凭肉眼判断",
    "比较 Roberts / Prewitt / Sobel / Laplacian 的边缘响应",
    "理解 SIFT 尺度空间、DoG、方向分配与 128 维描述子",
    "用 Lowe 比值检验与 RANSAC 完成特征匹配与全景拼接",
  ],
  sections: [
    {
      id: "tasks",
      title: "实验任务",
      paragraphs: [
        "练习 1 先讲 2D 卷积与不同核，再分别做均值、高斯、中值滤波，并把 10% 椒盐噪声叠加到清晰 lena 上，用 PSNR 定量比较；随后按课件流程「高斯去噪 → 阈值 127 二值化 → 四种算子」比较边缘提取。练习 2 从零实现 SIFT，完成匹配、单应性估计与两图拼接。",
      ],
    },
    {
      id: "filter",
      title: "滤波与 PSNR",
      paragraphs: [
        "均值滤波是 3×3 或 5×5 的等权平均，去噪同时把边缘一起模糊；高斯滤波按距离加权，中心权重大，平滑更自然；中值是排序后取中间值，属于非线性滤波，对椒盐噪声特别有效，因为极端值会被直接排序排除。",
        "PSNR 用均方误差换算成 dB：PSNR = 10·log10(255² / MSE)。本次对 10% 椒盐噪声（5% 黑 + 5% 白）的实测结果见柱状图，中值 3×3 达到 32.00 dB，明显高于其他五组。",
      ],
      bullets: [
        "均值 3×3 / 5×5：23.31 / 24.79 dB，核越大越模糊",
        "高斯 3×3 / 5×5：24.40 / 32.00 dB，5×5 靠强平滑把噪点平均掉，但细节损失大",
        "中值 3×3 / 5×5：29.88 / 28.32 dB，3×3 最好；核继续增大反而伤细节",
      ],
      caseIds: ["lab2-filter-compare"],
    },
    {
      id: "edge",
      title: "四种边缘算子",
      paragraphs: [
        "Roberts 用 2×2 交叉差分，边缘最细但对噪声最敏感、定位碎片多；Prewitt 用 3×3 均值再做差分，边缘连续但对距离不加权；Sobel 在 Prewitt 基础上给中心行/列权重 2，抗噪与定位折中最好；Laplacian 是二阶导，对噪声最敏感并产生双像素边缘，更适合锐化。",
        "定量统计口径为二值化后非零梯度像素占比与平均梯度。注意微分结果可能为负，需用 CV_16S 保存再 convertScaleAbs 转回 8 位显示。",
      ],
      caseIds: ["lab2-edge-operators"],
    },
    {
      id: "sift",
      title: "自实现 SIFT",
      paragraphs: [
        "尺度空间用不同 σ 的高斯核构建，相邻层相减得到 DoG；DoG 极值在空间与尺度三个维度上比较，再做亚像素拟合与主曲率剔除。方向直方图解决旋转，4×4×8 的梯度直方图加归一化得到 128 维描述子。",
        "在 510×512 的 lena 上，自实现版本得到 1089 个关键点，与 OpenCV 的 1011 个处于同一量级，说明实现正确；耗时 4~6 秒与 0.04~0.06 秒的差距来自纯 Python 循环与 C++ SIMD 优化的差别。",
      ],
      bullets: [
        "各八度关键点数：octave0 = 762、octave1 = 205、octave2 = 81、octave3 = 41",
        "旋转 15°、放大 1.2 倍后：178 对匹配，RANSAC 后 144 个内点，四角点最大误差 2.1 像素",
      ],
    },
    {
      id: "match",
      title: "比值检验与 RANSAC",
      paragraphs: [
        "Lowe 比值检验比较最近邻与次近邻的距离：如果最近邻不够明显优于次近邻，说明这个匹配不可靠。ratio 越小越严格，匹配数下降但内点率上升。RANSAC 每次随机抽 4 对匹配估计单应性，统计重投影误差内的内点，迭代取内点最多的模型。",
        "Eiffel 塔的匹配是「困难样本」：视角差异极大、塔身金属网格高度重复，ratio=0.85 时 50 对匹配只剩 8 个内点，且几乎沿塔身共线，单应性模型本身不适用。这不是实现错误，OpenCV 原生 SIFT 也只有 5~13 个内点。",
      ],
    },
    {
      id: "stitch",
      title: "单应性验证与全景拼接",
      paragraphs: [
        "合成验证：把 lena 做已知的旋转缩放，再估计单应性，567 对匹配中有 542 个内点（95.6%），H_est 与 H_true 几乎一致，四角点误差 0.23 像素，证明「描述子 + 比值检验 + RANSAC」链路可靠。",
        "真实拼接以右图为 query 与左图匹配，ratio=0.75 得到 85 对候选，RANSAC 保留 48 个内点（56.5%）；把右图映射到左图坐标系后，重叠区用羽化权重融合，接缝处的亮度台阶完全消失。自实现 SIFT 在同一对图上得到 158 对匹配、112 个内点。",
      ],
    },
  ],
  charts: [
    {
      sectionId: "filter",
      title: "六种滤波在 10% 椒盐噪声下的 PSNR",
      source: "实验二报告 · 表 3.2.3（数值为实测值）",
      kind: "bar",
      data: {
        unit: "dB",
        categories: ["均值3×3", "均值5×5", "高斯3×3", "高斯5×5", "中值3×3", "中值5×5"],
        series: [{ name: "PSNR", values: [23.31, 24.79, 24.4, 32.0, 29.88, 28.32] }],
      },
    },
    {
      sectionId: "edge",
      title: "四种算子的边缘像素占比与平均梯度",
      source: "实验二报告 · 3.3.6 定量统计",
      kind: "table",
      data: {
        columns: ["算子", "边缘像素占比", "平均梯度", "特点"],
        rows: [
          ["Roberts", "95.52%", 7.57, "边缘最细最弱，45° 方向好，定位差、碎片多"],
          ["Prewitt", "99.13%", 22.71, "边缘连续，抗噪一般，未考虑距离权重"],
          ["Sobel", "99.65%", 30.43, "加权平均，抗噪与定位折中最好，最常用"],
          ["Laplacian", "96.98%", 35.98, "二阶导、对噪声最敏感、双像素边界，多用于锐化"],
        ],
      },
    },
    {
      sectionId: "edge",
      title: "平均梯度对比",
      source: "实验二报告 · 3.3.6 定量统计",
      kind: "bar",
      data: {
        categories: ["Roberts", "Prewitt", "Sobel", "Laplacian"],
        series: [{ name: "平均梯度", values: [7.57, 22.71, 30.43, 35.98] }],
      },
    },
    {
      sectionId: "sift",
      title: "自实现 SIFT 与 OpenCV 对比",
      source: "实验二报告 · 4.1.2 运行效果",
      kind: "table",
      data: {
        columns: ["指标", "自实现 pysift", "OpenCV SIFT"],
        rows: [
          ["关键点数量", 1089, 1011],
          ["描述子形状", "(1089, 128) float32", "(1011, 128) float32"],
          ["耗时", "约 4~6 s", "0.04~0.06 s（约 100 倍差距）"],
        ],
      },
    },
    {
      sectionId: "match",
      title: "比值检验阈值对匹配质量的影响",
      source: "实验二报告 · 4.2.3 实测结果",
      kind: "table",
      data: {
        columns: ["ratio", "匹配数", "RANSAC 内点", "内点率"],
        rows: [
          [0.75, 6, 4, "66.7%"],
          [0.8, 18, 5, "27.8%"],
          [0.85, 50, 8, "16.0%"],
          [0.9, 156, 13, "8.3%"],
        ],
      },
    },
    {
      sectionId: "stitch",
      title: "单应性估计的两组实测",
      source: "实验二报告 · 4.2.5 / 4.3 拼接",
      kind: "table",
      data: {
        columns: ["实验", "匹配数", "内点数", "内点率", "几何误差"],
        rows: [
          ["lena 合成（旋转 15°、放大 1.2×）", 567, 542, "95.6%", "四角点 0.23 px"],
          ["真实两图拼接", 85, 48, "56.5%", "接缝羽化后消失"],
          ["Eiffel 困难样本", 50, 8, "16.0%", "单应性模型不适用"],
        ],
      },
    },
  ],
  gallery: [
    { sectionId: "filter", src: labAsset("lab2/images/fig1-1.jpg"), caption: "2D 卷积与不同核的响应" },
    { sectionId: "filter", src: labAsset("lab2/images/fig1-2.jpg"), caption: "均值滤波 3×3 / 5×5 对比" },
    { sectionId: "filter", src: labAsset("lab2/images/fig1-3.jpg"), caption: "高斯滤波 3×3 / 5×5 对比" },
    { sectionId: "filter", src: labAsset("lab2/images/fig1-4.jpg"), caption: "中值滤波去除椒盐噪声" },
    { sectionId: "filter", src: labAsset("lab2/images/fig1-5.jpg"), caption: "椒盐噪声下的定量视觉对比" },
    { sectionId: "filter", src: labAsset("lab2/images/fig1-6.jpg"), caption: "六种滤波器的 PSNR 柱状图" },
    { sectionId: "edge", src: labAsset("lab2/images/fig1-7.jpg"), caption: "Roberts 与 Prewitt 算子" },
    { sectionId: "edge", src: labAsset("lab2/images/fig1-8.jpg"), caption: "Sobel 算子（Gx / Gy / 幅值）" },
    { sectionId: "edge", src: labAsset("lab2/images/fig1-9.jpg"), caption: "Laplacian 与三种强度锐化" },
    { sectionId: "edge", src: labAsset("lab2/images/fig1-10.jpg"), caption: "四种算子在「高斯 + 阈值化」流程下的对比" },
    { sectionId: "sift", src: labAsset("lab2/images/fig2-1.jpg"), caption: "高斯金字塔与 DoG 金字塔" },
    { sectionId: "sift", src: labAsset("lab2/images/fig2-2.jpg"), caption: "自实现 SIFT 关键点（圆半径 = 尺度，半径线 = 主方向）" },
    { sectionId: "sift", src: labAsset("lab2/images/fig2-3.jpg"), caption: "旋转 15°、放大 1.2× 后的描述子匹配" },
    { sectionId: "match", src: labAsset("lab2/images/fig2-4.jpg"), caption: "待匹配两图的关键点" },
    { sectionId: "match", src: labAsset("lab2/images/fig2-5.jpg"), caption: "暴力匹配 + crossCheck 的前 50 对" },
    { sectionId: "match", src: labAsset("lab2/images/fig2-6.jpg"), caption: "比值检验后的 50 对与 RANSAC 保留的 8 个内点" },
    { sectionId: "match", src: labAsset("lab2/images/fig2-7.jpg"), caption: "单应性定量验证：估计与真实变换的角点误差" },
    { sectionId: "stitch", src: labAsset("lab2/images/fig2-8.jpg"), caption: "拼接匹配：剔除的 37 对误匹配与 48 对绿色内点" },
    { sectionId: "stitch", src: labAsset("lab2/images/fig2-9.jpg"), caption: "左图参考帧、直接覆盖、加权羽化融合" },
    { sectionId: "stitch", src: labAsset("lab2/images/fig2-10.jpg"), caption: "接缝局部放大（x≈245）：直接覆盖 vs 羽化" },
    { sectionId: "stitch", src: labAsset("lab2/images/fig2-11.jpg"), caption: "覆盖范围与左图羽化权重图" },
    { sectionId: "stitch", src: labAsset("lab2/images/panorama.jpg"), caption: "最终全景图：挂毯完整还原" },
  ],
  thoughtQuestions: [
    {
      q: "为什么中值滤波对椒盐噪声的效果远好于线性滤波？",
      a: "椒盐噪声是极端的 0/255 值。线性滤波把邻域做加权平均，极端值会被平均进结果，只能靠强平滑稀释；中值滤波把邻域排序后取中间值，孤立的极端值会被直接排除。本次实验在 10% 噪声下，中值 3×3 的 PSNR 比均值/高斯高约 7~8 dB。",
    },
    {
      q: "为什么中值核从 3×3 增大到 5×5 后 PSNR 反而下降？",
      a: "核越大，参与排序的邻域越宽，去噪更彻底，但图像细节（发丝、帽檐）也被当成噪声抹掉。PSNR 衡量的是与清晰原图的差异，细节损失会抵消去噪收益，因此 3×3 在本次数据上最优。",
    },
    {
      q: "Sobel 与 Prewitt 的差别在哪里？",
      a: "两者都是 3×3 一阶差分，但 Prewitt 的行/列权重全是 1，Sobel 给中心行/列权重 2。后者相当于「先高斯近似平滑再差分」，对距离中心更近的像素赋予更大权重，因此抗噪更好、边缘更稳定，是工程上最常用的折中。",
    },
    {
      q: "为什么 Laplacian 会产生双边缘，且更适合锐化？",
      a: "Laplacian 是二阶导，阶跃边缘在二阶导上表现为正负一对尖峰，所以出现双像素边界；同时二阶导对噪声极其敏感。锐化正是利用「原图减去或加上 Laplacian」来增强高频，而不是用它直接做边缘检测。",
    },
    {
      q: "比值检验的 ratio 应该取大还是取小？",
      a: "ratio 越小，要求最近邻显著优于次近邻，匹配数少但内点率高（0.75 时 66.7%）；ratio 越大召回上升但错误匹配迅速增多（0.9 时内点率只有 8.3%）。实践中常取 0.7~0.8，再用 RANSAC 做几何一致性兜底。",
    },
    {
      q: "为什么 Eiffel 塔的拼接会失败？",
      a: "两图视角差异极大，塔身是强重复性的金属网格，描述子难以区分不同位置的相似纹理；ratio=0.85 时 50 对匹配只剩 8 个内点，且几乎共线，无法稳定估计单应性。困难样本需要在采集阶段保证足够重叠与视角变化，或改用局部拼接/多模型方法。",
    },
  ],
};
