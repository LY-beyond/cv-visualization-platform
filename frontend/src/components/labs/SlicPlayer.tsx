import { useMemo, useState } from "react";

import { labAsset } from "../../data/labs";
import StepPlayer, { type StepPlayerStep } from "../../viz/StepPlayer";

const MODES = [
  { id: "m40", label: "M=40（紧凑）", frames: 10 },
  { id: "m5", label: "M=5（贴边）", frames: 2 },
] as const;

const NOTES = [
  "第 0 轮：按 S=√(N/K) 铺规则网格，中心均匀分布，边界是标准方格。",
  "第 1~2 轮：颜色距离开始把中心拉向颜色相近的区域，头发与帽檐附近出现形变。",
  "第 3~5 轮：边界逐步贴合颜色边界；M 越小，颜色项权重越大，贴合越明显。",
  "第 6~9 轮：中心移动量低于阈值，标签基本稳定；实验记录为第 7 轮后完全稳定。",
];

interface SlicPlayerProps {
  mode?: (typeof MODES)[number]["id"];
  onModeChange?: (mode: (typeof MODES)[number]["id"]) => void;
}

/** SLIC 迭代回放：直接使用实验四保留的 loop0~loop9 真实迭代帧。 */
export default function SlicPlayer({ mode: controlledMode, onModeChange }: SlicPlayerProps = {}) {
  const [internalMode, setInternalMode] = useState<(typeof MODES)[number]["id"]>("m40");
  const mode = controlledMode ?? internalMode;
  const setMode = (next: (typeof MODES)[number]["id"]) => {
    setInternalMode(next);
    onModeChange?.(next);
  };

  const steps = useMemo<StepPlayerStep[]>(() => {
    if (mode === "m5") {
      return [0, 9].map((index) => ({
        title: `M=5 · 第 ${index} 轮`,
        description:
          index === 0
            ? "M=5 的初始网格。颜色项权重很大，后续边界会强烈贴着颜色变化走。"
            : "M=5 的最终结果：边界贴合头发与帽檐，但形状细长、圆形度只有 0.128。",
        image: labAsset(`lab4/images/slic-m5-loop${index}.jpg`),
      }));
    }
    return Array.from({ length: 10 }, (_, index) => ({
      title: `第 ${index} 轮`,
      description: NOTES[Math.min(Math.floor(index / 2.5), NOTES.length - 1)],
      image: labAsset(`lab4/images/slic-loop${index}.jpg`),
    }));
  }, [mode]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">迭代参数：</span>
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={[
              "rounded-full border px-3 py-1 text-xs transition-colors",
              mode === item.id
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
        <span className="text-[11px] text-slate-400">K=500，图像为实验四真实迭代帧</span>
      </div>
      <StepPlayer steps={steps} showImages />
    </div>
  );
}
