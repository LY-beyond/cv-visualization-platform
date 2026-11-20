import { labAsset, type LabMeta } from "./types";

export const lab4: LabMeta = {
  id: "lab4",
  title: "上机实验四 · 图像分割",
  date: "2026-11",
  cover: labAsset("lab4/images/fig3-1-K.jpg"),
  tags: ["Mean Shift", "带宽", "SLIC 超像素", "Canny 五步", "双阈值", "转置卷积", "FCN32/16/8"],
  summary:
    "从手写 Mean Shift 的半径扫描开始，依次验证 sklearn 三维聚类、SLIC 的 K/M 参数、从零实现 Canny 五步、转置卷积的输出尺寸公式，最后复现 FCN32/16/8。关键数字：SLIC 迭代 7 轮后标签完全稳定；Canny 的 NMS 把非零像素从 20028 细化到 4399；FCN 的验证集 Mean IoU 从 0.4753 升到 0.5276。",
  goals: [
    "手写 Mean Shift 并观察半径对聚类中心数的影响",
    "理解带宽在点聚类与图像分割中的「等价簇数」作用",
    "掌握 SLIC 的距离度量、K/M 参数与迭代收敛过程",
    "从零实现 Canny 五步并定量分析 sigma 与双阈值",
    "推导转置卷积输出尺寸并验证重叠累加",
    "复现 FCN32/16/8 并比较跳跃连接的收益",
  ],
  sections: [
    {
      id: "meanshift",
      title: "Mean Shift 与带宽",
      paragraphs: [
        "Mean Shift 从每个点出发，反复把中心移到邻域内样本的均值，直到位移小于 tol。它不需要预设簇数，簇数完全由「局部密度结构 + 半径/带宽」决定。",
        "在 9 个二维点上扫描 radius：r=2 得 5 个中心、r=4 与 r=6 各 3 个、r=7 得 2 个、r=8 时所有点收敛到全体均值 (5.44, 3.42)，只剩 1 个中心。半径大到跨过簇间空隙时，相邻簇被一次平均「拉」到一起。",
        "sklearn 的三维实验用 make_blobs 生成 3 个中心、150 个样本。自动带宽约 1.92 时正确找回 3 个中心（误差 < 0.27）；手动把带宽设为 0.5 得到 48 个中心（过分割），8.0 时只剩 1 个（欠分割）。",
      ],
      bullets: [
        "图像分割版本把像素看作 (x/10, y/10, R, G, B)：带宽 10 → 42 个区域（MAE 4.8），15 → 14 个，25 → 5 个",
        "空邻域保护与「最大位移 < tol」的收敛条件可避免 NaN 中心导致的死循环",
      ],
      caseIds: ["lab4-meanshift"],
    },
    {
      id: "slic",
      title: "SLIC 超像素",
      paragraphs: [
        "SLIC 在 (x, y, L, a, b) 五维空间做局部 K-Means，距离 D² = D_c²/M² + D_s²/S²。K 决定网格间隔 S=√(N/K)，M 是颜色距离相对空间距离的权重。",
        "K 从 200 增到 1000：实际超像素数 196 → 289 → 500 → 1024，平均面积 1337 → 906 → 524 → 256 像素，平均圆形度反而从 0.646 升到 0.873。K 小时大块区域被迫横跨帽檐、发丝，形状被拉长；K 大时单个超像素只有 16×16，更容易接近紧凑的方形。",
        "固定 K=500 比较 M：M=5 时圆形度只有 0.128，边界贴着头发与帽檐走，形状细长；M=40 时达到 0.784，趋近规整方格。迭代 7 轮后标签完全稳定。",
      ],
      bullets: [
        "实验保留 M=40/K=500 的 loop0~loop9 十帧，可直接回放超像素从网格初始化到贴边的过程",
        "M 越大 → 颜色项被压得越小 → 空间距离占主导 → 超像素越紧凑",
      ],
      caseIds: ["lab4-slic-player"],
    },
    {
      id: "canny",
      title: "Canny 五步从零实现",
      paragraphs: [
        "五步依次为：高斯平滑 → Sobel 求 Gx/Gy → 幅值与方向 → 非极大值抑制 → 双阈值与滞后连接。在合成圆图上，NMS 把非零像素从 20028 细化到 4399，最终得到约 863 个像素的闭合圆环。",
        "sigma 的影响：0.3 时平均梯度 0.582、边缘 840 个，噪声几乎未抑制；0.5 时平均梯度 0.543、边缘 863 个，是干净的圆环；1.0 时平滑最强（0.517），但因梯度空间展布变宽，NMS 后边缘略增到 887。",
        "双阈值 (20,50)/(30,60)/(50,100) 在合成图上最终边缘为 866/863/860，几乎不变——因为阶跃边缘的梯度远高于 Th。真正变化的是弱边缘数量（6/14/9），滞后连接决定它们是否被补回。换成 ctscan、mecca06 后，阈值从 (30,60) 降到 (10,25)，边缘数从 5668/3148 增加到 9253/5780，说明「归一化 + 固定阈值」对弱对比图像有固有局限。",
      ],
      bullets: [
        "修正参考实现「用角度代替幅值做 NMS」的错误：非零像素 14846 → 4399",
        "本实现把幅值归一化到全图最大值 255，与 cv2.Canny 的阈值标度不同，像素数不宜直接比较",
      ],
      caseIds: ["lab4-canny-steps"],
    },
    {
      id: "deconv",
      title: "转置卷积",
      paragraphs: [
        "转置卷积把每个输入元素放大成 kernel_size×kernel_size 的块，按 stride 间隔摆放，重叠处相加。Keras/TF 在 padding=valid 下的输出尺寸为 H_out = H_in·s + max(k−s, 0)。",
        "2×2 输入、s=3、k=1 得到 6×6，四个元素落在 (0,0)(0,3)(3,0)(3,3)；s=2 得到 4×4；k=2 仍是 6×6，但每个元素铺成 2×2 的块，非零 16 个、和为 40；s=2、k=3 时块开始重叠，输出 5×5 几乎被填满（25 个非零，中心出现 1+2+3+4=10），元素和仍为 90。权重乘 2，输出线性放大 2 倍。",
        "NumPy 手写版本与 Keras 输出完全一致（差为 0），说明转置卷积的数值本质就是「输入 × 卷积核 → 按步长摆放 → 重叠累加」，并不是某种神秘的逆运算。",
      ],
      caseIds: ["lab4-transpose-conv"],
    },
    {
      id: "fcn",
      title: "FCN32 / 16 / 8",
      paragraphs: [
        "三个模型共用 VGG16 主干与 21 类输出，区别只在上采样倍数与跳跃连接：FCN32 直接从 pool5 上采样 32 倍；FCN16 融合 pool4；FCN8 再融合 pool3。参数量都约 1.34 亿，跳跃连接几乎不增加参数。",
        "在 V100 上以 512×512、batch 4 训练 5 轮，验证集 Mean IoU 依次为 0.4753 / 0.4989 / 0.5276，像素准确率 0.8720 / 0.8777 / 0.8850。FCN8 的 0.5276 已接近 Long 等人报告在 SBD 上的 FCN-8s 水平。",
        "同时能观察到过拟合：FCN16/FCN8 的验证损失从 0.41/0.49 涨到 0.50/0.54，而训练损失持续下降到 0.03 量级。",
      ],
      bullets: [
        "10,831 条训练 / 1,200 条验证 TFRecord，SBD 全量 1.42 GB",
        "原仓库 64×64 大核转置卷积在 GPU 上被改写成膨胀卷积（单步 20 秒），等价替换为双线性 resize 后降到 0.11 秒/步",
      ],
    },
  ],
  charts: [
    {
      sectionId: "meanshift",
      title: "radius 与聚类中心数（9 个二维点）",
      source: "实验四报告 · 1.4 / 思考题（1）",
      kind: "line",
      data: {
        x: ["r=2", "r=4", "r=6", "r=7", "r=8"],
        series: [{ name: "中心数", values: [5, 3, 3, 2, 1] }],
      },
    },
    {
      sectionId: "meanshift",
      title: "sklearn 带宽对三维聚类的影响",
      source: "实验四报告 · 2.4 带宽参数",
      kind: "table",
      data: {
        columns: ["bandwidth", "0.5", "1.0", "1.5~2.0", "3.0~7.0", "8.0"],
        rows: [["中心数", 48, 5, 3, 3, 1]],
      },
    },
    {
      sectionId: "slic",
      title: "K 对超像素统计的影响（M=40）",
      source: "实验四报告 · 3.2 实测",
      kind: "table",
      data: {
        columns: ["K（目标）", "实际超像素数", "平均面积/像素", "平均圆形度", "网格间隔 S"],
        rows: [
          [200, 196, 1337, 0.646, 36],
          [300, 289, 906, 0.716, 29],
          [500, 500, 524, 0.784, 22],
          [1000, 1024, 256, 0.873, 16],
        ],
      },
    },
    {
      sectionId: "canny",
      title: "sigma 对边缘的影响",
      source: "实验四报告 · 4.4 实测",
      kind: "table",
      data: {
        columns: ["sigma", "高斯核", "平均梯度", "边缘像素数", "观察"],
        rows: [
          [0.3, "3×3", 0.582, 840, "平滑很弱，对噪声敏感"],
          [0.5, "3×3", 0.543, 863, "干净的闭合圆环"],
          [1.0, "5×5", 0.517, 887, "平滑最强，边缘略增厚"],
        ],
      },
    },
    {
      sectionId: "canny",
      title: "双阈值对弱边缘的影响",
      source: "实验四报告 · 4.5 实测",
      kind: "table",
      data: {
        columns: ["阈值 (Tl, Th)", "强边缘", "弱边缘", "最终边缘"],
        rows: [
          ["(20, 50)", "854~863", 6, 866],
          ["(30, 60)", "854~863", 14, 863],
          ["(50, 100)", "854~863", 9, 860],
        ],
      },
    },
    {
      sectionId: "deconv",
      title: "转置卷积参数与输出",
      source: "实验四报告 · 5.2~5.5 实测",
      kind: "table",
      data: {
        columns: ["输入", "stride", "kernel", "输出尺寸", "非零元素", "元素和"],
        rows: [
          ["2×2（1,2,3,4）", 3, 1, "6×6", 4, 10],
          ["2×2", 2, 1, "4×4", 4, 10],
          ["2×2", 3, 2, "6×6", 16, 40],
          ["2×2", 2, 3, "5×5", 25, 90],
          ["2×2，权重×2", 3, 1, "6×6", 4, 20],
        ],
      },
    },
    {
      sectionId: "fcn",
      title: "FCN32 / 16 / 8 验证集指标",
      source: "实验四报告 · 6.7 表（V100，5 epoch）",
      kind: "table",
      data: {
        columns: ["模型", "可学习参数量", "像素准确率", "Mean IoU", "rider 像素准确率", "rider Mean IoU"],
        rows: [
          ["FCN32", "134,346,581", 0.872, 0.4753, 0.9722, 0.7891],
          ["FCN16", "134,364,410", 0.8777, 0.4989, 0.9763, 0.6198],
          ["FCN8", "134,376,863", 0.885, 0.5276, 0.9723, 0.7829],
        ],
      },
    },
    {
      sectionId: "fcn",
      title: "Mean IoU 随跳跃连接的提升",
      source: "实验四报告 · 6.7 表",
      kind: "bar",
      data: {
        categories: ["FCN32", "FCN16", "FCN8"],
        series: [{ name: "验证集 Mean IoU", values: [0.4753, 0.4989, 0.5276] }],
      },
    },
  ],
  gallery: [
    { sectionId: "meanshift", src: labAsset("lab4/images/fig1-2-radius4.jpg"), caption: "radius=4 的收敛结果（3 个中心）" },
    { sectionId: "meanshift", src: labAsset("lab4/images/fig1-3-radius-compare.jpg"), caption: "radius=2 / 4 / 8 的聚类对比" },
    { sectionId: "meanshift", src: labAsset("lab4/images/fig1-4-radius-sweep.jpg"), caption: "半径扫描：中心数随半径单调减少" },
    { sectionId: "meanshift", src: labAsset("lab4/images/fig2-2-meanshift3d.jpg"), caption: "150 个三维样本与自动带宽找到的 3 个中心" },
    { sectionId: "meanshift", src: labAsset("lab4/images/fig2-4-bandwidth.jpg"), caption: "带宽 0.5 / 1.92 / 8.0 的过分割与欠分割" },
    { sectionId: "meanshift", src: labAsset("lab4/images/fig2-5-bw-curve.jpg"), caption: "带宽与中心数曲线" },
    { sectionId: "meanshift", src: labAsset("lab4/images/fig2-6-segmentation.jpg"), caption: "把像素当五维样本做 Mean Shift 图像分割" },
    { sectionId: "slic", src: labAsset("lab4/images/fig3-1-K.jpg"), caption: "K=200 / 500 / 1000 的超像素对比" },
    { sectionId: "slic", src: labAsset("lab4/images/fig3-2-M.jpg"), caption: "M=5 与 M=40 的形状差异" },
    { sectionId: "slic", src: labAsset("lab4/images/fig3-4-iterations.jpg"), caption: "迭代过程中超像素边界的演化" },
    { sectionId: "slic", src: labAsset("lab4/images/fig3-5-convergence.jpg"), caption: "迭代次数与标签变化量（7 轮后稳定）" },
    { sectionId: "slic", src: labAsset("lab4/images/fig3-6-mecca.jpg"), caption: "换用 mecca06 的真实图像结果" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop0.jpg"), caption: "SLIC 迭代第 0 帧：规则网格初始化" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop1.jpg"), caption: "SLIC 迭代第 1 帧：边界开始移动" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop2.jpg"), caption: "SLIC 迭代第 2 帧" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop3.jpg"), caption: "SLIC 迭代第 3 帧" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop4.jpg"), caption: "SLIC 迭代第 4 帧" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop5.jpg"), caption: "SLIC 迭代第 5 帧" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop6.jpg"), caption: "SLIC 迭代第 6 帧" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop7.jpg"), caption: "SLIC 迭代第 7 帧：标签基本稳定" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop8.jpg"), caption: "SLIC 迭代第 8 帧" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-loop9.jpg"), caption: "SLIC 迭代第 9 帧：最终结果" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-m5-loop0.jpg"), caption: "M=5 的初始网格（对照）" },
    { sectionId: "slic", src: labAsset("lab4/images/slic-m5-loop9.jpg"), caption: "M=5 的最终结果：边界贴合颜色但不规则" },
    { sectionId: "canny", src: labAsset("lab4/images/fig4-2-step123.jpg"), caption: "Canny 第 1~3 步：平滑、Gx/Gy、幅值" },
    { sectionId: "canny", src: labAsset("lab4/images/fig4-3-step45.jpg"), caption: "Canny 第 4~5 步：NMS、双阈值与滞后连接" },
    { sectionId: "canny", src: labAsset("lab4/images/fig4-4-threshold.jpg"), caption: "双阈值对弱边缘的取舍" },
    { sectionId: "canny", src: labAsset("lab4/images/fig4-5-direction.jpg"), caption: "梯度方向着色图" },
    { sectionId: "canny", src: labAsset("lab4/images/fig4-6-sigma.jpg"), caption: "sigma=0.3 / 0.5 / 1.0 的边缘对比" },
    { sectionId: "canny", src: labAsset("lab4/images/fig4-7-thresholds.jpg"), caption: "三组双阈值的完整结果" },
    { sectionId: "canny", src: labAsset("lab4/images/fig4-9-ref-vs-fixed.jpg"), caption: "修正 NMS 错误前后的对比（14846 → 4399）" },
    { sectionId: "deconv", src: labAsset("lab4/images/fig5-1-grid.jpg"), caption: "转置卷积的网格摆放与重叠累加示意" },
    { sectionId: "fcn", src: labAsset("lab4/images/fig6-2-curves.jpg"), caption: "FCN 训练曲线（损失、像素准确率、Mean IoU）" },
    { sectionId: "fcn", src: labAsset("lab4/images/fig6-4-predictions.jpg"), caption: "六个验证样本的输入、真值与三模型预测" },
    { sectionId: "fcn", src: labAsset("lab4/images/fig6-5-errors.jpg"), caption: "FCN 的分割误差可视化" },
    { sectionId: "fcn", src: labAsset("lab4/images/fig7-4-bars.jpg"), caption: "三种模型的像素准确率与 Mean IoU 对比" },
    { sectionId: "fcn", src: labAsset("lab4/images/fcn-curves-gpu.jpg"), caption: "GPU 完整训练曲线" },
    { sectionId: "fcn", src: labAsset("lab4/images/fcn-rider-compare.jpg"), caption: "rider 图像上三模型的分割结果对比" },
  ],
  thoughtQuestions: [
    {
      q: "radius 变大后，聚类中心数量如何变化？",
      a: "单调减少。半径变大意味着每个中心平均更大范围内的点，原本分属两个簇的邻域发生重叠，均值被拉向彼此，最终合并。本次 r=2 得 5 个、r=4/6 各 3 个、r=7 得 2 个、r=8 时只剩全体均值 (5.44, 3.42) 一个中心。",
    },
    {
      q: "为什么带宽在 Mean Shift 中相当于「簇数」？",
      a: "带宽决定邻域大小：太小则一个真实簇被切成多个模式（0.5 → 48 个），太大则多个簇被合并（8.0 → 1 个）。当带宽与簇间距匹配（1.5~7）时稳定得到 3 个中心。因此不需要预设簇数，但必须选对带宽。",
    },
    {
      q: "SLIC 中 K 与 M 分别控制什么？",
      a: "K 是目标超像素数，通过 S=√(N/K) 决定网格间隔，K 越大超像素越小、越多；M 是颜色距离相对空间距离的权重，M 越大空间项越主导、超像素越紧凑规则（圆形度 0.784），M 越小越贴颜色边界、形状越不规则（圆形度 0.128）。",
    },
    {
      q: "为什么 sigma 增大后边缘像素数没有明显减少？",
      a: "本例是合成的二值圆图，只有一条强阶跃边缘。sigma 增大使梯度幅值的空间展布变宽，NMS 后边缘反而略微增厚（840→863→887）。真正体现 sigma 抑噪作用的是含噪真实图像，而不是干净合成图。",
    },
    {
      q: "为什么双阈值在合成圆图上几乎不起作用？",
      a: "圆图边界是陡峭阶跃，梯度幅值集中在 200 以上，远高于最高阈值 100，所以强边缘始终是 854~863 个。阈值只影响抗锯齿造成的少量弱边缘（6/14/9），滞后连接再把与强边缘连通的部分补回，最终边缘数 866/863/860 几乎不变。",
    },
    {
      q: "为什么 2×2 输入、stride=3、kernel=1 会得到 6×6 输出？",
      a: "TF 在 valid 下的公式是 H_out = H_in·s + max(k−s, 0)。本例 2×3 + max(1−3,0) = 6。直观上，4 个输入元素放在下标 0 和 3 处，TF 不裁剪尾部、把输出网格补满 H_in·s=6，因此第 5、6 行/列全为 0。",
    },
    {
      q: "FCN8 比 FCN32 多了什么，为什么 IoU 更高？",
      a: "FCN8 在 32 倍上采样路径上融合了 pool4（16 倍）与 pool3（8 倍）的浅层特征。浅层保留更多空间细节，能修正大倍率上采样造成的块状边界，因此 Mean IoU 从 0.4753 升到 0.5276，而参数量几乎不变。",
    },
  ],
};
