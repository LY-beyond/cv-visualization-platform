import { labAsset, type LabMeta } from "./types";

export const lab5: LabMeta = {
  id: "lab5",
  title: "上机实验五 · 目标检测",
  date: "2026-11",
  cover: labAsset("lab5/images/yolov3-dog.jpg"),
  tags: ["Faster R-CNN", "Mask R-CNN", "YOLO v3", "YOLO v1", "RPN", "RoIAlign", "Anchor", "NMS", "Letterbox"],
  summary:
    "四个检测项目共用一套「读结构 → 载权重 → 单 batch 前向 → 检查输出」的流程。实测结论：同一台 CPU 上 Faster R-CNN 单图 1.37 s、Mask R-CNN 2.7 s、YOLO v3 0.27 s、YOLO v1 仅前向 0.13 s；两阶段与单阶段的速度差约 5 倍。所有精度数字都限定在「官方权重在其训练分布内的推理表现」，不构成 mAP 评估。",
  goals: [
    "理解两阶段检测的 RPN、RoIAlign 与四项损失",
    "理解 Mask R-CNN 的 mask 分支与 mini-mask",
    "读懂 YOLO v3 的 Darknet-53、三尺度与 Anchor 解码",
    "实现 Letterbox 与 bbox 同步变换",
    "用置信度阈值 + NMS 完成后处理并解释其取舍",
    "比较四种检测器的结构、输出与实测开销",
  ],
  sections: [
    {
      id: "faster",
      title: "Faster R-CNN",
      paragraphs: [
        "两阶段检测：RPN 在 FPN 的 P2~P5 上生成候选框，RoIAlign 按浮点坐标做双线性采样，避免量化误差；检测头对每个 RoI 做分类与框回归。四项损失全部非零，单 batch 训练总损失 5.147046，参数最大变化 4.48×10⁻³，checkpoint 重载后权重差为 0。",
        "COCO 的 xywh 必须转成 xyxy 并裁剪、剔除无效框；category_id 不能压缩成 1~80，否则类别名会整体错位。官方 ResNet-50-FPN 权重在 dog-cycle-car.png 上输出 dog 0.9945、bicycle 0.9857 等高置信度框。",
      ],
      bullets: ["单图 CPU 耗时 1.37 s", "参数量 41,808,406", "验证范围：官方权重推理 + 单 batch 训练闭环"],
      modelIds: ["faster_rcnn"],
      caseIds: ["lab5-nms-lab"],
    },
    {
      id: "mask",
      title: "Mask R-CNN",
      paragraphs: [
        "在 Faster R-CNN 上增加 mask 分支：对每个 RoI 输出 28×28 的掩膜，mini-mask 版本在训练时只取 RoI 内的小块以降低显存。掩膜监督需要按 IoU≥0.5 把 RoI 匹配到真实实例，再裁剪缩放后逐像素计算二元交叉熵。",
        "权重校验通过后，三张图的分割结果正常；Shapes 单 batch 训练中追踪层权重变化 5.9576×10⁻⁴，重载差为 0。bool mask 在 resize 前必须先转 float32，否则 1 会被插值成 1/255。",
      ],
      bullets: ["单图 CPU 耗时 2.7 s", "参数量 64,158,584", "输出比检测多一个像素级 mask 与 mask_pixels 统计"],
      modelIds: ["mask_rcnn"],
    },
    {
      id: "yolo3",
      title: "YOLO v3",
      paragraphs: [
        "Darknet-53 全卷积主干，在 13×13 / 26×26 / 52×52 三个尺度上各铺 3 个 Anchor（共 9 个），用 FPN 式上采样拼接融合深层语义与浅层细节。解码公式为 b_x = σ(t_x)+c_x、b_w = p_w·e^{t_w}，中心偏移被 σ 限制在格子内，宽高用指数恢复。",
        "推理前先做 Letterbox：等比缩放 + 补边，并把 bbox 按 x′=s·x+p_x 同步变换；否则框还停在旧坐标系，标签分配也会落到错误网格。后处理用 obj 0.25 + NMS 0.45，dog-cycle-car 上得到 dog 0.9996、bicycle 0.9937。",
        "随机初始化的单 batch 训练 loss 173.9973，其中 loss_conf 约 199（三张图平均），占 97% 以上——3549 个预测位置绝大多数是背景，置信度项的累加掩盖了定位项。因此不能用 loss 绝对值判断模型好坏。",
      ],
      bullets: ["单图 CPU 耗时 0.27 s", "参数量 61,949,149", "输出 22~23 个框（夜间街景），需阈值与 NMS 联合调参"],
      modelIds: ["yolo_v3"],
      caseIds: ["lab5-yolo-decode", "lab5-letterbox", "lab5-nms-lab"],
    },
    {
      id: "yolov1",
      title: "YOLO v1（选做）",
      paragraphs: [
        "本项目配置 S=7、B=2、C=5，每个网格 15 维，输出张量 (1,7,7,15)。输入 (3,448,448)，demo 总损失 29.5995（box 19.2695、class 4.2092），模型参数量 86,236,831。",
        "标签编码用 int(S·x) 决定负责网格，再用 S·x − 网格号作为网格内偏移；取整截断带来最多 1/7 个网格的量化误差，把编码值解码画回原图就会出现轻微错位。三个目标落在网格 (2,4)、(4,3)、(5,2)，与打印值完全吻合。",
        "同一网格出现第二个目标时会被 `if labels[cx, cy, C] == 0` 直接丢弃；这是 7×7 固定网格的固有局限，也是 YOLO v3 引入多尺度与 Anchor 的动因。",
      ],
      bullets: ["CPU 仅前向 0.13 s", "三组随机种子的总损失 44.7981 / 45.3658 / 33.9202", "tests.py 因缺 train.csv 无法执行，属数据缺失"],
      caseIds: ["lab5-yolo-decode"],
    },
    {
      id: "compare",
      title: "四种方法对比与结论边界",
      paragraphs: [
        "两阶段把计算集中在少量候选区域上，每个 RoI 都能获得高分辨率特征，定位与分类更精细；单阶段把预测摊到所有位置，一次前向覆盖全图，速度快但每个位置的算力更少。Faster R-CNN 与 YOLO v3 在本机 5 倍的速度差正是结构差异的直接体现。",
        "参数量大不等于速度快或精度高：YOLO v1 有 86.2 M 参数，却受限于单尺度与固定网格；YOLO v3 用 61.9 M 参数配合全卷积与三尺度，取得最均衡的表现。",
        "所有实验都是小规模流程验证：mini COCO 3 张、CVAT 3 张合成图、YOLO v1 1 个样本、Shapes 2 张训练图。报告中的「精度」只指官方权重在其训练分布内的推理表现，不构成 mAP 评估。",
      ],
    },
  ],
  charts: [
    {
      sectionId: "compare",
      title: "四种检测方法的实测对比",
      source: "实验五报告 · 表 7-1（同一台 CPU 机器）",
      kind: "table",
      data: {
        columns: ["维度", "Faster R-CNN", "Mask R-CNN", "YOLO v3", "YOLO v1"],
        rows: [
          ["检测范式", "两阶段", "两阶段 + 实例分割", "单阶段", "单阶段"],
          ["主干网络", "ResNet-50 + FPN", "ResNet-101 + FPN", "Darknet-53", "自定义 mini_dense CNN"],
          ["多尺度", "FPN 的 P2–P5", "FPN 的 P2–P5", "3 个尺度（13/26/52）", "单尺度 7×7"],
          ["候选框来源", "RPN + Anchor", "RPN + Anchor", "直接回归 + 9 Anchor", "无 Anchor"],
          ["关键组件", "RoIAlign", "RoIAlign + mask 分支", "Letterbox + 多尺度解码", "网格负责 + 全连接输出"],
          ["参数量", "41,808,406", "64,158,584", "61,949,149", "86,236,831"],
          ["CPU 单图耗时", "1.37 s", "2.7 s", "0.27 s", "0.13 s（仅前向）"],
          ["验证范围", "官方权重推理 + 单 batch", "权重校验 + 三图分割 + Shapes 单 batch", "预训练推理 + 单 batch", "CPU 前向 + 损失 + 标签可视化"],
        ],
      },
    },
    {
      sectionId: "compare",
      title: "CPU 单图耗时与参数量",
      source: "实验五报告 · 表 7-1 / 图 7-1",
      kind: "bar",
      data: {
        unit: "s",
        categories: ["Faster R-CNN", "Mask R-CNN", "YOLO v3", "YOLO v1"],
        series: [{ name: "单图耗时", values: [1.37, 2.7, 0.27, 0.13] }],
      },
    },
    {
      sectionId: "compare",
      title: "同一张夜间街景图的输出对照",
      source: "实验五报告 · 表 7-2",
      kind: "table",
      data: {
        columns: ["指标", "Faster R-CNN（阈值 0.7）", "YOLO v3（obj 0.25 + NMS 0.45）"],
        rows: [
          ["输出框数", 23, 22],
          ["其中高于 0.9", 12, 8],
          ["其中高于 0.7", 23, 10],
          ["其中高于 0.5", 23, 11],
          ["person / car", "11 / 8", "12 / 8"],
          ["traffic light", 2, 0],
          ["stop sign / motorcycle", "1 / 1", "1 / 1"],
        ],
      },
    },
    {
      sectionId: "yolov1",
      title: "YOLO v1 的输入输出与损失",
      source: "实验五报告 · 表 6-1（demo 与三个随机种子）",
      kind: "table",
      data: {
        columns: ["项目", "数值"],
        rows: [
          ["输入形状", "(3, 448, 448)"],
          ["输出形状", "(1, 7, 7, 15)"],
          ["含目标的网格数", 3],
          ["demo 总损失", 29.5995],
          ["demo box / class loss", "19.2695 / 4.2092"],
          ["seed=0 总损失", "44.7981（box 34.7918，obj 0.3725，noobj 5.0322，class 4.6016）"],
          ["seed=1 总损失", "45.3658（box 32.2887，obj 0.5939，noobj 7.6370，class 4.8463）"],
          ["seed=2 总损失", "33.9202（box 22.6681，obj 0.3278，noobj 6.4254，class 4.4989）"],
          ["模型参数量", "86,236,831"],
        ],
      },
    },
    {
      sectionId: "yolov3",
      title: "YOLO v3 三张图的损失分解",
      source: "实验五报告 · 表 5-4（随机初始化 + 单 batch）",
      kind: "table",
      data: {
        columns: ["样本", "nGT", "loss_x", "loss_y", "loss_w", "loss_h", "loss_conf", "nCorrect", "召回率"],
        rows: [
          ["合成图 1", 2, 0.3308, 0.6193, 0.2919, 0.2748, 198.9916, 1, 0.5],
          ["合成图 2", 2, 0.2027, 0.2748, 0.0817, 0.6538, 197.5381, 0, 0.0],
          ["合成图 3", 2, 0.3715, 0.1368, 0.4489, 0.0185, 197.7647, 1, 0.5],
        ],
      },
    },
    {
      sectionId: "yolov3",
      title: "三个尺度的网格与预测位置",
      source: "实验五报告 · 5.4 损失分析",
      kind: "table",
      data: {
        columns: ["尺度", "网格", "每格 Anchor", "预测位置数"],
        rows: [
          ["大目标", "13×13", 3, 507],
          ["中目标", "26×26", 3, 2028],
          ["小目标", "52×52", 3, 8112],
          ["合计", "—", "9", 3549],
        ],
      },
    },
  ],
  gallery: [
    { sectionId: "faster", src: labAsset("lab5/images/frcnn-dog.jpg"), caption: "Faster R-CNN：dog / bicycle / truck 检测结果" },
    { sectionId: "faster", src: labAsset("lab5/images/frcnn-cup.jpg"), caption: "Faster R-CNN：cup1.jpg 检测结果" },
    { sectionId: "faster", src: labAsset("lab5/images/fig-frcnn-threshold.jpg"), caption: "不同阈值下候选框的保留数量" },
    { sectionId: "mask", src: labAsset("lab5/images/maskrcnn-1.jpg"), caption: "Mask R-CNN：街景实例分割（33 个实例）" },
    { sectionId: "mask", src: labAsset("lab5/images/maskrcnn-2.jpg"), caption: "Mask R-CNN：密集行人/车辆场景" },
    { sectionId: "mask", src: labAsset("lab5/images/maskrcnn-3.jpg"), caption: "Mask R-CNN：遮挡与重叠实例" },
    { sectionId: "mask", src: labAsset("lab5/images/fig-mask-stats.jpg"), caption: "掩膜像素数统计：区分大目标与小目标" },
    { sectionId: "mask", src: labAsset("lab5/images/mask-flow.jpg"), caption: "mask 分支的数据流与 RoI 对齐" },
    { sectionId: "yolo3", src: labAsset("lab5/images/yolov3-dog.jpg"), caption: "YOLO v3：dog 0.9996、truck 0.8835、bicycle 0.9937" },
    { sectionId: "yolo3", src: labAsset("lab5/images/yolov3-cup.jpg"), caption: "YOLO v3：cup 0.9996、dining table 0.5904" },
    { sectionId: "yolo3", src: labAsset("lab5/images/yolov3-eagle.jpg"), caption: "YOLO v3：单目标高置信度输出" },
    { sectionId: "yolo3", src: labAsset("lab5/images/yolov3-traffic.jpg"), caption: "YOLO v3：夜间街景 22 个框" },
    { sectionId: "yolo3", src: labAsset("lab5/images/fig-yolov3-stats.jpg"), caption: "YOLO v3 输出的类别与置信度分布" },
    { sectionId: "yolov1", src: labAsset("lab5/images/yolov1-grid.jpg"), caption: "7×7 网格与三个负责网格（红框）" },
    { sectionId: "yolov1", src: labAsset("lab5/images/yolov1-loss.jpg"), caption: "三个随机种子下四项损失分量的对比" },
    { sectionId: "yolov1", src: labAsset("lab5/images/yolov1-label.jpg"), caption: "标签可视化：真实 bbox（不是模型预测）" },
  ],
  thoughtQuestions: [
    {
      q: "YOLO v3 为什么要在三个尺度上预测？",
      a: "13×13 的格子覆盖约 32 像素，语义最强，适合大目标；52×52 的格子只覆盖约 8 像素，保留更多细节，适合小目标。单尺度要么大目标上下文不足，要么小目标被下采样抹掉。三个尺度是三个独立分支，不是把一个结果缩放三次。",
    },
    {
      q: "Anchor 的宽高如何影响预测框的初始形状？",
      a: "解码式 b_w = p_w·e^{t_w}，训练初期 t_w≈0、e^t≈1，预测框宽高近似等于 Anchor。因此 Anchor 决定先验形状与尺度，网络只学相对偏移。若 Anchor 与数据分布严重不匹配，匹配质量下降，需要学很大的偏移量，收敛变慢。",
    },
    {
      q: "Letterbox 后为什么必须同步变换 bbox？",
      a: "Letterbox 是等比缩放 + 补边的仿射变换 x′=s·x+p_x。若标签仍停在原坐标系，网络学到的回归目标就是错的；更严重的是 YOLO 依赖目标中心落在哪个网格做标签分配，坐标错位会把目标分配给错误网格，正确网格永远没有正样本。",
    },
    {
      q: "置信度阈值与 NMS 阈值分别控制什么？",
      a: "置信度阈值作用在分数上，是入口门槛：调高减少误检但增加漏检；NMS 阈值作用在框间 IoU 上，是去重强度：调低抑制更狠，可能误删相邻目标，调高则同一目标保留多个框。两者维度不同，必须分别调整。",
    },
    {
      q: "为什么一次 batch 的 loss 不能代表检测精度？",
      a: "loss 只是当前这批数据上的训练目标值，一次反向传播只让参数移动一小步。YOLO 的置信度项覆盖 3549 个位置、97% 以上由背景贡献，下降容易但与能否找出目标不是一回事。检测精度必须在独立验证集上按类别计算 P-R 曲线与 mAP。",
    },
    {
      q: "为什么 23 个框和 22 个框不能直接比较？",
      a: "两个模型的输出阈值本来就不同：Faster R-CNN 是 0.7，YOLO v3 是 obj 0.25 + NMS 0.45。把阈值统一到 0.7 后，Faster R-CNN 保留 23 个、YOLO v3 只剩 10 个。两阶段在 RoI 上做多类别判断，分数天然更自信；单阶段的 objectness 要压制数千个背景位置，分数被压得更平。",
    },
    {
      q: "YOLO v1 的 int(S·x) 取整为什么会产生错位？",
      a: "网格号由 int(S·x) 截断得到，网格内偏移为 S·x − 网格号，截断丢掉的小数最多接近 1 个网格（1/7）。把编码值解码画回原图时，这个量化误差就表现为框的轻微偏移。它不影响训练标签的一致性，但说明标签可视化不能替代预测可视化。",
    },
  ],
};
