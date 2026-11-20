/**
 * 案例教学元信息：原理、核心公式、建议尝试与常见误区。
 * 放在前端维护，不改后端 schema；未配置的案例展示通用提示。
 * latex 为可选 KaTeX 表达式，缺失时回退 formula 文本。
 */

export interface CaseGuidance {
  principle: string;
  formula?: string;
  latex?: string;
  hints: string[];
  pitfalls?: string[];
}

const generic: CaseGuidance = {
  principle: "调整左侧参数后观察结果变化，把参数与指标、图像对应起来理解算法行为。",
  hints: ["先使用默认参数运行一次，记录基准结果。", "每次只改变一个参数，对比结果差异。"],
  pitfalls: ["同时改动多个参数会难以判断变化来源。"],
};

export const caseGuidance: Record<string, CaseGuidance> = {
  // 第 1 章
  timeline: {
    principle: "计算机视觉经历了从几何约束、手工特征到端到端深度学习的演进，每个阶段都对应算力与数据条件的变化。",
    hints: ["按年代顺序浏览，重点记住每个阶段的代表方法与瓶颈。"],
  },
  method_compare: {
    principle: "传统方法依赖人工设计特征与浅层分类器，深度方法通过数据驱动学习多层特征表示。",
    hints: ["对照数据需求、算力依赖与可解释性三个维度理解取舍。"],
  },
  application_gallery: {
    principle: "同一套视觉任务（分类、检测、分割、识别）在不同行业呈现不同的工程形态。",
    hints: ["先判断应用属于哪类任务，再回忆对应的经典方法与评价指标。"],
  },

  // 第 2 章
  channel_viewer: {
    principle: "图像在计算机中以通道矩阵存储；灰度化按人眼敏感度对 RGB 加权，HSV 则把颜色拆成色调、饱和度与明度。",
    formula: "Gray = 0.299·R + 0.587·G + 0.114·B",
    latex: "\\text{Gray} = 0.299R + 0.587G + 0.114B",
    hints: ["切换到灰度图，观察绿色通道权重最大带来的亮度差异。", "对比 H/S/V 通道，理解颜色与亮度的解耦。"],
    pitfalls: ["把灰度图当成简单平均，会低估绿色通道的贡献。"],
  },
  lbp_demo: {
    principle: "LBP 比较中心像素与 8 邻域的明暗关系，编码为 8 位二进制数，对整体光照变化较鲁棒。",
    formula: "LBP = Σ(p=0→7) s(g_p − g_c)·2^p",
    latex: "\\text{LBP} = \\sum_{p=0}^{7} s(g_p - g_c)\\cdot 2^p",
    hints: ["减小网格步长可以看到更多局部纹理编码。", "观察平坦区域的 LBP 编码是否接近全 0 或全 1。"],
    pitfalls: ["LBP 不具备旋转不变性，旋转后编码会明显变化。"],
  },
  sift_demo: {
    principle: "SIFT 在尺度空间寻找极值点，确定关键点位置、尺度与主方向，再生成 128 维梯度方向描述符。",
    formula: "D(x) = L(x, σ) − L(x, kσ)",
    latex: "D(x,\\sigma) = L(x,\\sigma) - L(x,k\\sigma)",
    hints: ["调大关键点上限，观察纹理丰富区域的关键点密度。"],
    pitfalls: ["关键点数量不是越多越好，弱纹理区域容易产生不稳定点。"],
  },
  hog_demo: {
    principle: "HOG 统计局部 cell 内的梯度方向直方图，再按 block 归一化，得到对光照与局部形变较鲁棒的特征。",
    formula: "|∇I| = √(Gx² + Gy²)，θ = arctan(Gy / Gx)",
    latex: "|\\nabla I| = \\sqrt{G_x^2 + G_y^2},\\quad \\theta = \\arctan(G_y/G_x)",
    hints: ["增大 cell 尺寸会降低空间分辨率但提升统计稳定性。", "方向分箱数越多，方向描述越细但特征维度越高。"],
    pitfalls: ["HOG 本身不编码颜色信息，对颜色差异不敏感。"],
  },
  conv_slide: {
    principle: "卷积核在图像上滑动，对窗口内像素加权求和，提取边缘、纹理等局部模式。",
    formula: "y[i,j] = Σ_u Σ_v w[u,v]·x[i+u, j+v] + b",
    latex: "y[i,j] = \\sum_u \\sum_v w[u,v]\\,x[i+u,j+v] + b",
    hints: ["对比 Sobel 横向与纵向核的输出，理解梯度方向。", "增大步长观察输出尺寸如何缩小。"],
    pitfalls: ["卷积核未翻转与严格数学卷积存在差异，但深度学习中的卷积通常指互相关。"],
  },
  pooling_demo: {
    principle: "池化对窗口内像素做最大值或平均值下采样，降低分辨率并增强平移鲁棒性。",
    formula: "O = ⌊(W − K) / S⌋ + 1",
    latex: "O = \\left\\lfloor \\frac{W-K}{S} \\right\\rfloor + 1",
    hints: ["对比最大池化与平均池化的输出差异。", "窗口增大后观察细节丢失情况。"],
    pitfalls: ["池化会丢失空间细节，过度下采样不利于小目标分割。"],
  },

  // 第 2 章实例：图像拼接
  feature_matching: {
    principle: "在两幅重叠图像上提取特征点并计算描述符距离，距离最小的点对作为候选匹配。",
    formula: "match = argmin_j ||d_i − d'_j||",
    latex: "\\text{match}(i) = \\arg\\min_j \\lVert d_i - d'_j \\rVert",
    hints: ["对比 SIFT 与 ORB 的匹配数量与正确率。", "增大匹配数量上限，观察误匹配是否增多。"],
    pitfalls: ["描述符距离小不等于几何一致，需要后续 RANSAC 筛选。"],
  },
  ransac_filter: {
    principle: "RANSAC 反复随机采样最小点集估计单应矩阵，用误差阈值统计内点，保留内点最多的模型。",
    formula: "||H·p_i − p'_i|| ≤ ε 时判为内点",
    latex: "\\lVert H p_i - p'_i \\rVert \\le \\varepsilon",
    hints: ["减小误差阈值，观察内点数量与估计稳定性。", "增大迭代次数，提高找到正确模型的概率。"],
    pitfalls: ["阈值过小会导致内点不足，过大则把误匹配也纳入模型。"],
  },
  transform_demo: {
    principle: "用齐次坐标矩阵描述平移、旋转与缩放，把几何变换统一为矩阵乘法。",
    formula: "[x'; y'; 1] = [[a, b, tx], [c, d, ty], [0, 0, 1]] · [x; y; 1]",
    latex: "\\begin{bmatrix} x' \\\\ y' \\\\ 1 \\end{bmatrix} = \\begin{bmatrix} a & b & t_x \\\\ c & d & t_y \\\\ 0 & 0 & 1 \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\\\ 1 \\end{bmatrix}",
    hints: ["先只平移，再叠加旋转，观察变换顺序的影响。"],
    pitfalls: ["矩阵乘法不可交换，先旋转后平移与先平移后旋转结果不同。"],
  },
  stitch_preview: {
    principle: "按估计的单应矩阵把图像变换到同一坐标系，再在重叠区域做权重融合，得到全景图。",
    hints: ["观察重叠区域是否存在接缝或鬼影。", "结合 RANSAC 内点数量判断配准质量。"],
    pitfalls: ["重叠区域过小或无纹理时，单应估计容易失败。"],
  },

  // 第 3 章
  bow_animation: {
    principle: "BoW 先用局部特征聚类构造视觉词典，再把图像量化为词典直方图，最后交给分类器。",
    formula: "hist[k] = #(desc → cluster k) / #desc",
    latex: "\\text{hist}[k] = \\frac{\\#\\{\\text{desc} \\to k\\}}{\\#\\text{desc}}",
    hints: ["逐步播放，观察词典构造与直方图量化的对应关系。", "增大词典规模，观察表达力与计算量的变化。"],
    pitfalls: ["直方图表示丢失空间信息，同类不同布局的图像可能难以区分。"],
  },
  model_compare: {
    principle: "在同一数据集上比较不同模型的准确率、参数量与混淆矩阵，理解容量与性能的权衡。",
    formula: "Top-1 Acc = 正确分类样本数 / 总样本数",
    latex: "\\text{Acc} = \\frac{\\#\\text{correct}}{N}",
    hints: ["先比较准确率，再看参数量与推理开销。", "查看混淆矩阵中最低召回类别。"],
    pitfalls: ["只看总体准确率会掩盖类别不平衡问题。"],
  },
  training_curve: {
    principle: "训练曲线反映损失与准确率随 epoch 的变化，用于判断收敛、过拟合与欠拟合。",
    formula: "L = −Σ y_k·log(p_k)",
    latex: "L = -\\sum_k y_k \\log p_k",
    hints: ["观察训练与验证曲线是否出现分叉。", "结合学习率判断震荡或收敛过慢。"],
    pitfalls: ["验证集过小会导致曲线抖动，不应据此过早下结论。"],
  },
  confusion_gallery: {
    principle: "混淆矩阵按真实类别与预测类别统计样本数，错误样例帮助定位模型的具体失败模式。",
    hints: ["先看对角线亮度，再看非对角线的集中区域。", "结合错误样图判断是数据问题还是模型问题。"],
    pitfalls: ["类别样本数差异大时，计数矩阵不如归一化矩阵直观。"],
  },
  feature_embedding: {
    principle: "把高维分类特征降维到二维并着色，观察同类是否聚拢、异类是否分离。",
    formula: "t-SNE：最小化高维与低维相似度分布的 KL 散度",
    latex: "KL(P \\Vert Q) = \\sum_{i\\ne j} p_{ij} \\log \\frac{p_{ij}}{q_{ij}}",
    hints: ["对比 t-SNE 与 PCA 的分布形态。", "观察类别簇之间是否存在明显重叠。"],
    pitfalls: ["t-SNE 的簇间距离不具严格物理意义，不能直接比较簇的远近。"],
  },
  cnn_structure: {
    principle: "CNN 通过卷积、激活与池化逐层提取特征，感受野随深度增加而扩大。",
    formula: "O = ⌊(W − K + 2P) / S⌋ + 1",
    latex: "O = \\left\\lfloor \\frac{W - K + 2P}{S} \\right\\rfloor + 1",
    hints: ["逐层查看特征图尺寸与通道数的变化。"],
    pitfalls: ["只看网络深度而忽略感受野与下采样倍数，容易误判特征表达能力。"],
  },

  // 第 4 章
  kmeans_seg: {
    principle: "K-Means 把像素颜色向量聚成 K 类，迭代更新簇心直至收敛，用簇标签生成分割结果。",
    formula: "J = Σ_k Σ(x∈C_k) ||x − μ_k||²",
    latex: "J = \\sum_{k=1}^{K} \\sum_{x \\in C_k} \\lVert x - \\mu_k \\rVert^2",
    hints: ["K 取 2~4 时观察主要色块是否完整。", "增大迭代轮数，观察相邻帧是否趋于稳定。"],
    pitfalls: ["K 过大导致区域碎片化，K 过小会把不同目标合并。"],
  },
  canny_steps: {
    principle: "Canny 依次做高斯平滑、梯度计算、非极大值抑制与双阈值边缘连接，得到单像素宽边缘。",
    formula: "|∇I| = √(Gx² + Gy²)，θ = arctan(Gy / Gx)",
    latex: "|\\nabla I| = \\sqrt{G_x^2 + G_y^2}",
    hints: ["低阈值降低会保留更多弱边缘与噪声。", "高阈值与低阈值比例失衡时边缘容易断裂。"],
    pitfalls: ["σ 过大会抹掉细节，过小则抑制不了噪声。"],
  },
  threshold_compare: {
    principle: "阈值分割把灰度高于阈值的像素判为前景；固定阈值、双峰法、迭代法与自适应法适应不同光照条件。",
    formula: "g(x) = 255 if f(x) > T else 0",
    latex: "g(x) = \\begin{cases} 255 & f(x) > T \\\\ 0 & \\text{otherwise} \\end{cases}",
    hints: ["先把固定阈值移到双峰之间，再对比其他方法。"],
    pitfalls: ["全局阈值在光照不均时容易失效，应改用自适应阈值。"],
  },
  slic_demo: {
    principle: "SLIC 在颜色与 xy 空间中做局部 K-Means，生成大小均匀、边界贴合的超像素。",
    formula: "d = √((ΔLab)² + (m/S)²·(Δxy)²)",
    latex: "d = \\sqrt{(\\Delta L_{ab})^2 + \\left(\\frac{m}{S}\\right)^2 (\\Delta xy)^2}",
    hints: ["增大超像素数量，观察边界贴合度。", "增大紧凑度，观察超像素是否更规则。"],
    pitfalls: ["超像素不是语义分割结果，仍需后续聚类或分类。"],
  },
  seg_structure: {
    principle: "FCN 用全卷积与上采样恢复分辨率；U-Net 通过编码器-解码器与同层跳连融合细节。",
    hints: ["重点观察跳跃连接如何把浅层细节送入解码器。"],
    pitfalls: ["上采样不等于恢复原始细节，缺失的跳连会造成边界模糊。"],
  },
  mask_overlay: {
    principle: "把分割掩码按类别着色并以一定透明度叠加到原图，便于检查边界与漏检。",
    formula: "out = (1 − α)·img + α·color(mask)",
    latex: "\\text{out} = (1-\\alpha)\\,\\text{img} + \\alpha\\,\\text{color}(\\text{mask})",
    hints: ["调整透明度，观察掩码边界与目标轮廓是否吻合。"],
    pitfalls: ["透明度过高会掩盖原图细节，过低则看不清掩码。"],
  },

  // 第 5 章
  box_format: {
    principle: "边界框有 xyxy 与 xywh 两种常见表示，xywh 以中心点与宽高描述框。",
    formula: "cx = (x1 + x2)/2，cy = (y1 + y2)/2，w = x2 − x1，h = y2 − y1",
    latex: "c_x = \\frac{x_1+x_2}{2},\\quad w = x_2 - x_1",
    hints: ["切换格式，观察同一框的数值如何换算。"],
    pitfalls: ["x/y 表示左上角还是中心点，需与具体框架约定对齐。"],
  },
  iou_calc: {
    principle: "IoU 用交集面积除以并集面积衡量两个框的重叠程度，是检测评价与 NMS 的基础。",
    formula: "IoU = area(A ∩ B) / area(A ∪ B)",
    latex: "\\text{IoU} = \\frac{|A \\cap B|}{|A \\cup B|}",
    hints: ["让两个框部分重叠，观察 IoU 从 0 增大的过程。"],
    pitfalls: ["IoU 对目标尺度不敏感，小目标轻微偏移就会显著下降。"],
  },
  nms_steps: {
    principle: "NMS 按置信度排序，保留最高分框并抑制与其 IoU 超过阈值的同类框。",
    formula: "若 IoU(box, kept) > T 则抑制 box",
    latex: "\\text{keep}(b) = \\text{IoU}(b, b_{\\text{kept}}) \\le T",
    hints: ["降低 IoU 阈值会抑制更多重叠框。", "观察同类密集目标是否被误抑制。"],
    pitfalls: ["阈值过高导致重复框残留，过低会误删相邻目标。"],
  },
  two_stage_flow: {
    principle: "两阶段检测先生成候选区域，再对每个区域做分类与框回归，精度高但速度较慢。",
    hints: ["按流程顺序观察候选区域如何被筛选与精修。"],
    pitfalls: ["候选区域质量直接决定最终精度，RPN 阈值很关键。"],
  },
  yolo_grid: {
    principle: "YOLO 把图像划分为网格，每个网格直接回归边界框与类别置信度，实现单阶段检测。",
    formula: "confidence = Pr(object) × IoU(pred, truth)",
    latex: "\\text{conf} = \\Pr(\\text{object}) \\times \\text{IoU}_{\\text{pred}}^{\\text{truth}}",
    hints: ["减小网格尺寸，观察定位精度与召回的变化。"],
    pitfalls: ["网格过粗时密集小目标容易落在同一格而漏检。"],
  },
  detect_overlay: {
    principle: "检测器输出候选框与类别得分，经置信度过滤与非极大值抑制后绘制到原图。",
    formula: "keep = {b | score(b) ≥ conf}，再做 NMS(IoU ≤ T)",
    latex: "\\text{keep} = \\{b \\mid s(b) \\ge \\tau_{\\text{conf}}\\}",
    hints: ["降低置信度阈值，观察低分框与误检是否增多。", "提高 NMS IoU 阈值，观察重复框是否残留。"],
    pitfalls: ["阈值过低会引入大量误检，过高会漏掉遮挡目标。"],
  },

  // 第 6 章
  recognition_modes: {
    principle: "识别分为注册、1:1 验证与 1:N 辨识；验证比较距离阈值，辨识取最近邻并判定是否通过阈值。",
    formula: "accept = d(probe, gallery) ≤ T",
    latex: "\\text{accept} = d(x_{\\text{probe}}, x_{\\text{gallery}}) \\le T",
    hints: ["对比验证与辨识的判定逻辑差异。"],
    pitfalls: ["1:N 辨识中库规模增大会提高误接受概率。"],
  },
  biometric_compare: {
    principle: "指纹、虹膜、人脸等生物特征在可采集性、唯一性、稳定性与安全性上各有取舍。",
    hints: ["从四个维度横向比较，形成选择依据。"],
  },
  iris_norm: {
    principle: "虹膜呈环形，需按极坐标展开为固定尺寸矩形，消除瞳孔缩放带来的形变。",
    formula: "I(r,θ) → I_norm(x, y), r ∈ [r_pupil, r_iris]",
    latex: "I(r,\\theta) \\to I_{\\text{norm}}(x,y)",
    hints: ["调整瞳孔半径，观察展开图的上下边界变化。"],
    pitfalls: ["内外圆定位不准会引入大量睫毛与眼睑噪声。"],
  },
  face_embedding: {
    principle: "人脸识别把图像映射到嵌入空间，同类距离小、异类距离大，Triplet 与角度间隔损失强化这一性质。",
    formula: "L = max(0, ||f(a) − f(p)||² − ||f(a) − f(n)||² + margin)",
    latex: "L = \\max(0, \\lVert f(a)-f(p)\\rVert^2 - \\lVert f(a)-f(n)\\rVert^2 + m)",
    hints: ["观察同类簇是否聚拢、异类簇是否分离。"],
    pitfalls: ["嵌入空间的可视化受降维方法影响，不能直接当作真实距离。"],
  },
  face_align: {
    principle: "依据双眼、鼻尖与嘴角五个关键点做相似变换，把人脸对齐到标准姿态，减少姿态差异。",
    hints: ["观察对齐前后关键点位置与图像姿态变化。"],
    pitfalls: ["关键点检测失败时，硬对齐会引入更大形变。"],
  },
  distance_match: {
    principle: "匹配判定依赖距离阈值：阈值越小越严格，误接受少但可能拒真。",
    formula: "accept if d ≤ T",
    latex: "\\text{accept} \\iff d \\le T",
    hints: ["调整阈值，观察接受与拒绝的分界变化。"],
    pitfalls: ["单一全局阈值难以同时满足所有个体的类内差异。"],
  },

  // 第 4~5 章 浏览器端推理
  onnx_segment: {
    principle: "在浏览器内用 ONNX Runtime 运行分割模型：图像先缩放到固定尺寸并归一化，模型逐像素输出类别，取最大值得到掩码后按调色板叠加。",
    formula: "label(p) = argmax_c logits[c, p]",
    latex: "\\text{label}(p) = \\arg\\max_c \\text{logits}[c,p]",
    hints: ["先观察默认示例图的分割结果，再上传自己的图像。", "模型文件缺失时会自动回退到后端示例结果。"],
    pitfalls: ["输入尺寸与归一化参数必须与模型训练时一致，否则输出会明显偏移。"],
  },
  onnx_detect: {
    principle: "检测模型输出候选框、类别得分与位置偏移，经置信度过滤和 NMS 后映射回原图坐标。",
    formula: "keep = NMS(score ≥ τ_conf, IoU ≤ τ_nms)",
    latex: "\\text{keep} = \\text{NMS}\\left(\\{b \\mid s(b) \\ge \\tau_{\\text{conf}}\\},\\, \\tau_{\\text{nms}}\\right)",
    hints: ["降低置信度阈值观察低分框是否增多。", "提高 NMS 阈值观察重叠目标是否被误抑制。"],
    pitfalls: ["letterbox 填充比例换算出错时，框会整体偏移。"],
  },

  // 第 7~9 章
  tracking_kalman: {
    principle: "卡尔曼滤波用匀速运动模型预测下一帧状态，再用观测值校正预测，得到平滑且稳定的轨迹。",
    formula: "x_k = x̂_k + K(z_k − H·x̂_k)",
    latex: "x_k = \\hat{x}_k + K(z_k - H\\hat{x}_k)",
    hints: ["增大观测噪声会削弱校正强度，轨迹更平滑但滞后。", "对比预测轨迹与观测点的偏差，理解增益的作用。"],
    pitfalls: ["运动模型与实际运动不符时，预测误差会持续累积。"],
  },
  stereo_depth: {
    principle: "校正后的双目图像中，同名点只在水平方向存在视差，深度与视差成反比。",
    formula: "Z = f·B / d",
    latex: "Z = \\frac{fB}{d}",
    hints: ["调整基线或焦距，观察同一视差对应的深度变化。", "注意远距离处深度误差被显著放大。"],
    pitfalls: ["视差为 0 或过小时无法求深度，远距离区域通常缺失。"],
  },
  vqa_pipeline: {
    principle: "视觉问答把图像内容编码为标签向量、问题编码为语义向量，用余弦相似度选择最匹配的答案。",
    formula: "sim(a, b) = (a·b) / (||a||·||b||)",
    latex: "\\text{sim}(a,b) = \\frac{a \\cdot b}{\\lVert a \\rVert\\,\\lVert b \\rVert}",
    hints: ["切换不同问题，观察各类别激活强度的变化。", "对比相似度最高的类别与预期答案是否一致。"],
    pitfalls: ["简化模型只考察语义相似度，不包含真实的空间关系推理。"],
  },

  // 上机实验转化的案例
  "lab2-filter-compare": {
    principle: "椒盐噪声是极端的 0/255 值。线性滤波用邻域加权平均稀释噪声，中值滤波排序后取中间值，能把孤立极值直接排除。",
    formula: "PSNR = 10·log10(255² / MSE)",
    latex: "\\text{PSNR} = 10\\log_{10}\\frac{255^2}{\\text{MSE}}",
    hints: ["固定核大小 3×3，逐渐增大噪声比例，观察三种滤波 PSNR 的差距。", "把核增大到 7×7，比较 PSNR 与细节损失。"],
    pitfalls: ["PSNR 只看像素误差，过度平滑也能得到较高 PSNR，但细节已被抹掉。"],
  },
  "lab2-edge-operators": {
    principle: "四种算子分别用一阶或二阶差分响应灰度变化。Roberts 用 2×2 交叉差分，Prewitt/Sobel 用 3×3 平滑差分，Laplacian 是二阶导。",
    formula: "G = |Gx| + |Gy|",
    latex: "G = |G_x| + |G_y|",
    hints: ["把 sigma 从 0 调到 1.5，观察噪声敏感度下降与边缘变粗。", "提高二值阈值，看四算子的边缘占比如何变化。"],
    pitfalls: ["微分结果可能为负，必须用 CV_32F/CV_16S 保存后再取绝对值，否则会截断。"],
  },
  "lab3-bow-explorer": {
    principle: "BoVW 把局部描述子量化到视觉词典，统计直方图后用 SVM 分类。单特征强弱决定上限，联合特征只有互补时才有收益。",
    formula: "hist[k] = count(quantize(d) = k),  k = 1..K",
    hints: ["在柱状图里切换特征，对照 69.05% 与 42.86% 的差距。", "观察 k 从 25 增到 200 时 SIFT 的收益递减。"],
    pitfalls: ["联合弱特征不会提升准确率：SIFT+ORB 只有 60.48%，低于最佳单特征。"],
  },
  "lab3-lenet-draw": {
    principle: "LeNet-5 用两层卷积与平均池化逐层提取笔画特征，再由三层全连接输出 10 类概率；实验三教师模型在 MNIST 测试集上达到 98.12%。",
    formula: "p_k = e^(z_k) / Σ(j=1→10) e^(z_j)",
    latex: "p_k = \\frac{e^{z_k}}{\\sum_{j=1}^{10} e^{z_j}}",
    hints: [
      "先写一个居中的 0~9，保持笔画粗细与 MNIST 接近。",
      "同一个数字分别用「MNIST 原图」与「自动整理笔画」识别，对比概率差异。",
      "故意写偏或写出边界，观察高置信度误判。",
    ],
    pitfalls: [
      "高概率不等于正确：实验三中一张「9」以 99.87% 置信度被判为「4」。",
      "预处理与训练分布不一致时（例如笔画过细、白底黑字未反色），准确率会明显下降。",
    ],
  },
  "lab4-meanshift": {
    principle: "Mean Shift 把每个样本作为初始中心，反复移动到半径邻域内的均值，直到位移小于阈值；无需预设簇数。",
    formula: "c^(t+1) = mean{ x_j : ‖x_j − c^(t)‖ ≤ r }",
    latex: "c^{(t+1)} = \\frac{1}{|N(c^{(t)})|}\\sum_{x \\in N(c^{(t)})} x",
    hints: ["半径从 1 慢慢加到 8，记录中心数每次减少的位置。", "观察轨迹线：半径越大，轨迹越短、合并越早。"],
    pitfalls: ["半径过大时不同簇会被一次平均合并，中心数骤减；这不是算法失败，而是尺度不匹配。"],
  },
  "lab4-slic-player": {
    principle: "SLIC 在五维空间 (x, y, L, a, b) 做局部 K-Means，距离由颜色项与空间项加权组成。",
    formula: "D² = D_c²/M² + D_s²/S²",
    latex: "D^2 = \\frac{D_c^2}{M^2} + \\frac{D_s^2}{S^2}",
    hints: ["在同一次回放中盯住帽檐与头发，看边界如何逐轮贴合。", "切换 M=5，对比最终边界的规则程度。"],
    pitfalls: ["M 越小并不总是越好：边界贴合颜色但形状细长，圆形度只有 0.128。"],
  },
  "lab4-canny-steps": {
    principle: "Canny 依次做高斯平滑、梯度计算、非极大值抑制、双阈值与滞后连接，目标是单像素宽、位置准确的闭合边缘。",
    formula: "M = √(Gx² + Gy²)，θ = atan2(Gy, Gx)",
    latex: "M = \\sqrt{G_x^2 + G_y^2},\\quad \\theta = \\operatorname{atan2}(G_y, G_x)",
    hints: ["把 sigma 调到 0.3，观察噪声如何在 NMS 后大量残留。", "只改高阈值，观察强边缘数量的变化。"],
    pitfalls: ["NMS 必须沿梯度方向比较幅值；用角度值代替幅值是比较常见的实现错误。"],
  },
  "lab4-transpose-conv": {
    principle: "转置卷积把输入元素乘以卷积核后按 stride 摆放，重叠位置相加；输出尺寸由 H·s + max(k−s, 0) 决定。",
    formula: "H_out = H_in·s + max(k − s, 0)",
    latex: "H_{out} = H_{in}\\cdot s + \\max(k - s, 0)",
    hints: ["固定 s=2，把 k 从 1 加到 3，观察输出何时开始重叠。", "把输入 d 改为 0，看非零元素与元素和如何变化。"],
    pitfalls: ["转置卷积不是卷积的逆运算，它只保证形状关系，不恢复原始像素。"],
  },
  "lab5-yolo-decode": {
    principle: "YOLO v3 用 σ(t) 把中心偏移限制在负责网格内，用指数恢复相对于 Anchor 的宽高。",
    formula: "b_x = σ(t_x) + c_x，b_w = p_w·e^{t_w}",
    latex: "b_x = \\sigma(t_x) + c_x,\\quad b_w = p_w e^{t_w}",
    hints: ["把 tx 从 −2 拉到 2，观察中心在格子内移动但不会跨格。", "只改 tw，观察框宽按指数变化。"],
    pitfalls: ["把 tx/ty 当成绝对坐标会得到越界框；它们始终是相对网格的偏移。"],
  },
  "lab5-letterbox": {
    principle: "Letterbox 等比缩放并补边到正方形输入，框坐标必须用同一组 (s, pad) 变换，否则标签会错位。",
    formula: "x′ = s·x + p_x，s = min(W_t/W, H_t/H)",
    latex: "x' = s\\cdot x + p_x,\\quad s = \\min(W_t/W,\\, H_t/H)",
    hints: ["把目标尺寸改成 640，观察补边减少、框尺寸变大。", "对比两张图中的框：位置比例应保持一致。"],
    pitfalls: ["只缩放图像不改 bbox，会让目标落到错误网格，训练标签完全失效。"],
  },
  "lab5-nms-lab": {
    principle: "后处理先用置信度阈值筛掉低分框，再对同类框按分数排序做 NMS，抑制 IoU 超过阈值的重复框。",
    formula: "keep = {b_i : IoU(b_i, b_j) < τ, score_i ≤ score_j}",
    latex: "\\text{keep} = \\{b_i : \\operatorname{IoU}(b_i,b_j) < \\tau\\}",
    hints: ["固定 IoU=0.45，逐步提高置信度阈值，观察保留数与类别分布。", "把 IoU 降到 0.1，观察相邻目标是否被误删。"],
    pitfalls: ["置信度阈值与 NMS 阈值作用在不同维度，不能互相替代；报告中的 23 与 22 不能直接比较，因为阈值不同。"],
  },
};

export function getGuidance(caseId: string): CaseGuidance {
  return caseGuidance[caseId] ?? generic;
}
