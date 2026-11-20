import { useState } from "react";

import type { CaseMeta } from "../../api/types";
import CaseFrame from "../CaseFrame";

interface TimelineEvent {
  year: string;
  title: string;
  tag: string;
  detail: string;
}

const EVENTS: TimelineEvent[] = [
  { year: "1959", title: "感受野发现", tag: "生物学启发", detail: "Hubel 与 Wiesel 发现猫视觉皮层神经元只对局部区域刺激响应，为卷积的局部感受野思想奠定基础。" },
  { year: "1963", title: "Roberts 边缘检测", tag: "早期算子", detail: "Roberts 用 2×2 差分算子提取边缘，标志计算机视觉从图像处理走向自动分析。" },
  { year: "1980", title: "Neocognitron", tag: "卷积雏形", detail: "Fukushima 提出层级化的 Neocognitron，用简单细胞与复杂细胞交替结构实现位移不变识别。" },
  { year: "1989", title: "LeNet 与反向传播", tag: "CNN 落地", detail: "LeCun 将卷积网络与反向传播结合用于手写邮编识别，形成现代 CNN 的基本结构。" },
  { year: "1999", title: "SIFT 特征", tag: "手工特征", detail: "Lowe 提出尺度不变特征变换，在尺度、旋转与部分光照变化下保持稳定，成为匹配与拼接的经典方法。" },
  { year: "2001", title: "Viola-Jones 人脸检测", tag: "实时检测", detail: "积分图 + Haar 特征 + AdaBoost 首次实现普通硬件上的实时人脸检测。" },
  { year: "2006", title: "HOG 行人检测", tag: "梯度描述", detail: "Dalal 与 Triggs 提出方向梯度直方图，配合 SVM 在行人检测上取得突破。" },
  { year: "2012", title: "AlexNet", tag: "深度学习爆发", detail: "AlexNet 在 ImageNet 上将 Top-5 错误率大幅降至 15.3%，GPU 训练与 ReLU、Dropout 成为标配。" },
  { year: "2015", title: "ResNet 残差网络", tag: "超深网络", detail: "残差连接缓解梯度消失，使上百层的网络可稳定训练，ImageNet Top-5 错误率降至约 3.6%。" },
  { year: "2017", title: "Mask R-CNN", tag: "统一检测分割", detail: "在 Faster R-CNN 上增加掩码分支与 RoIAlign，同时完成检测、分类与实例分割。" },
  { year: "2020", title: "ViT 视觉 Transformer", tag: "新范式", detail: "把图像切分为 patch 序列输入 Transformer，在大规模数据上取得与 CNN 相当甚至更优的效果。" },
];

