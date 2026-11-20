import { useState } from "react";

import type { CaseMeta } from "../../api/types";
import CaseFrame from "../CaseFrame";

interface Block {
  name: string;
  detail: string;
}

const STRUCTURES: Record<string, { title: string; note: string; blocks: Block[] }> = {
  fcn: {
    title: "FCN 全卷积网络",
    note: "用卷积层替换全连接层，配合跳跃连接融合浅层细节与深层语义，再逐级上采样恢复分辨率。",
    blocks: [
      { name: "输入图像", detail: "任意尺寸输入，全卷积结构不限制图像大小。" },
      { name: "Conv1~Conv5", detail: "逐级下采样提取特征，感受野增大、语义增强。" },
      { name: "1×1 卷积", detail: "把通道数映射为类别数，得到低分辨率类别得分图。" },
      { name: "反卷积上采样", detail: "将得分图上采样回输入尺寸，得到逐像素预测。" },
      { name: "跳跃连接", detail: "融合 pool3 / pool4 的浅层特征，改善边界细节。" },
      { name: "输出掩码", detail: "每个像素取类别得分最大的类别。" },
    ],
  },
  unet: {
    title: "U-Net 编码器-解码器",
    note: "编码器逐级下采样提取语义，解码器逐级上采样；同层跳连把高分辨率细节直接拼接到解码特征上。",
    blocks: [
      { name: "输入图像", detail: "医学图像等小样本场景常用，可做滑动窗口预测。" },
      { name: "编码器 ×4", detail: "每级两个 3×3 卷积加一次 2×2 最大池化，通道数翻倍。" },
      { name: "瓶颈层", detail: "最低分辨率、最高语义，完成全局上下文建模。" },
      { name: "解码器 ×4", detail: "每次上采样后与同层编码特征拼接，再卷积融合。" },
      { name: "同层跳连", detail: "U 形连接把浅层位置信息送到对应解码层，边界更精细。" },
      { name: "输出掩码", detail: "1×1 卷积输出类别概率，逐像素判定。" },
    ],
  },
};

export default function SegStructure({ meta }: { meta: CaseMeta }) {
  const [mode, setMode] = useState<"fcn" | "unet">("unet");
  const [active, setActive] = useState(4);
  const structure = STRUCTURES[mode];
  const block = structure.blocks[Math.min(active, structure.blocks.length - 1)];

  return (
    <CaseFrame meta={meta}>
      <div className="flex flex-wrap gap-2">
        {Object.entries(STRUCTURES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key as "fcn" | "unet");
              setActive(0);
            }}
            className={[
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              key === mode
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            ].join(" ")}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {structure.blocks.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActive(index)}
              className={[
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                index === active
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              ].join(" ")}
            >
              {item.name}
            </button>
            {index < structure.blocks.length - 1 && <span className="text-slate-300">→</span>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{block.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{block.detail}</p>
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        {structure.note}
      </p>
    </CaseFrame>
  );
}
