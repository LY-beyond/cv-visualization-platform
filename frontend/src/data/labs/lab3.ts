import { labAsset, type LabMeta } from "./types";

export const lab3: LabMeta = {
  id: "lab3",
  title: "上机实验三 · 特征、分类与深度网络",
  date: "2026-10",
  cover: labAsset("lab3/images/bow-accuracy-single.jpg"),
  tags: ["BoVW", "SIFT/HOG/LBP/ORB", "K-Means 词典", "SVM", "LeNet", "ResNet18", "CIFAR100"],
  summary:
    "三个练习串成一条从手工特征到深度网络的路线：BoVW 用 5 种描述子 + 6 种联合组合说明「特征互补才有收益」；LeNet 在 MNIST 上跑出 98.12% 并做误判分析；ResNet18 在 CIFAR100 上训练 200 轮，Top-1 76.10%、Top-5 93.13%。",
  goals: [
    "掌握 BoVW 的建词典、量化、直方图与 SVM 分类全流程",
    "比较 SIFT、ORB、稠密 SIFT、HOG、LBP 的描述能力",
    "复现 LeNet 结构并逐层核对特征图尺寸",
    "完成 LeNet 训练、独立测试与误判样本分析",
    "复现 ResNet18 在 CIFAR100 上的 200 轮训练并读懂曲线",
  ],
  sections: [
    {
      id: "bow",
      title: "BoVW 场景分类",
      paragraphs: [
        "视觉词袋把图像压成「视觉单词的直方图」：对每张图提取局部描述子 → 用 K-Means 在训练集描述子上聚类得到词典 → 把每个描述子量化到最近的词 → 统计直方图 → 用线性 SVM 分类。所有特征都走同一条管线，唯一变量是描述子本身。",
        "单特征结果（k=100）：HOG 0.6905 最好，稠密 SIFT 0.6571，SIFT 0.5571，LBP 0.4762，ORB 0.4286。联合特征 SIFT+HOG 达到 0.7238，比最佳单特征再高 3.3 个百分点；但 SIFT+ORB 只有 0.6048，说明弱特征拼进来只会增加噪声维度。",
      ],
      bullets: [
        "参考代码基线：k=50 线性 SVM 准确率 0.565，k=100 precomputed 0.603",
        "主要混淆对是「室内 / 办公室」：30 张室内错 15 张，样本只有 42 张",
        "词典规模 k 从 25 增到 200：0.5048 → 0.5238 → 0.5571 → 0.5619，100 后饱和",
      ],
      caseIds: ["lab3-bow-explorer"],
    },
    {
      id: "lenet",
      title: "LeNet 手写数字",
      paragraphs: [
        "LeNet 的结构为 C1 6@5×5（same）→ S2 平均池化 → C3 16@5×5（valid）→ S4 平均池化 → Flatten 400 → C5 120 → F6 84 → 输出 10，共 61,706 个可训练参数（241 KB）。两次池化后的尺寸分别是 14×14 与 5×5，与任务书要求核对的数字一致。",
        "训练 5 轮、批大小 32，训练准确率从 92.99% 升到 98.87%，独立测试集准确率 98.12%（9812/10000），测试损失 0.0650。误判的 188 张里有 10 张置信度超过 99%，说明「高概率不等于正确」。",
        "加一层卷积的 LeNet-Plus 参数反而更少（33,706），因为额外的卷积压缩了全连接层输入；测试准确率 98.48%，提升 0.36 个百分点，代价是每轮耗时略增。",
      ],
      bullets: [
        "预处理差异：MNIST 原图直接缩放 vs 自动整理笔画（反色→二值化→裁剪→等比 20×20→居中）",
        "网页端识别 16 张图片，含两张高置信度误判样本",
      ],
      caseIds: ["lab3-lenet-draw"],
    },
    {
      id: "cifar",
      title: "CIFAR100 与 ResNet18",
      paragraphs: [
        "ResNet18 在 CIFAR100 上训练 200 轮、批大小 128，采用三段学习率（0.1 → 0.02 → 0.004 → 0.0008）。最终 Top-1 76.10%、Top-5 93.13%，与教师参考模型（75.85% / 92.97%）同一口径。",
        "曲线最有教学价值的地方是「过拟合可以被学习率逆转」：第 100 轮训练准确率 90.77%、测试准确率反而降到 65.82%；把学习率降到 0.02 后，训练继续上升，测试损失从 1.4775 降到 0.9722，泛化同时变好。",
        "归一化必须用 CIFAR100 训练集均值 (0.5071, 0.4866, 0.4409) 与标准差 (0.2673, 0.2564, 0.2762)，换成 ImageNet 均值会让准确率明显下降。",
        "网页端用 200 轮权重对 6 张 CIFAR100 测试图片与 2 张网络照片做识别：数据集图片全部正确，真实街景公交车被以 97.61% 的置信度判成有轨电车——32×32 缩放与构图差异是主要原因。以下为预计算记录，不加载 42.9MB 权重。",
      ],
    },
  ],
  charts: [
    {
      sectionId: "bow",
      title: "五种单特征准确率（k=100）",
      source: "实验三·练习1 报告 表 5.2",
      kind: "bar",
      data: {
        categories: ["HOG", "稠密SIFT", "SIFT", "LBP", "ORB"],
        series: [{ name: "准确率", values: [0.6905, 0.6571, 0.5571, 0.4762, 0.4286] }],
      },
    },
    {
      sectionId: "bow",
      title: "六种联合特征（k=100，各自建词典后拼接）",
      source: "实验三·练习1 报告 表 5.3",
      kind: "table",
      data: {
        columns: ["组合", "维度", "准确率", "宏 F1", "相对最佳单特征"],
        rows: [
          ["SIFT + HOG", 200, 0.7238, 0.7206, "+0.033"],
          ["SIFT + 稠密 SIFT", 200, 0.7238, 0.712, "+0.033"],
          ["SIFT+ORB+HOG+LBP", 400, 0.7095, 0.7018, "+0.019"],
          ["SIFT+ORB+HOG", 300, 0.6952, 0.6899, "+0.005"],
          ["SIFT + LBP", 200, 0.6286, 0.6215, "−0.062"],
          ["SIFT + ORB", 200, 0.6048, 0.5926, "−0.086"],
        ],
      },
    },
    {
      sectionId: "bow",
      title: "词典规模 k 与准确率",
      source: "实验三·练习1 报告 5.4 节",
      kind: "line",
      data: {
        x: ["k=25", "k=50", "k=100", "k=200"],
        series: [
          { name: "准确率", values: [0.5048, 0.5238, 0.5571, 0.5619] },
          { name: "宏 F1", values: [0.5073, 0.5208, 0.5481, 0.552] },
        ],
      },
    },
    {
      sectionId: "lenet",
      title: "LeNet 五轮训练曲线",
      source: "实验三·练习2 报告 4.1 逐轮指标（真实运行）",
      kind: "line",
      data: {
        x: ["第1轮", "第2轮", "第3轮", "第4轮", "第5轮"],
        series: [
          { name: "训练准确率", values: [0.9299, 0.972, 0.9814, 0.9859, 0.9887] },
          { name: "验证准确率（与训练集重叠）", values: [0.9718, 0.9838, 0.988, 0.992, 0.9882] },
        ],
      },
    },
    {
      sectionId: "lenet",
      title: "LeNet 与 LeNet-Plus 对比",
      source: "实验三·练习2 报告 表 7-1",
      kind: "table",
      data: {
        columns: ["模型", "参数量", "验证准确率", "测试准确率", "测试损失", "总耗时", "逐轮耗时/s"],
        rows: [
          ["LeNet（原）", 61706, "96.52%", "98.12%", 0.065, "36.4 s", "9.3 / 7.5 / 5.3 / 5.5 / 5.8"],
          ["LeNet-Plus（+1 卷积层）", 33706, "96.65%", "98.48%", 0.0504, "40.5 s", "7.2 / 6.9 / 7.9 / 7.1 / 7.7"],
        ],
      },
    },
    {
      sectionId: "cifar",
      title: "ResNet18 关键轮次的训练/测试准确率",
      source: "实验三·练习3 报告 表 5-1（200 轮真实记录）",
      kind: "line",
      data: {
        x: ["1", "10", "30", "60", "61", "80", "100", "120", "121", "140", "161", "200"],
        series: [
          {
            name: "训练准确率",
            values: [0.0885, 0.5237, 0.6368, 0.6604, 0.7901, 0.8899, 0.9077, 0.9166, 0.9695, 0.9982, 0.9989, 0.9994],
          },
          {
            name: "测试准确率",
            values: [0.1261, 0.4702, 0.5376, 0.5864, 0.7207, 0.6821, 0.6582, 0.6855, 0.7361, 0.7543, 0.7611, 0.761],
          },
        ],
      },
    },
    {
      sectionId: "cifar",
      title: "三段学习率的阶段成绩",
      source: "实验三·练习3 报告 表 5-2",
      kind: "table",
      data: {
        columns: ["阶段", "轮次", "学习率", "阶段起点", "阶段终点", "阶段内峰值", "平均测试损失"],
        rows: [
          ["一", "1–60", 0.1, "12.61%", "58.64%", "59.84%（第 58 轮）", 1.864],
          ["二", "61–120", 0.02, "72.07%", "68.55%", "72.96%（第 62 轮）", 1.285],
          ["三", "121–200", "0.004 → 0.0008", "73.61%", "76.10%", "76.38%（第 197 轮）", 0.97],
        ],
      },
    },
    {
      sectionId: "cifar",
      title: "网页端 8 张图片的 Top-5 预计算记录",
      source: "实验三·练习3 web-results（200 轮 ResNet18 权重，原值保留）",
      kind: "table",
      data: {
        columns: ["图片", "期望类别", "Top-1（置信度）", "Top-2（置信度）", "结果"],
        rows: [
          ["cifar-apple", "苹果", "苹果 99.60%", "盘子 0.09%", "正确"],
          ["cifar-bicycle", "自行车", "自行车 99.15%", "男人 0.34%", "正确"],
          ["cifar-bus", "公交车", "公交车 42.73%", "房屋 13.49%", "正确（置信度偏低）"],
          ["cifar-butterfly", "蝴蝶", "蝴蝶 81.70%", "骆驼 1.52%", "正确"],
          ["cifar-sunflower", "向日葵", "向日葵 96.86%", "罂粟花 2.31%", "正确"],
          ["cifar-turtle", "乌龟", "乌龟 99.97%", "蜥蜴 0.01%", "正确"],
          ["web-bus", "公交车", "有轨电车 97.61%", "公交车 2.29%", "误判"],
          ["web-rose", "玫瑰", "玫瑰 99.98%", "罂粟花 0.01%", "正确"],
        ],
      },
    },
  ],
  gallery: [
    { sectionId: "bow", src: labAsset("lab3/images/bow-accuracy-single.jpg"), caption: "五种单特征的准确率对比（k=100）" },
    { sectionId: "bow", src: labAsset("lab3/images/bow-accuracy-fused.jpg"), caption: "六种联合特征与最佳单特征的对比" },
    { sectionId: "bow", src: labAsset("lab3/images/bow-accuracy-k.jpg"), caption: "词典规模 k 与准确率（100 后饱和）" },
    { sectionId: "bow", src: labAsset("lab3/images/bow-recall-heatmap.jpg"), caption: "各类召回率热力图（室内最弱）" },
    { sectionId: "bow", src: labAsset("lab3/images/bow-keypoints.jpg"), caption: "SIFT 关键点：纹理丰富处多、平坦区域少" },
    { sectionId: "bow", src: labAsset("lab3/images/bow-visual-words.jpg"), caption: "K-Means 学到的视觉单词" },
    { sectionId: "bow", src: labAsset("lab3/images/bow-example.jpg"), caption: "单张图的词袋直方图构造过程" },
    { sectionId: "bow", src: labAsset("lab3/images/bow-tsne.jpg"), caption: "BoVW 特征的 t-SNE 分布" },
    { sectionId: "lenet", src: labAsset("lab3/images/lenet-curves.jpg"), caption: "LeNet 五轮训练曲线（验证集与训练集重叠，仅作参考）" },
    { sectionId: "lenet", src: labAsset("lab3/images/lenet-confusion.jpg"), caption: "MNIST 测试集 10×10 混淆矩阵" },
    { sectionId: "lenet", src: labAsset("lab3/images/lenet-predictions.jpg"), caption: "正确与误判样本对照（各 8 张）" },
    { sectionId: "lenet", src: labAsset("lab3/images/lenet-mnist-3.jpg"), caption: "MNIST 原图“3”直接缩放到 28×28" },
    { sectionId: "lenet", src: labAsset("lab3/images/lenet-handwritten-3.jpg"), caption: "手写“3”经自动整理笔画后的输入" },
    { sectionId: "cifar", src: labAsset("lab3/images/cifar-curves-student.jpg"), caption: "3 轮快速验证的损失与准确率曲线" },
    { sectionId: "cifar", src: labAsset("lab3/images/cifar-curves-teacher.jpg"), caption: "200 轮完整训练曲线（三段学习率清晰可见）" },
    { sectionId: "cifar", src: labAsset("lab3/images/cifar-confusion.jpg"), caption: "CIFAR100 细类混淆矩阵（100×100）" },
    { sectionId: "cifar", src: labAsset("lab3/images/cifar-errors.jpg"), caption: "误判结构分析：细类错误与粗类错误分层" },
    { sectionId: "cifar", src: labAsset("lab3/images/cifar-apple.jpg"), caption: "数据集示例 apple 及其预测记录" },
    { sectionId: "cifar", src: labAsset("lab3/images/cifar-bus.jpg"), caption: "数据集示例 bus：32×32 下细节有限" },
    { sectionId: "cifar", src: labAsset("lab3/images/cifar-web-rose.jpg"), caption: "外部照片 rose：与数据集分布差异导致预测偏移" },
  ],
  thoughtQuestions: [
    {
      q: "为什么联合特征不是越多越好？",
      a: "联合的收益来自「强且互补」。SIFT 抓局部结构、HOG 抓整体梯度分布，两者互补，准确率从 0.557 提到 0.724；而 ORB 单特征只有 0.429，拼进 SIFT+HOG 后准确率反而降到 0.695，因为 100 维弱特征对 SVM 来说是噪声，且训练样本只有 807 张，维度升高会加剧过拟合。",
    },
    {
      q: "词典规模 k 为什么会在 100 后饱和？",
      a: "k 太小时不同类别的局部结构被塞进同一个词，欠拟合；k 增大后词表变细，但每张图只有约 157 个描述子，填不满词表，直方图反而更稀疏（k=200 时 55% 的维为 0）。信息量没有增加，只是被切得更碎，所以准确率在 100 后基本不动。",
    },
    {
      q: "LeNet 的两次池化为什么得到 14×14 和 5×5？",
      a: "第一次卷积用 same padding，28×28 卷积后仍是 28×28，池化 2×2 得 14×14；第二次卷积 5×5 用 valid，14−5+1=10，再池化得 5×5。尺寸差异不是池化造成的，而是中间那层不补零的卷积。",
    },
    {
      q: "训练准确率 98.87%、测试 98.12%，能否说明模型没有过拟合？",
      a: "不能直接下结论。本实验验证集与训练集重叠，val_accuracy 偏乐观（第 5 轮 98.82%），不能当作泛化成绩。真正可信的是独立测试集 98.12%，但仍有 188 张错误，其中 10 张置信度超过 99%，说明高置信度不等于正确。",
    },
    {
      q: "CIFAR100 训练中，为什么测试准确率会在第 100 轮降到最低？",
      a: "当时学习率仍是 0.1/0.02 的较大值，模型被推进一个尖锐的极小值：训练损失很低（0.3001），但测试损失升到 1.4775。把学习率降到 0.02 后，模型进入更平坦的极小值，训练准确率继续上升的同时测试损失回落到 0.9722，泛化反而改善。",
    },
    {
      q: "为什么 CIFAR100 的归一化不能用 ImageNet 均值？",
      a: "归一化参数必须与训练时完全一致。CIFAR100 训练集均值是 (0.5071, 0.4866, 0.4409)，标准差 (0.2673, 0.2564, 0.2762)；换成 ImageNet 的均值会让输入尺度发生偏移，相当于分布外输入，网页端推理准确率会明显下降。",
    },
  ],
};
