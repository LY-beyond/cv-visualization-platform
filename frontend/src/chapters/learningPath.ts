/**
 * 学习路径：四大学习世界 → 关卡 → 前置关系 → 关联案例。
 * 关卡引用的案例 id 需与后端案例注册表一致，页面会过滤未知 id 并告警。
 */

export interface LearningCaseRef {
  chapterId: string;
  caseId: string;
  label?: string;
}

export interface LearningLevel {
  id: string;
  title: string;
  summary: string;
  task: string;
  input: string;
  output: string;
  core: string[];
  concepts: string[];
  metrics: string[];
  prerequisites: string[];
  cases: LearningCaseRef[];
}

export interface LearningWorld {
  id: string;
  title: string;
  description: string;
  levels: LearningLevel[];
}

export const learningWorlds: LearningWorld[] = [
  {
    id: "foundations",
    title: "基础视觉",
    description: "从图像表示、传统特征到几何配准，建立不依赖深度学习的视觉处理基础。",
    levels: [
      {
        id: "base-1",
        title: "认识视觉任务",
        summary: "先回答“计算机视觉在做什么”，再区分分类、分割、检测与识别四类任务。",
        task: "浏览发展时间线、方法对比与应用画廊，能说清传统方法与深度方法的差异。",
        input: "课程课件中的时间线与方法对比",
        output: "对视觉任务版图与两类方法取舍的完整认知",
        core: ["梳理发展四阶段", "对比特征来源与数据需求", "按行业归类典型应用"],
        concepts: ["视觉任务分类", "传统方法", "深度学习方法", "里程碑事件"],
        metrics: ["阶段数量", "对比维度"],
        prerequisites: [],
        cases: [
          { chapterId: "ch1", caseId: "timeline" },
          { chapterId: "ch1", caseId: "method_compare" },
          { chapterId: "ch1", caseId: "application_gallery" },
        ],
      },
      {
        id: "base-2",
        title: "图像表示与卷积",
        summary: "理解通道、灰度、HSV 与卷积、池化，掌握特征图尺寸的变化规律。",
        task: "切换图像通道，观察不同卷积核的输出，并推算输出特征图尺寸。",
        input: "示例图像与卷积核参数",
        output: "通道视图、卷积结果与输出尺寸公式",
        core: ["灰度加权", "卷积滑窗加权求和", "池化下采样", "输出尺寸计算"],
        concepts: ["RGB/HSV", "卷积核", "步长与填充", "最大/平均池化"],
        metrics: ["输出尺寸", "步长", "池化窗口"],
        prerequisites: ["base-1"],
        cases: [
          { chapterId: "ch2", caseId: "channel_viewer" },
          { chapterId: "ch2", caseId: "conv_slide" },
          { chapterId: "ch2", caseId: "pooling_demo" },
          { chapterId: "ch2", caseId: "lab2-filter-compare" },
        ],
      },
      {
        id: "base-3",
        title: "传统特征提取",
        summary: "LBP、SIFT、HOG 分别从纹理、尺度不变与梯度方向三个角度描述图像。",
        task: "比较三种特征的编码方式，判断它们各自适合什么任务。",
        input: "示例图像",
        output: "LBP 编码图、SIFT 关键点与 HOG 方向直方图",
        core: ["邻域明暗编码", "尺度空间极值检测", "梯度方向直方图统计"],
        concepts: ["光照鲁棒性", "尺度不变性", "旋转不变性", "特征维度"],
        metrics: ["关键点数量", "Cell 尺寸", "方向分箱数"],
        prerequisites: ["base-2"],
        cases: [
          { chapterId: "ch2", caseId: "lbp_demo" },
          { chapterId: "ch2", caseId: "sift_demo" },
          { chapterId: "ch2", caseId: "hog_demo" },
          { chapterId: "ch2", caseId: "lab2-edge-operators" },
        ],
      },
      {
        id: "base-4",
        title: "匹配与图像拼接",
        summary: "用特征点建立图像间对应关系，通过 RANSAC 剔除误匹配并完成全景融合。",
        task: "观察匹配连线，调整误差阈值筛选内点，解释拼接结果的接缝来源。",
        input: "两幅有重叠区域的图像",
        output: "匹配连线、内点标记、单应矩阵与全景图",
        core: ["特征描述符匹配", "最小点集估计变换", "内点统计", "重叠区域融合"],
        concepts: ["仿射变换", "单应矩阵", "RANSAC", "加权融合"],
        metrics: ["匹配数量", "内点比例", "误差阈值"],
        prerequisites: ["base-3"],
        cases: [
          { chapterId: "ch2-stitch", caseId: "feature_matching" },
          { chapterId: "ch2-stitch", caseId: "ransac_filter" },
          { chapterId: "ch2-stitch", caseId: "transform_demo" },
          { chapterId: "ch2-stitch", caseId: "stitch_preview" },
        ],
      },
    ],
  },
  {
    id: "deep-vision",
    title: "深度视觉",
    description: "从 BoW 传统分类过渡到 CNN，理解训练、评估与特征表示三个分析视角。",
    levels: [
      {
        id: "deep-1",
        title: "BoW 分类流程",
        summary: "用视觉词典把局部特征变成直方图，再交给分类器，是深度学习之前的主流分类范式。",
        task: "分步播放 BoW 流程，说明词典规模对表达力的影响。",
        input: "图像局部特征",
        output: "视觉词典、直方图表示与分类结果",
        core: ["特征提取", "K-Means 构造词典", "直方图量化", "SVM 分类"],
        concepts: ["视觉词典", "量化", "空间信息丢失"],
        metrics: ["词典规模", "当前步骤"],
        prerequisites: ["base-2"],
        cases: [{ chapterId: "ch3", caseId: "bow_animation" }, { chapterId: "ch3", caseId: "lab3-bow-explorer" }],
      },
      {
        id: "deep-2",
        title: "经典网络结构",
        summary: "LeNet-5 到 ResNet 的演进主线：小卷积核堆叠、Inception 多尺度与残差连接。",
        task: "逐层浏览网络结构，说出每个阶段解决的关键问题。",
        input: "经典 CNN 结构配置",
        output: "层组成、特征图尺寸与创新点说明",
        core: ["卷积与池化堆叠", "多尺度并行结构", "残差连接"],
        concepts: ["感受野", "参数共享", "梯度退化"],
        metrics: ["网络深度", "参数量"],
        prerequisites: ["deep-1"],
        cases: [
          { chapterId: "ch3", caseId: "cnn_structure" },
          { chapterId: "ch3", caseId: "lab3-lenet-draw" },
        ],
      },
      {
        id: "deep-3",
        title: "训练与评估",
        summary: "用训练曲线判断收敛，用混淆矩阵定位错误类别，用模型对比权衡精度与开销。",
        task: "先训练一个模型，再解释曲线分叉与混淆矩阵中的主要错误类型。",
        input: "数据集与模型超参数",
        output: "训练曲线、混淆矩阵、错误样例与模型对比",
        core: ["前向与反向传播", "损失与准确率统计", "混淆矩阵分析", "多模型对比"],
        concepts: ["过拟合", "召回率", "Top-1/Top-5", "参数量"],
        metrics: ["Loss", "准确率", "召回率", "参数量"],
        prerequisites: ["deep-2"],
        cases: [
          { chapterId: "ch3", caseId: "training_curve" },
          { chapterId: "ch3", caseId: "confusion_gallery" },
          { chapterId: "ch3", caseId: "model_compare" },
        ],
      },
      {
        id: "deep-4",
        title: "特征表示",
        summary: "把高维特征降维可视化，判断类别是否在表示空间中可分。",
        task: "对比 PCA 与 t-SNE，解释两种降维方式的差异。",
        input: "分类模型提取的特征",
        output: "二维嵌入散点图",
        core: ["特征提取", "线性/非线性降维", "按类别着色"],
        concepts: ["PCA", "t-SNE", "类别分离"],
        metrics: ["样本数量", "类别数量", "降维方法"],
        prerequisites: ["deep-3"],
        cases: [{ chapterId: "ch3", caseId: "feature_embedding" }],
      },
    ],
  },
  {
    id: "recognition-segmentation",
    title: "识别与分割",
    description: "面向像素级与目标级任务：先分割出区域，再定位并识别目标。",
    levels: [
      {
        id: "seg-1",
        title: "传统分割方法",
        summary: "K-Means、阈值与 SLIC 从颜色或灰度相似性出发划分区域，是理解分割任务的起点。",
        task: "比较聚类、阈值与超像素三种思路，说明它们各自适合的场景。",
        input: "示例图像与分割参数",
        output: "分割色块、二值掩码、超像素边界与叠加图",
        core: ["像素聚类", "阈值判定", "超像素划分", "掩码叠加"],
        concepts: ["簇数 K", "全局/自适应阈值", "超像素", "透明度"],
        metrics: ["实际迭代", "前景占比", "超像素数量"],
        prerequisites: ["base-4"],
        cases: [
          { chapterId: "ch4", caseId: "kmeans_seg" },
          { chapterId: "ch4", caseId: "threshold_compare" },
          { chapterId: "ch4", caseId: "slic_demo" },
          { chapterId: "ch4", caseId: "mask_overlay" },
          { chapterId: "ch4", caseId: "lab4-meanshift" },
          { chapterId: "ch4", caseId: "lab4-slic-player" },
        ],
      },
      {
        id: "seg-2",
        title: "边缘检测",
        summary: "Canny 用平滑、梯度、非极大值抑制与双阈值四步得到单像素宽边缘。",
        task: "调整双阈值与 σ，解释边缘断裂与噪声增多的原因。",
        input: "示例图像与阈值参数",
        output: "四阶段中间图与最终边缘图",
        core: ["高斯平滑", "梯度幅值与方向", "非极大值抑制", "双阈值连接"],
        concepts: ["梯度", "双阈值", "边缘连接"],
        metrics: ["强边缘像素", "边缘占比"],
        prerequisites: ["seg-1"],
        cases: [
          { chapterId: "ch4", caseId: "canny_steps" },
          { chapterId: "ch4", caseId: "lab4-canny-steps" },
        ],
      },
      {
        id: "seg-3",
        title: "分割网络结构",
        summary: "FCN 全卷积与上采样、U-Net 编解码跳连、DeepLab 空洞卷积与 ASPP。",
        task: "画出 FCN 与 U-Net 的结构差异，说明跳连的作用。",
        input: "分割网络结构示意",
        output: "编码器-解码器与多尺度上下文结构",
        core: ["全卷积化", "上采样恢复分辨率", "同层跳连", "空洞卷积"],
        concepts: ["密集预测", "感受野", "ASPP"],
        metrics: ["上采样倍数", "空洞率"],
        prerequisites: ["seg-2"],
        cases: [
          { chapterId: "ch4", caseId: "seg_structure" },
          { chapterId: "ch4", caseId: "onnx_segment" },
          { chapterId: "ch4", caseId: "lab4-transpose-conv" },
        ],
      },
      {
        id: "det-1",
        title: "检测基础",
        summary: "边界框表示、IoU 与 NMS 是检测任务的三块基石。",
        task: "完成框格式换算，计算两框 IoU，并解释 NMS 的抑制过程。",
        input: "边界框坐标与 IoU 阈值",
        output: "框格式、IoU 数值与抑制后的保留框",
        core: ["坐标格式换算", "交集/并集面积", "按得分排序抑制"],
        concepts: ["xyxy/xywh", "IoU", "NMS"],
        metrics: ["IoU", "保留框数量"],
        prerequisites: ["seg-1"],
        cases: [
          { chapterId: "ch5", caseId: "box_format" },
          { chapterId: "ch5", caseId: "iou_calc" },
          { chapterId: "ch5", caseId: "nms_steps" },
        ],
      },
      {
        id: "det-2",
        title: "检测流程与结果",
        summary: "两阶段与单阶段检测的流程差异，以及检测结果后处理与可视化。",
        task: "对比 R-CNN 系列与 YOLO，调整阈值观察检测框数量变化。",
        input: "示例图像与置信度/NMS 阈值",
        output: "候选框、最终检测框与类别统计",
        core: ["候选区域生成", "网格回归", "置信度过滤", "NMS 后处理"],
        concepts: ["两阶段检测", "单阶段检测", "锚框", "置信度"],
        metrics: ["候选框", "最终保留", "被抑制数量"],
        prerequisites: ["det-1"],
        cases: [
          { chapterId: "ch5", caseId: "two_stage_flow" },
          { chapterId: "ch5", caseId: "yolo_grid" },
          { chapterId: "ch5", caseId: "detect_overlay" },
          { chapterId: "ch5", caseId: "onnx_detect" },
          { chapterId: "ch5", caseId: "lab5-yolo-decode" },
          { chapterId: "ch5", caseId: "lab5-letterbox" },
          { chapterId: "ch5", caseId: "lab5-nms-lab" },
        ],
      },
    ],
  },
  {
    id: "recognition-frontier",
    title: "识别与前沿",
    description: "从生物特征识别到人脸嵌入，并延伸到跟踪、多目视觉与视觉问答。",
    levels: [
      {
        id: "rec-1",
        title: "识别模式与生物特征",
        summary: "注册、1:1 验证与 1:N 辨识是识别系统的三种基本模式，生物特征各有取舍。",
        task: "说明三种模式的判定逻辑，并从四个维度比较指纹、虹膜与人脸。",
        input: "识别流程与生物特征对比",
        output: "模式流程图与特征对比结论",
        core: ["注册建库", "距离阈值判定", "最近邻辨识", "特征属性比较"],
        concepts: ["1:1 验证", "1:N 辨识", "唯一性", "稳定性"],
        metrics: ["距离阈值", "误接受率"],
        prerequisites: ["det-2"],
        cases: [
          { chapterId: "ch6", caseId: "recognition_modes" },
          { chapterId: "ch6", caseId: "biometric_compare" },
        ],
      },
      {
        id: "rec-2",
        title: "虹膜归一化",
        summary: "把环形虹膜按极坐标展开为固定尺寸矩形，消除瞳孔缩放的影响。",
        task: "调整瞳孔半径与展开高度，观察归一化结果的变化。",
        input: "眼部图像与内外圆参数",
        output: "展开后的虹膜矩形",
        core: ["定位内外圆", "极坐标采样", "尺寸归一化"],
        concepts: ["极坐标展开", "形变归一化"],
        metrics: ["瞳孔半径", "展开高度"],
        prerequisites: ["rec-1"],
        cases: [{ chapterId: "ch6", caseId: "iris_norm" }],
      },
      {
        id: "rec-3",
        title: "人脸识别",
        summary: "关键点对齐减少姿态差异，嵌入空间让同类聚拢、异类推远，距离阈值决定接受与否。",
        task: "观察对齐效果与嵌入分布，调节距离阈值解释误接受与拒真。",
        input: "人脸图像、关键点与距离阈值",
        output: "对齐结果、嵌入散点与匹配判定",
        core: ["五点对齐", "嵌入映射", "Triplet/角度间隔", "距离阈值判定"],
        concepts: ["人脸对齐", "嵌入空间", "Triplet Loss", "阈值"],
        metrics: ["距离阈值", "同类/异类距离"],
        prerequisites: ["rec-2"],
        cases: [
          { chapterId: "ch6", caseId: "face_align" },
          { chapterId: "ch6", caseId: "face_embedding" },
          { chapterId: "ch6", caseId: "distance_match" },
        ],
      },
      {
        id: "track-1",
        title: "目标跟踪",
        summary: "卡尔曼滤波预测目标状态，匹配算法把检测框关联成轨迹，减少 ID 切换。",
        task: "观察预测轨迹与观测点的偏差，调节噪声参数解释滤波的平滑作用。",
        input: "逐帧目标中心点与噪声参数",
        output: "预测轨迹、滤波后轨迹与位置误差曲线",
        core: ["状态预测", "观测更新", "轨迹关联", "误差统计"],
        concepts: ["卡尔曼滤波", "预测与校正", "MOT", "ID 切换"],
        metrics: ["位置 RMSE", "预测步长", "噪声参数"],
        prerequisites: ["rec-3"],
        cases: [{ chapterId: "ch7", caseId: "tracking_kalman" }],
      },
      {
        id: "stereo-1",
        title: "多目视觉与深度",
        summary: "双目相机用视差反推深度，基线、焦距与视差共同决定测距精度。",
        task: "调整基线与焦距，观察视差-深度曲线的变化并解释远距离误差放大。",
        input: "左右目图像与相机参数",
        output: "视差图、深度伪彩色图与视差-深度曲线",
        core: ["立体校正", "视差计算", "三角测量", "深度换算"],
        concepts: ["针孔模型", "基线", "视差", "对极几何"],
        metrics: ["基线", "焦距", "深度范围"],
        prerequisites: ["track-1"],
        cases: [{ chapterId: "ch8", caseId: "stereo_depth" }],
      },
      {
        id: "vqa-1",
        title: "视觉问答与图文对齐",
        summary: "把图像与问题映射到同一语义空间，用相似度检索答案，是图文多模态的基础范式。",
        task: "选择不同问题，观察各类别激活强度与最终答案的变化。",
        input: "场景标签向量与问题选项",
        output: "类别激活柱状图与相似度最高的答案",
        core: ["图像特征表示", "问题特征表示", "余弦相似度", "答案选择"],
        concepts: ["ViT", "CLIP", "图文对齐", "零样本分类"],
        metrics: ["相似度", "候选类别数"],
        prerequisites: ["stereo-1"],
        cases: [{ chapterId: "ch9", caseId: "vqa_pipeline" }],
      },
    ],
  },
];

export const learningLevels: (LearningLevel & { worldId: string; worldTitle: string })[] =
  learningWorlds.flatMap((world) =>
    world.levels.map((level) => ({ ...level, worldId: world.id, worldTitle: world.title })),
  );

export function findLevel(levelId: string) {
  return learningLevels.find((level) => level.id === levelId);
}

export function levelCaseIds(level: LearningLevel): string[] {
  return level.cases.map((item) => item.caseId);
}
