/** 章节配置：导航、路由与讲解要点统一维护，新增章节只改这里。 */

export interface KnowledgeBlock {
  title: string;
  points: string[];
}

export interface ChapterConfig {
  id: string;
  order: string;
  title: string;
  subtitle: string;
  description: string;
  status: "active" | "planned";
  knowledge: KnowledgeBlock[];
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
  },
  {
    id: "ch7",
    order: "07",
    title: "目标跟踪",
    subtitle: "后续扩展",
    description: "本期不实现，导航中保留占位，后续按跟踪章节接入。",
    status: "planned",
    knowledge: [],
  },
  {
    id: "ch8",
    order: "08",
    title: "多目视觉",
    subtitle: "后续扩展",
    description: "本期不实现，导航中保留占位，后续按多目视觉章节接入。",
    status: "planned",
    knowledge: [],
  },
  {
    id: "ch9",
    order: "09",
    title: "视觉问答",
    subtitle: "后续扩展",
    description: "本期不实现，导航中保留占位，后续按视觉问答章节接入。",
    status: "planned",
    knowledge: [],
  },
];

export const activeChapters = chapters.filter((chapter) => chapter.status === "active");
export const plannedChapters = chapters.filter((chapter) => chapter.status === "planned");

export function findChapter(id: string | undefined): ChapterConfig | undefined {
  return chapters.find((chapter) => chapter.id === id);
}
