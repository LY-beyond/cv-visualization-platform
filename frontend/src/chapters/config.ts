/** 章节配置：导航、路由与讲解要点统一维护，新增章节只改这里。 */

export interface KnowledgeBlock {
  title: string;
  points: string[];
}

export interface FormulaBlock {
  name: string;
  expression: string;
  /** 可选 KaTeX 表达式，优先于 expression 渲染 */
  latex?: string;
  note: string;
}

export interface CompareTable {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface FigureRef {
  src: string;
  caption: string;
}

export interface ChapterConfig {
  id: string;
  order: string;
  title: string;
  subtitle: string;
  description: string;
  status: "active" | "planned";
  knowledge: KnowledgeBlock[];
  formulas?: FormulaBlock[];
  table?: CompareTable;
  figures?: FigureRef[];
}

export const chapters: ChapterConfig[] = [
  {
    id: "ch1",
    order: "01",
    title: "计算机视觉概述",
    subtitle: "定义、发展脉络与研究版图",
    description:
      "建立课程整体认知：计算机视觉解决什么问题、经历了哪些阶段、与传统机器视觉和深度学习方法的关系。",
    status: "active",
    knowledge: [
      {
        title: "定义与边界",
        points: [
          "计算机视觉：让机器从图像或视频中获取、理解与推理场景信息。",
          "与机器视觉的联系与区别：目标一致，工程侧重与系统集成方式不同。",
          "核心任务：分类、分割、检测、识别、跟踪、多目视觉、视觉问答。",
        ],
      },
      {
        title: "发展历史四阶段",
        points: [
          "萌芽与早期探索：边缘、区域与几何约束。",
          "Marr 几何视觉时代：从图像到 2.5D/3D 表示的层级化框架。",
          "统计学习与手工特征时代：SIFT、HOG、LBP 配浅层分类器。",
          "深度学习革命：AlexNet 之后端到端特征学习成为主流。",
        ],
      },
      {
        title: "方法对比与典型应用",
        points: [
          "传统方法依赖手工特征、数据需求小、可解释性强；深度方法依赖大数据与算力、端到端、可解释性弱。",
          "应用覆盖工业制造、智能交通与自动驾驶、安防智慧城市、消费级应用。",
        ],
      },
    ],
    table: {
      title: "传统方法与深度学习方法对比",
      columns: ["对比维度", "传统方法", "深度学习方法"],
      rows: [
        ["特征来源", "人工设计（SIFT/HOG/LBP 等）", "网络端到端自动学习"],
        ["数据需求", "小样本即可工作", "依赖大规模标注数据"],
        ["算力依赖", "CPU 即可完成训练与推理", "训练通常需要 GPU"],
        ["可解释性", "较强，特征含义明确", "较弱，特征表示隐式"],
        ["典型代表", "SVM、随机森林、模板匹配", "AlexNet、ResNet、ViT"],
      ],
    },
    figures: [
      { src: "/assets/course/ch1/ch1-why.jpg", caption: "为什么需要计算机视觉：图像数据无处不在" },
      { src: "/assets/course/ch1/ch1-challenges.jpg", caption: "计算机视觉的典型挑战：光照、视角、尺度、遮挡与类内差异" },
    ],
  },
  {
    id: "ch2",
    order: "02",
    title: "基础知识",
    subtitle: "数字图像、成像模型与传统特征",
    description:
      "打牢图像表示与特征提取基础，理解预处理、特征提取与分类器组成的传统视觉流程。",
    status: "active",
    knowledge: [
      {
        title: "数字图像与颜色模型",
        points: [
          "图像类型：灰度图、RGB、HSV、深度图、RGB-D 与点云。",
          "灰度转换与 RGB/HSV 通道关系；CCD、CMOS、深度相机与激光雷达的成像特点。",
          "照相机成像模型与透镜成像关系。",
        ],
      },
      {
        title: "传统视觉流程与特征",
        points: [
          "流程：预处理 → 特征提取与表示 → 机器学习模型。",
          "LBP：邻域明暗关系编码，具备光照鲁棒性。",
          "SIFT：尺度空间极值、关键点定位、主方向与描述符。",
          "HOG：梯度方向直方图，按 cell/block 统计并归一化。",
        ],
      },
      {
        title: "卷积与池化",
        points: [
          "卷积：滑动窗口加权求和，提取局部模式；步长与填充决定输出尺寸。",
          "池化：最大/平均下采样，降低分辨率并增强平移鲁棒性。",
        ],
      },
      {
        title: "从传统滤波到学习型复原",
        points: [
          "传统流程用固定算子完成去噪与增强：均值/高斯滤波平滑噪声、Sobel 等算子提取边缘、直方图均衡拉伸对比度；参数靠人工设定，结果可用 PSNR/SSIM 量化，但换场景后泛化有限。",
          "SwinIR 把窗口自注意力引入超分、去噪与压缩伪影修复，用长程依赖替代局部感受野，同一套结构覆盖多类复原任务，是“传统滤波 → 学习型复原”的直接对照。",
          "HAT 在 SwinIR 基础上增加混合通道注意力与重叠交叉注意力，把更多输入像素纳入重建，适合讲解注意力如何改善细节恢复。",
          "MambaIRv2 用注意力态空间方程做线性复杂度的全局建模，补齐 CNN → Transformer → Mamba 的第三条技术路线：卷积是局部计算、注意力是 O(N²) 全局计算、状态空间是 O(N) 全局计算。",
          "本章下方“最新模型参考清单”已挂载 SwinIR、HAT、MambaIRv2 三张卡片，可结合年份、参数量与论文链接做横向对比。",
        ],
      },
    ],
    formulas: [
      {
        name: "灰度转换",
        expression: "Gray = 0.299·R + 0.587·G + 0.114·B",
        latex: "\\text{Gray} = 0.299R + 0.587G + 0.114B",
        note: "课件采用 0.3/0.59/0.11 的近似权重，按人眼对绿色更敏感分配系数。",
      },
      {
        name: "透镜成像",
        expression: "1/f = 1/Z + 1/z",
        latex: "\\frac{1}{f} = \\frac{1}{Z} + \\frac{1}{z}",
        note: "f 为焦距，Z 为物距，z 为像距；三者共同决定清晰成像的物距关系。",
      },
      {
        name: "LBP 编码",
        expression: "LBP = Σ(p=0→7) s(g_p − g_c)·2^p，s(x)=1(x≥0) 否则 0",
        latex: "\\text{LBP} = \\sum_{p=0}^{7} s(g_p - g_c)\\cdot 2^p",
        note: "比较 8 邻域像素 g_p 与中心像素 g_c 的灰度大小，得到 8 位二进制编码。",
      },
      {
        name: "二维卷积",
        expression: "y[i,j] = Σ_u Σ_v w[u,v]·x[i+u, j+v] + b",
        latex: "y[i,j] = \\sum_u \\sum_v w[u,v]\\,x[i+u,j+v] + b",
        note: "卷积核 w 在图像 x 上滑动加权求和，b 为偏置项。",
      },
    ],
    table: {
      title: "常用手工特征对比",
      columns: ["特征", "不变性", "描述形式", "典型用途"],
      rows: [
        ["LBP", "光照变化较鲁棒", "邻域比较的二进制编码/直方图", "纹理分析、人脸识别"],
        ["SIFT", "尺度、旋转不变", "128 维梯度方向描述符", "特征点匹配、图像拼接"],
        ["HOG", "光照与局部形变较鲁棒", "cell/block 梯度方向直方图", "行人检测、目标识别"],
      ],
    },
    figures: [
      { src: "/assets/course/ch2/ch2-depth.jpg", caption: "深度相机的分类：被动双目、结构光与 ToF" },
      { src: "/assets/course/ch2/ch2-gradient.jpg", caption: "HOG 中的梯度方向与幅值统计" },
      { src: "/assets/course/ch2/ch2-conv.jpg", caption: "RGB 三通道卷积计算过程" },
    ],
  },
  {
    id: "ch2-stitch",
    order: "02+",
    title: "特征点匹配与图像拼接",
    subtitle: "变换矩阵、RANSAC 与全景融合",
    description:
      "把特征点用于几何配准：从匹配点对求解变换矩阵，用 RANSAC 剔除误匹配，最后融合为全景图。",
    status: "active",
    knowledge: [
      {
        title: "图像变换",
        points: [
          "平移、旋转、缩放、镜像对称与齐次坐标表示。",
          "仿射变换与射影（单应）变换的矩阵形式及自由度。",
        ],
      },
      {
        title: "RANSAC 与融合",
        points: [
          "随机采样最小点集 → 估计模型 → 统计内点 → 迭代保留最佳模型。",
          "误差阈值决定内点/外点划分；过小导致内点不足，过大引入误匹配。",
          "重叠区域可采用加权平均或多频段融合减少接缝。",
        ],
      },
    ],
    formulas: [
      {
        name: "仿射变换",
        expression: "[x'; y'; 1] = [[a, b, tx], [c, d, ty], [0, 0, 1]] · [x; y; 1]",
        latex: "\\begin{bmatrix} x' \\\\ y' \\\\ 1 \\end{bmatrix} = \\begin{bmatrix} a & b & t_x \\\\ c & d & t_y \\\\ 0 & 0 & 1 \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\\\ 1 \\end{bmatrix}",
        note: "6 个自由度，可表示平移、旋转、缩放与错切，保持平行线仍平行。",
      },
      {
        name: "单应（射影）变换",
        expression: "[x'; y'; 1] ≈ H · [x; y; 1]，H 为 3×3 齐次矩阵（8 自由度）",
        latex: "\\tilde{\\mathbf{p}}' \\approx H\\tilde{\\mathbf{p}}",
        note: "用于透视畸变场景，至少需要 4 对不共线匹配点求解。",
      },
      {
        name: "RANSAC 内点判定",
        expression: "||H·p_i − p'_i|| ≤ ε 时判为内点",
        latex: "\\lVert H p_i - p'_i \\rVert \\le \\varepsilon",
        note: "ε 为误差阈值，内点数量最多的模型作为最终估计。",
      },
    ],
    table: {
      title: "仿射变换与射影变换对比",
      columns: ["对比项", "仿射变换", "射影（单应）变换"],
      rows: [
        ["自由度", "6", "8"],
        ["保持性质", "保持平行线与长度比例", "仅保持共线性与交比"],
        ["最少点对", "3 对", "4 对"],
        ["适用场景", "平移、旋转、缩放、错切", "透视畸变、平面场景配准"],
      ],
    },
    figures: [
      { src: "/assets/course/ch2-stitch/stitch-transform.jpg", caption: "图像变换与齐次坐标表示" },
      { src: "/assets/course/ch2-stitch/stitch-ransac.jpg", caption: "RANSAC 剔除误匹配：随机采样并统计内点" },
      { src: "/assets/course/ch2-stitch/stitch-blend.jpg", caption: "重叠区域融合，消除拼接接缝" },
    ],
  },
  {
    id: "ch3",
    order: "03",
    title: "图像分类",
    subtitle: "BoW 传统流程与 CNN 谱系",
    description:
      "围绕“图像属于哪一类”组织内容：从手工特征加 SVM，到经典 CNN 与当代网络家族。",
    status: "active",
    knowledge: [
      {
        title: "分类问题与粒度",
        points: [
          "分类问题定义与评价：Top-1/Top-5 准确率、混淆矩阵。",
          "类别级、子类级（细粒度）与实例级分类的区别。",
        ],
      },
      {
        title: "BoW 图像分类流程",
        points: [
          "特征提取与多特征融合 → K-Means 构建视觉词典 → 直方图量化 → SVM 分类。",
          "词典规模影响表达力与计算量；直方图表示丢失空间信息。",
        ],
      },
      {
        title: "经典网络与当代谱系",
        points: [
          "LeNet-5、AlexNet、VGG、GoogLeNet/Inception、ResNet 的结构与创新点。",
          "ResNet 变体、EfficientNet、ConvNeXt、MobileNet/ShuffleNet、ViT、Swin、DeiT 与混合架构。",
          "训练曲线、混淆矩阵、错误样例与特征嵌入投影是模型分析的四个基本视图。",
        ],
      },
    ],
    formulas: [
      {
        name: "Softmax",
        expression: "p_k = e^(z_k) / Σ(j=1→K) e^(z_j)",
        latex: "p_k = \\frac{e^{z_k}}{\\sum_{j=1}^{K} e^{z_j}}",
        note: "把网络输出的类别得分 z 归一化为概率分布，各类概率和为 1。",
      },
      {
        name: "交叉熵损失",
        expression: "L = −Σ(k=1→K) y_k · log(p_k)",
        latex: "L = -\\sum_{k=1}^{K} y_k \\log p_k",
        note: "y 为 one-hot 标签；正确类别概率越低，损失越大。",
      },
      {
        name: "卷积输出尺寸",
        expression: "O = ⌊(W − K + 2P) / S⌋ + 1",
        latex: "O = \\left\\lfloor \\frac{W - K + 2P}{S} \\right\\rfloor + 1",
        note: "W 为输入边长，K 为卷积核大小，P 为填充，S 为步长。",
      },
    ],
    table: {
      title: "经典卷积网络对比",
      columns: ["网络", "年份", "深度/规模", "关键创新"],
      rows: [
        ["LeNet-5", "1998", "7 层", "卷积、池化与全连接的手写数字识别范式"],
        ["AlexNet", "2012", "8 层", "ReLU、Dropout、数据增强与 GPU 训练"],
        ["VGG", "2014", "16~19 层", "3×3 小卷积核堆叠加深网络"],
        ["GoogLeNet", "2014", "22 层", "Inception 多尺度并行结构"],
        ["ResNet", "2015", "34~152 层", "残差连接缓解深层网络退化"],
      ],
    },
    figures: [
      { src: "/assets/course/ch3/ch3-bow.jpg", caption: "BoW：视觉词典与直方图表示" },
      { src: "/assets/course/ch3/ch3-lenet.jpg", caption: "LeNet-5 网络结构" },
      { src: "/assets/course/ch3/ch3-vgg.jpg", caption: "VGG 网络结构：小卷积核堆叠" },
    ],
  },
  {
    id: "ch4",
    order: "04",
    title: "图像语义分割",
    subtitle: "像素级密集预测",
    description:
      "从传统聚类、边缘与区域方法，到 FCN、U-Net 与 DeepLab 的编解码与空洞卷积体系。",
    status: "active",
    knowledge: [
      {
        title: "任务定义",
        points: [
          "语义分割：为每个像素赋予类别标签，属于密集预测。",
          "语义分割与实例分割的区别：后者还需区分同类不同个体。",
        ],
      },
      {
        title: "传统分割方法",
        points: [
          "聚类：K-Means、谱聚类、Mean Shift、SLIC 超像素。",
          "边缘：Roberts、Sobel、Prewitt、Canny、Laplace、LOG。",
          "区域与图论：阈值法、分水岭、图割。",
        ],
      },
      {
        title: "深度学习分割",
        points: [
          "FCN：全卷积化与跳跃连接恢复空间分辨率。",
          "U-Net：编码器-解码器与同层跳连，适合小样本医学图像。",
          "DeepLab：空洞卷积扩大感受野、ASPP 多尺度上下文、编解码融合。",
        ],
      },
    ],
    formulas: [
      {
        name: "K-Means 目标函数",
        expression: "J = Σ(k=1→K) Σ(x∈C_k) ||x − μ_k||²",
        latex: "J = \\sum_{k=1}^{K} \\sum_{x \\in C_k} \\lVert x - \\mu_k \\rVert^2",
        note: "迭代分配样本到最近簇心并更新簇心，使簇内平方误差最小。",
      },
      {
        name: "梯度幅值与方向",
        expression: "|∇I| = √(Gx² + Gy²)，θ = arctan(Gy / Gx)",
        latex: "|\\nabla I| = \\sqrt{G_x^2 + G_y^2},\\quad \\theta = \\arctan(G_y/G_x)",
        note: "Gx、Gy 为水平与垂直方向的一阶差分，用于边缘强度与方向判定。",
      },
      {
        name: "平均交并比 mIoU",
        expression: "mIoU = (1/(K+1)) · Σ(i=0→K) TP_i / (TP_i + FP_i + FN_i)",
        latex: "\\text{mIoU} = \\frac{1}{K+1}\\sum_{i=0}^{K} \\frac{TP_i}{TP_i + FP_i + FN_i}",
        note: "逐类计算交并比后取平均，是语义分割最常用的评价指标。",
      },
    ],
    table: {
      title: "分割方法对比",
      columns: ["方法", "核心思想", "优点", "局限"],
      rows: [
        ["K-Means", "按颜色/特征聚类划分像素", "实现简单、无需标注", "需指定簇数，语义不明确"],
        ["边缘检测", "利用梯度突变定位边界", "计算快、边界清晰", "难以形成闭合区域"],
        ["区域生长", "从种子点合并相似邻域", "区域完整", "对种子点与阈值敏感"],
        ["FCN", "全卷积 + 上采样逐像素预测", "端到端训练", "上采样细节较粗"],
        ["DeepLab", "空洞卷积 + ASPP 多尺度上下文", "多尺度、边界较好", "计算量较大"],
      ],
    },
    figures: [
      { src: "/assets/course/ch4/ch4-fcn.jpg", caption: "FCN：全卷积与上采样恢复分辨率" },
      { src: "/assets/course/ch4/ch4-deeplab.jpg", caption: "DeepLab：空洞卷积与 ASPP 结构" },
    ],
  },
  {
    id: "ch5",
    order: "05",
    title: "目标检测",
    subtitle: "从候选框到单阶段预测",
    description:
      "围绕类别加边界框的检测任务，梳理传统检测、两阶段 R-CNN 系列与单阶段 YOLO/SSD。",
    status: "active",
    knowledge: [
      {
        title: "基础概念",
        points: [
          "边界框两种格式：xyxy 与 xywh，注意中心点与宽高的换算。",
          "锚框、IoU 交并比与 NMS 非极大值抑制。",
          "检测挑战：类别数量、尺度变化、遮挡与环境干扰。",
        ],
      },
      {
        title: "传统检测",
        points: [
          "滑动窗口与模板匹配、选择性搜索。",
          "Viola-Jones：Haar-like 特征、积分图、AdaBoost 与级联分类器。",
          "DPM：可变形部件模型与根滤波/部件滤波。",
        ],
      },
      {
        title: "深度学习检测",
        points: [
          "两阶段：R-CNN → Fast R-CNN → Faster R-CNN（RPN）→ Mask R-CNN（RoIAlign、掩码分支、FPN）。",
          "单阶段：YOLO 系列与 SSD；YOLOv1/v2/v3 的结构演进与多尺度检测头。",
        ],
      },
      {
        title: "三代检测器与工业异常检测",
        points: [
          "第一代 Faster R-CNN：先产生候选区域再分类回归，精度高但流程长；第二代 YOLOv3：锚框 + 多尺度检测头，单次前向出结果但仍依赖 NMS。",
          "第三代 DETR 系：RT-DETR 用混合编码器与 IoU 感知查询实现实时检测，D-FINE 改为细粒度分布回归，DEIM 用更少训练轮数达到更高 AP，端到端且不再依赖手工锚框与 NMS。",
          "YOLOv8/YOLO11 是 Ultralytics 的工程集大成版本，无正式论文但已是工业事实标准；YOLOv12/v13 把注意力与超图关联引入实时检测，可作为“工程迭代”与“学术创新”两条线的对照。",
          "工业异常检测是“只给正常样本”的特殊检测分支：PatchCore 用预训练特征构建记忆库，WinCLIP 与 AdaptCLIP 借 CLIP 的图文对齐做零样本迁移，正好与第 9 章多模态内容衔接。",
          "本章下方“最新模型参考清单”已挂载 YOLOv8/YOLO11、DETR 系与 PatchCore、WinCLIP、AdaptCLIP，可按“是否有锚框 / 是否需要 NMS / 是否需要缺陷样本”三个维度做对比。",
        ],
      },
    ],
    formulas: [
      {
        name: "交并比 IoU",
        expression: "IoU = area(A ∩ B) / area(A ∪ B)",
        latex: "\\text{IoU} = \\frac{|A \\cap B|}{|A \\cup B|}",
        note: "衡量预测框与真实框的重合程度，也是 NMS 与正负样本划分的依据。",
      },
      {
        name: "边界框格式转换",
        expression: "x_c = (x1 + x2)/2，y_c = (y1 + y2)/2，w = x2 − x1，h = y2 − y1",
        latex: "x_c = \\frac{x_1+x_2}{2},\\quad y_c = \\frac{y_1+y_2}{2},\\quad w = x_2-x_1,\\quad h = y_2-y_1",
        note: "在 xyxy 与 xywh（中心点+宽高）两种表示之间换算。",
      },
      {
        name: "NMS 抑制规则",
        expression: "若 IoU(box_i, box_best) > 阈值，则丢弃 box_i",
        latex: "\\text{if } \\text{IoU}(b_i, b_{\\text{best}}) > T \\ \\text{then drop } b_i",
        note: "按置信度排序后保留最高分框，抑制同类高重合框，避免重复检测。",
      },
    ],
    table: {
      title: "两阶段与单阶段检测对比",
      columns: ["对比项", "两阶段（R-CNN 系列）", "单阶段（YOLO / SSD）"],
      rows: [
        ["检测流程", "先产生候选区域，再分类回归", "直接在特征图上预测类别与框"],
        ["精度", "较高，尤其小目标", "早期略低，后续版本已接近"],
        ["速度", "较慢", "快，适合实时场景"],
        ["典型代表", "Faster R-CNN、Mask R-CNN", "YOLOv3、SSD"],
      ],
    },
    figures: [
      { src: "/assets/course/ch5/ch5-rcnn.jpg", caption: "R-CNN 系列两阶段检测流程" },
      { src: "/assets/course/ch5/ch5-two-stage.jpg", caption: "两阶段检测结构演进" },
      { src: "/assets/course/ch5/ch5-yolov3.jpg", caption: "YOLOv3 网络结构与多尺度检测头" },
    ],
  },
  {
    id: "ch6",
    order: "06",
    title: "识别",
    subtitle: "生物特征与深度人脸识别",
    description:
      "理解识别问题的三要素，掌握指纹、虹膜、人脸等生物特征方法的流程与深度识别模型。",
    status: "active",
    knowledge: [
      {
        title: "识别问题三要素",
        points: [
          "视觉单元、语义空间与决策方式。",
          "工作模式：注册、验证（1:1）、辨识（1:N）。",
        ],
      },
      {
        title: "生物特征识别",
        points: [
          "生理特征与行为特征；可采集性、唯一性、稳定性、准确性与安全性对比。",
          "指纹：采集传感、图像增强、三级特征与细节点匹配。",
          "虹膜：定位归一化、Gabor 特征、加权海明距离、ROC 与等错误率。",
        ],
      },
      {
        title: "人脸识别",
        points: [
          "几何特征、相关匹配、子空间方法与局部特征。",
          "深度代表：DeepFace、FaceNet（Triplet Loss）、ArcFace（角度间隔）。",
          "RetinaFace 多任务检测与五关键点对齐；LBP 人脸流程。",
        ],
      },
    ],
    formulas: [
      {
        name: "海明距离",
        expression: "HD = (1/N) · Σ(i=1→N) A_i ⊕ B_i",
        latex: "\\text{HD} = \\frac{1}{N}\\sum_{i=1}^{N} A_i \\oplus B_i",
        note: "逐位异或后统计差异比例，虹膜编码匹配中常用加权海明距离。",
      },
      {
        name: "Triplet Loss",
        expression: "L = max(0, ||f(a) − f(p)||² − ||f(a) − f(n)||² + margin)",
        latex: "L = \\max(0, \\lVert f(a)-f(p)\\rVert^2 - \\lVert f(a)-f(n)\\rVert^2 + m)",
        note: "拉近同类样本对、推远异类样本对，FaceNet 用其学习 128 维嵌入。",
      },
      {
        name: "ArcFace 角度间隔",
        expression: "L = −log( e^(s·cos(θ_y + m)) / (e^(s·cos(θ_y + m)) + Σ(j≠y) e^(s·cos θ_j)) )",
        latex: "L = -\\log\\frac{e^{s\\cos(\\theta_y + m)}}{e^{s\\cos(\\theta_y + m)} + \\sum_{j \\ne y} e^{s\\cos\\theta_j}}",
        note: "在超球面上为正确类别增加角度间隔 m，增强类间可分性。",
      },
    ],
    table: {
      title: "常见生物特征对比",
      columns: ["特征", "采集方式", "稳定性", "主要挑战"],
      rows: [
        ["指纹", "光学/电容/超声波传感", "高，终身较稳定", "湿手指、磨损、按压形变"],
        ["虹膜", "近红外成像", "很高，随年龄变化小", "定位归一化、佩戴眼镜"],
        ["人脸", "摄像设备非接触采集", "中，受年龄与表情影响", "光照、姿态、遮挡与防伪"],
      ],
    },
    figures: [
      { src: "/assets/course/ch6/ch6-fingerprint.jpg", caption: "指纹细节点提取与匹配流程" },
      { src: "/assets/course/ch6/ch6-retinaface.jpg", caption: "RetinaFace 多任务人脸检测" },
      { src: "/assets/course/ch6/ch6-arcface.jpg", caption: "ArcFace 角度间隔与超球面嵌入" },
    ],
  },
  {
    id: "ch7",
    order: "07",
    title: "目标跟踪",
    subtitle: "从卡尔曼滤波到多目标关联",
    description:
      "在连续视频帧中估计目标状态：用运动模型预测、用观测更新，并把检测结果关联为稳定轨迹。",
    status: "active",
    knowledge: [
      {
        title: "任务定义",
        points: [
          "单目标跟踪给定首帧框，后续逐帧定位；多目标跟踪同时维护多条轨迹。",
          "在线跟踪只能使用当前及历史帧，离线跟踪可利用整段视频。",
          "核心难点：遮挡、尺度变化、快速运动、目标外观相似与检测漏检。",
        ],
      },
      {
        title: "卡尔曼滤波",
        points: [
          "状态包含位置与速度，用线性运动模型预测下一帧状态与协方差。",
          "用检测框作为观测修正预测，卡尔曼增益自动权衡预测与观测的可信度。",
          "过程噪声 Q 越大越相信观测，观测噪声 R 越大越依赖预测。",
        ],
      },
      {
        title: "数据关联与代表方法",
        points: [
          "把当前检测框与已有轨迹匹配，常用 IoU 代价 + 匈牙利算法。",
          "SORT 使用卡尔曼滤波与 IoU 关联；DeepSORT 增加外观嵌入减少 ID 切换。",
          "ByteTrack 利用低分检测框恢复被遮挡目标，KCF 属于相关滤波类单目标方法。",
        ],
      },
    ],
    formulas: [
      {
        name: "状态预测",
        expression: "x̂ₖ = F·xₖ₋₁，P̂ₖ = F·Pₖ₋₁·Fᵀ + Q",
        latex: "\\hat{x}_k = F x_{k-1},\\quad \\hat{P}_k = F P_{k-1} F^\\top + Q",
        note: "F 为状态转移矩阵，P 为状态协方差，Q 为过程噪声。",
      },
      {
        name: "卡尔曼增益",
        expression: "K = P̂Hᵀ(H P̂ Hᵀ + R)⁻¹",
        latex: "K = \\hat{P}H^\\top(H\\hat{P}H^\\top + R)^{-1}",
        note: "H 为观测矩阵，R 为观测噪声；增益越大越信任当前观测。",
      },
      {
        name: "状态更新",
        expression: "xₖ = x̂ₖ + K(zₖ − H x̂ₖ)",
        latex: "x_k = \\hat{x}_k + K(z_k - H\\hat{x}_k)",
        note: "z 为当前帧观测，括号内为观测与预测的残差。",
      },
    ],
    table: {
      title: "跟踪方法对比",
      columns: ["方法", "运动模型", "外观模型", "特点"],
      rows: [
        ["KCF", "相关滤波", "HOG/灰度", "速度快，适合单目标短时跟踪"],
        ["SORT", "卡尔曼滤波", "无", "结构简单、速度快，易受遮挡影响"],
        ["DeepSORT", "卡尔曼滤波", "CNN 嵌入", "减少 ID 切换，代价是额外特征计算"],
        ["ByteTrack", "卡尔曼滤波", "无", "复用低分检测框，遮挡场景更稳"],
      ],
    },
  },
  {
    id: "ch8",
    order: "08",
    title: "多目视觉",
    subtitle: "双目几何与深度估计",
    description:
      "用两个视角的视差恢复深度：从极线校正、立体匹配到 Z = f·B/d 的几何换算。",
    status: "active",
    knowledge: [
      {
        title: "双目成像几何",
        points: [
          "左右相机光心间距称为基线 B，同名点在两幅图中的水平位移称为视差 d。",
          "校正后同名点位于同一极线，只需在水平方向搜索，大幅降低匹配复杂度。",
          "视差与深度成反比：近处视差大、远处视差小。",
        ],
      },
      {
        title: "立体匹配流程",
        points: [
          "代价计算（SAD/SSD/Census）→ 代价聚合 → 视差选择 → 后处理（左右一致性检查）。",
          "弱纹理、重复纹理与遮挡区域是误匹配的主要来源。",
          "半全局匹配 SGM 通过多方向平滑约束显著提升视差质量。",
        ],
      },
      {
        title: "深度获取方式对比",
        points: [
          "被动双目成本低，但依赖纹理与光照；结构光精度高，室外强光下受限。",
          "ToF 直接测量飞行时间，帧率高但存在多径干扰；激光雷达精度最高、成本也最高。",
        ],
      },
    ],
    formulas: [
      {
        name: "视差定义",
        expression: "d = x_left − x_right",
        latex: "d = x_{\\text{left}} - x_{\\text{right}}",
        note: "校正后同名点只在水平方向存在位移。",
      },
      {
        name: "深度换算",
        expression: "Z = f · B / d",
        latex: "Z = \\frac{fB}{d}",
        note: "f 为焦距（像素），B 为基线（米），深度与视差成反比。",
      },
      {
        name: "视差精度与深度误差",
        expression: "ΔZ ≈ Z² / (f · B) · Δd",
        latex: "\\Delta Z \\approx \\frac{Z^2}{fB}\\,\\Delta d",
        note: "深度越大，同样的视差误差造成的深度误差越大。",
      },
    ],
    table: {
      title: "深度获取方式对比",
      columns: ["方式", "原理", "优点", "局限"],
      rows: [
        ["被动双目", "两视角视差", "成本低、无主动光源", "弱纹理失效、依赖标定"],
        ["结构光", "投射已知图案", "近距离精度高", "强光与远距离受限"],
        ["ToF", "测量光飞行时间", "帧率高、实时性好", "多径干扰、功耗较高"],
        ["激光雷达", "激光扫描测距", "精度高、范围远", "成本高、点云稀疏"],
      ],
    },
  },
  {
    id: "ch9",
    order: "09",
    title: "视觉问答",
    subtitle: "图文对齐与多模态推理",
    description:
      "给定图像与自然语言问题生成答案：把视觉与文本映射到同一语义空间，再做匹配与推理。",
    status: "active",
    knowledge: [
      {
        title: "任务形式",
        points: [
          "输入为图像与问题，输出为答案；答案可以是分类标签、短语或自由文本。",
          "常见类型：是否判断、物体识别、计数、属性、空间关系与场景推理。",
          "评价指标包括准确率、WUPS 与人工评估。",
        ],
      },
      {
        title: "典型流程",
        points: [
          "视觉编码：CNN/ViT 提取区域或全局特征；文本编码：RNN/Transformer 提取问题表示。",
          "多模态融合：拼接、注意力或双线性池化，把问题聚焦到相关图像区域。",
          "答案生成：分类头选择候选答案，生成式模型直接解码文本。",
        ],
      },
      {
        title: "图文对齐与前沿",
        points: [
          "CLIP 通过大规模图文对比学习，把图像与文本映射到同一嵌入空间，可做零样本分类。",
          "ViT 把图像切分为 patch 序列，用 Transformer 建模全局关系。",
          "多模态大模型把视觉编码器接入语言模型，实现开放式视觉问答。",
        ],
      },
    ],
    formulas: [
      {
        name: "余弦相似度",
        expression: "sim(a, b) = (a·b) / (||a||·||b||)",
        latex: "\\text{sim}(a,b) = \\frac{a \\cdot b}{\\lVert a \\rVert\\,\\lVert b \\rVert}",
        note: "衡量图文向量方向一致性，是跨模态检索与匹配的常用度量。",
      },
      {
        name: "缩放点积注意力",
        expression: "Attention(Q, K, V) = softmax(QKᵀ / √d_k)·V",
        latex: "\\text{Attention}(Q,K,V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
        note: "问题作为 Query，图像区域作为 Key/Value，实现问题引导的视觉聚焦。",
      },
      {
        name: "对比学习目标",
        expression: "L = −log( exp(sim(i, t⁺)/τ) / Σ_j exp(sim(i, t_j)/τ) )",
        latex: "L = -\\log\\frac{\\exp(\\text{sim}(i,t^+)/\\tau)}{\\sum_j \\exp(\\text{sim}(i,t_j)/\\tau)}",
        note: "CLIP 用同一批内的图文配对作为正样本，其余为负样本。",
      },
    ],
    table: {
      title: "视觉问答方法对比",
      columns: ["方法", "视觉表示", "融合方式", "特点"],
      rows: [
        ["VQA 基线", "CNN 全局特征", "拼接 + MLP", "结构简单，忽略空间细节"],
        ["注意力 VQA", "区域特征", "问题引导注意力", "可解释性较好"],
        ["ViLT", "Patch 序列", "单塔 Transformer", "结构紧凑、推理快"],
        ["CLIP 零样本", "ViT 图像嵌入", "图文相似度", "无需任务微调即可分类"],
      ],
    },
  },
];

export const activeChapters = chapters.filter((chapter) => chapter.status === "active");
export const plannedChapters = chapters.filter((chapter) => chapter.status === "planned");

export function findChapter(id: string | undefined): ChapterConfig | undefined {
  return chapters.find((chapter) => chapter.id === id);
}