export function Timeline({ meta }: { meta: CaseMeta }) {
  const [selected, setSelected] = useState(EVENTS.length - 1);
  const event = EVENTS[selected];

  return (
    <CaseFrame meta={meta}>
      <div className="overflow-x-auto pb-2">
        <div className="relative flex min-w-[760px] items-start gap-2 pt-6">
          <div className="absolute left-4 right-4 top-[42px] h-0.5 bg-slate-200 dark:bg-slate-700" />
          {EVENTS.map((item, index) => (
            <button
              key={item.year}
              type="button"
              onClick={() => setSelected(index)}
              className="group relative flex flex-1 flex-col items-center gap-2"
            >
              <span className="font-mono text-[11px] text-slate-400">{item.year}</span>
              <span
                className={[
                  "z-10 h-3.5 w-3.5 rounded-full border-2 transition-colors",
                  index === selected
                    ? "border-brand-600 bg-brand-600"
                    : "border-slate-300 bg-white group-hover:border-brand-400 dark:border-slate-600 dark:bg-slate-900",
                ].join(" ")}
              />
              <span
                className={[
                  "px-1 text-center text-[11px] leading-tight",
                  index === selected ? "text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400",
                ].join(" ")}
              >
                {item.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-brand-600">{event.year}</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{event.title}</span>
          <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">{event.tag}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{event.detail}</p>
      </div>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        点击时间轴节点查看对应里程碑。整体脉络是：生物学启发 → 手工特征 → 深度学习 → 注意力与多任务统一。
      </p>
    </CaseFrame>
  );
}

interface Dimension {
  name: string;
  traditional: string;
  deep: string;
  note: string;
}

const DIMENSIONS: Dimension[] = [
  { name: "数据需求", traditional: "小样本即可工作", deep: "通常需要大量标注数据", note: "传统方法依靠人工设计的先验，几百张图也能起步；深度学习依赖数据规模，但可用预训练与数据增强缓解。" },
  { name: "特征来源", traditional: "人工设计（SIFT、HOG、LBP）", deep: "端到端自动学习", note: "特征工程需要领域知识且难以迁移；深度网络从数据中逐层学习边缘、纹理到语义。" },
  { name: "硬件成本", traditional: "CPU 即可运行", deep: "训练依赖 GPU", note: "传统算法计算量小、部署轻量；深度模型训练成本高，但推理可在边缘设备量化部署。" },
  { name: "可解释性", traditional: "较强，每步有明确含义", deep: "较弱，多为黑盒", note: "传统流程可逐环节排查；深度模型常用 Grad-CAM 等可视化手段辅助解释。" },
  { name: "泛化能力", traditional: "换场景往往需要重新调参", deep: "数据充足时跨场景能力更强", note: "传统特征对光照、视角变化敏感；深度模型借助大规模预训练获得更好的迁移能力。" },
  { name: "典型代表", traditional: "SIFT、HOG、SVM、BoW", deep: "AlexNet、ResNet、ViT", note: "两类方法并非完全替代：小数据、强实时、可解释场景中传统方法仍有价值。" },
];

export function MethodCompare({ meta }: { meta: CaseMeta }) {
  const [selected, setSelected] = useState(0);
  const dimension = DIMENSIONS[selected];

  return (
    <CaseFrame meta={meta}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-400 dark:border-slate-700">
              <th className="py-2 pr-3 font-medium">对比维度</th>
              <th className="px-3 py-2 font-medium">传统方法</th>
              <th className="px-3 py-2 font-medium">深度学习方法</th>
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map((item, index) => (
              <tr
                key={item.name}
                onClick={() => setSelected(index)}
                className={[
                  "cursor-pointer border-b border-slate-100 transition-colors dark:border-slate-800",
                  index === selected ? "bg-brand-50 dark:bg-brand-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                ].join(" ")}
              >
                <td className="py-2 pr-3 font-medium text-slate-700 dark:text-slate-200">{item.name}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.traditional}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.deep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{dimension.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{dimension.note}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
          <p className="text-xs text-slate-400">适合传统方法</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">样本少、算力受限、需要可解释的工业与嵌入式场景</p>
        </div>
        <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
          <p className="text-xs text-slate-400">适合深度学习方法</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">数据充足、场景复杂、追求端到端精度的任务</p>
        </div>
      </div>
    </CaseFrame>
  );
}

interface Application {
  name: string;
  detail: string;
  pipeline: string[];
}

interface GalleryCategory {
  id: string;
  name: string;
  summary: string;
  applications: Application[];
}

const CATEGORIES: GalleryCategory[] = [
  {
    id: "industry",
    name: "工业质检",
    summary: "替代人工目检，追求高召回与稳定节拍。",
    applications: [
      { name: "表面缺陷检测", detail: "检测划痕、脏污、凹陷等缺陷，通常结合分割网络定位缺陷区域。", pipeline: ["线阵相机采集", "ROI 裁剪", "分割模型", "缺陷分类与复判"] },
      { name: "装配完整性检查", detail: "判断零件是否漏装、错装，常用检测与关键点定位配合规则校验。", pipeline: ["固定工位成像", "目标检测", "位置规则判断", "剔除与报警"] },
      { name: "字符识别 OCR", detail: "识别喷码、铭牌与包装文字，需处理低对比度与曲面形变。", pipeline: ["图像矫正", "文本检测", "字符识别", "结果校验"] },
    ],
  },
  {
    id: "traffic",
    name: "智能交通",
    summary: "面向道路场景的检测、跟踪与结构化分析。",
    applications: [
      { name: "车牌识别", detail: "定位车牌、矫正透视并识别字符，是卡口与停车场的基础能力。", pipeline: ["车辆检测", "车牌定位", "透视矫正", "字符识别"] },
      { name: "行人车辆检测", detail: "为自动驾驶与辅助驾驶提供感知结果，需兼顾精度与实时性。", pipeline: ["多尺度特征", "检测头预测", "NMS 后处理", "跟踪与预测"] },
      { name: "交通流量统计", detail: "通过多目标跟踪统计车流、车速与排队长度。", pipeline: ["目标检测", "多目标跟踪", "越线计数", "统计报表"] },
    ],
  },
  {
    id: "security",
    name: "安防监控",
    summary: "大范围、非配合场景下的身份与行为分析。",
    applications: [
      { name: "人脸识别", detail: "抓拍人脸后对齐、提特征并与底库比对，用于门禁与布控。", pipeline: ["人脸检测", "关键点对齐", "特征提取", "1:N 比对"] },
      { name: "行为分析", detail: "识别跌倒、攀爬、聚集等异常行为，降低人工值守压力。", pipeline: ["人体检测", "姿态估计", "时序建模", "告警"] },
      { name: "周界入侵检测", detail: "在划定区域内检测人员或车辆闯入，需抑制树叶晃动等误报。", pipeline: ["背景建模", "目标检测", "区域判断", "告警推送"] },
    ],
  },
  {
    id: "consumer",
    name: "消费级应用",
    summary: "手机与智能硬件中的高频视觉能力。",
    applications: [
      { name: "人脸解锁", detail: "结构光或 ToF 采集深度信息，配合活体检测防止照片攻击。", pipeline: ["深度成像", "人脸检测", "活体判断", "特征比对"] },
      { name: "拍照增强", detail: "夜景降噪、超分辨率与语义分割协同提升成像质量。", pipeline: ["多帧对齐", "降噪融合", "语义分割", "局部增强"] },
      { name: "AR 滤镜", detail: "实时跟踪人脸关键点，把虚拟素材稳定贴合到面部。", pipeline: ["人脸检测", "关键点跟踪", "姿态估计", "渲染合成"] },
    ],
  },
];

export function ApplicationGallery({ meta }: { meta: CaseMeta }) {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [active, setActive] = useState(0);
  const category = CATEGORIES.find((item) => item.id === categoryId) ?? CATEGORIES[0];
  const application = category.applications[Math.min(active, category.applications.length - 1)];

  return (
    <CaseFrame meta={meta}>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setCategoryId(item.id);
              setActive(0);
            }}
            className={[
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              item.id === categoryId
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            ].join(" ")}
          >
            {item.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{category.summary}</p>

      <div className="grid gap-3 md:grid-cols-3">
        {category.applications.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setActive(index)}
            className={[
              "rounded-xl border p-3 text-left transition-colors",
              index === active
                ? "border-brand-500 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                : "border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900",
            ].join(" ")}
          >
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{application.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{application.detail}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {application.pipeline.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {step}
              </span>
              {index < application.pipeline.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          ))}
        </div>
      </div>
    </CaseFrame>
  );
}
