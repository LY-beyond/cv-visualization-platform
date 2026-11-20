import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useState } from "react";

import type { CaseMeta } from "../../api/types";
import ParamPanel from "../../components/ParamPanel";
import ThemedChart from "../../viz/ThemedChart";
import CaseFrame from "../CaseFrame";
import { numberValue, useCaseValues } from "../params";

const BOW_STEPS = ["特征提取", "聚类造词典", "视觉词直方图", "分类决策", "流程总览"];
const PATCHES = Array.from({ length: 12 }, (_, index) => ({
  id: index,
  hue: (index * 31) % 360,
  descriptor: Array.from({ length: 6 }, (_, dim) => ((index * 17 + dim * 29) % 19) + 1),
}));

export function BowAnimation({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const vocabSize = Math.max(16, Math.min(256, Math.round(numberValue(values, "vocab_size", 64))));
  const step = Math.max(0, Math.min(4, Math.round(numberValue(values, "step", 0))));
  const clusterCount = Math.min(12, Math.max(4, Math.round(vocabSize / 8)));

  const histogram = useMemo(
    () => Array.from({ length: 16 }, (_, index) => ((index * 37 + vocabSize) % 23) + 2),
    [vocabSize],
  );
  const topIndex = histogram.indexOf(Math.max(...histogram));

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setValue("step", Math.max(0, step - 1))}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
        >
          上一步
        </button>
        <button
          type="button"
          onClick={() => setValue("step", Math.min(4, step + 1))}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          下一步
        </button>
        {BOW_STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setValue("step", index)}
            className={[
              "rounded-full border px-3 py-1 text-xs transition-colors",
              index === step
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
            ].join(" ")}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">在图像块上提取局部特征</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {PATCHES.map((patch) => (
                <div key={patch.id} className="rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
                  <div
                    className="flex h-10 items-center justify-center rounded text-[10px] font-mono text-white"
                    style={{ background: `hsl(${patch.hue} 55% 52%)` }}
                  >
                    P{patch.id + 1}
                  </div>
                  <div className="mt-1 flex items-end gap-0.5" style={{ height: 18 }}>
                    {patch.descriptor.map((value, index) => (
                      <span
                        key={index}
                        className="w-1 rounded-sm bg-brand-400"
                        style={{ height: `${(value / 19) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              对每个图像块提取 SIFT / ORB 描述符，得到一组局部特征向量；后续不再直接使用原图，而是用这些描述符表达图像。
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              对描述符做 K-Means 聚类（展示前 {clusterCount} 个聚类中心）
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {Array.from({ length: clusterCount }, (_, index) => {
                const members = PATCHES.filter((patch) => patch.id % clusterCount === index);
                return (
                  <div key={index} className="rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">聚类 {index + 1}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {members.map((patch) => (
                        <span
                          key={patch.id}
                          className="h-4 w-4 rounded"
                          style={{ background: `hsl(${patch.hue} 55% 52%)` }}
                          title={`P${patch.id + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              聚类中心就是“视觉词”。词典规模设为 {vocabSize}，实际构建时每个簇中心保存为一个视觉词向量。
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              视觉词典（共 {vocabSize} 个视觉词，展示前 24 个）
            </p>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
              {Array.from({ length: Math.min(24, vocabSize) }, (_, index) => (
                <div
                  key={index}
                  className="flex aspect-square items-center justify-center rounded text-[9px] font-mono text-white"
                  style={{ background: `hsl(${(index * 15) % 360} 50% 50%)` }}
                >
                  {index + 1}
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              词典规模越大表达能力越强，但特征维度升高、匹配更慢且更易过拟合；课件中常用 64~256 个视觉词。
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">把图像量化为视觉词直方图</p>
            <div className="flex h-32 items-end gap-1">
              {histogram.map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                  <span
                    className={[
                      "w-full rounded-t",
                      index === topIndex ? "bg-amber-400" : "bg-brand-400",
                    ].join(" ")}
                    style={{ height: `${(value / 25) * 100}%` }}
                  />
                  <span className="text-[8px] text-slate-400">{index + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              统计每个视觉词在图像中出现的次数并归一化，得到固定长度直方图。视觉词 {topIndex + 1} 权重最高，说明该类纹理在该图中最突出。
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">BoW + SVM 完整流程</p>
            <div className="flex flex-wrap items-center gap-2">
              {["图像", "特征提取", "词典", "直方图", "SVM 分类"].map((label, index) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {label}
                  </span>
                  {index < 4 && <span className="text-slate-300">→</span>}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["预测类别", "建筑", "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"],
                ["置信度", "0.86", "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"],
                ["视觉词维度", String(vocabSize), "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"],
              ].map(([label, value, className]) => (
                <span key={label} className={`rounded-lg px-3 py-2 text-xs ${className}`}>
                  {label}：<span className="font-mono">{value}</span>
                </span>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              直方图送入线性 SVM 即可完成分类。BoW 把任意尺寸的图像统一成定长向量，是从传统特征过渡到分类器的重要桥梁。
            </p>
          </div>
        )}
      </div>
    </CaseFrame>
  );
}

const TOTAL_EPOCHS = 30;

function curveFor(epoch: number) {
  const points = Array.from({ length: epoch }, (_, index) => index + 1);
  return {
    epochs: points,
    loss: points.map((value) => Number((1.9 * Math.exp(-0.13 * value) + 0.11).toFixed(3))),
    train: points.map((value) => Number(((0.6 + 0.38 * (1 - Math.exp(-0.16 * value))) * 100).toFixed(1))),
    val: points.map((value) =>
      Number(((0.56 + 0.4 * (1 - Math.exp(-0.14 * value)) - 0.015 * Math.sin(value / 2)) * 100).toFixed(1)),
    ),
  };
}

export function TrainingCurveReplay({ meta }: { meta: CaseMeta }) {
  const [epoch, setEpoch] = useState(TOTAL_EPOCHS);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setEpoch((current) => {
        if (current >= TOTAL_EPOCHS) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 220);
    return () => window.clearInterval(timer);
  }, [playing]);

  const curve = curveFor(Math.max(1, epoch));
  const option: EChartsOption = {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 48, right: 52, top: 40, bottom: 32 },
    xAxis: { type: "category", data: curve.epochs.map(String), name: "Epoch" },
    yAxis: [
      { type: "value", name: "Loss", scale: true },
      { type: "value", name: "Acc %", min: 50, max: 100 },
    ],
    series: [
      { name: "训练损失", type: "line", smooth: true, symbol: "none", data: curve.loss, itemStyle: { color: "#ef4444" } },
      { name: "训练准确率", type: "line", smooth: true, symbol: "none", yAxisIndex: 1, data: curve.train, itemStyle: { color: "#2563eb" } },
      { name: "验证准确率", type: "line", smooth: true, symbol: "none", yAxisIndex: 1, data: curve.val, itemStyle: { color: "#10b981" } },
    ],
  };

  const lastLoss = curve.loss[curve.loss.length - 1];
  const lastTrain = curve.train[curve.train.length - 1];
  const lastVal = curve.val[curve.val.length - 1];

  return (
    <CaseFrame meta={meta}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (epoch >= TOTAL_EPOCHS) setEpoch(1);
            setPlaying((value) => !value);
          }}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          {playing ? "暂停回放" : epoch >= TOTAL_EPOCHS ? "重新回放" : "继续回放"}
        </button>
        <label className="flex flex-1 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="whitespace-nowrap">Epoch {epoch}</span>
          <input
            type="range"
            min={1}
            max={TOTAL_EPOCHS}
            value={epoch}
            onChange={(event) => {
              setPlaying(false);
              setEpoch(Number(event.target.value));
            }}
            className="w-full accent-brand-600"
          />
        </label>
      </div>

      <ThemedChart option={option} height={300} />

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ["训练损失", String(lastLoss)],
          ["训练准确率", `${lastTrain}%`],
          ["验证准确率", `${lastVal}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-0.5 font-mono text-sm text-slate-700 dark:text-slate-200">{value}</p>
          </div>
        ))}
      </div>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        本案例展示典型训练曲线的形态：损失快速下降后趋缓，验证准确率逐渐贴近训练准确率。页面下方“结果展示”区域会呈现真实训练任务通过 SSE 推送的曲线。
      </p>
    </CaseFrame>
  );
}

interface Layer {
  name: string;
  type: "input" | "conv" | "pool" | "fc" | "output";
  shape: string;
  params: number;
  note: string;
}

const LAYERS: Layer[] = [
  { name: "输入", type: "input", shape: "1×32×32", params: 0, note: "灰度手写数字图像，统一缩放到 32×32。" },
  { name: "C1 卷积", type: "conv", shape: "6×28×28", params: 156, note: "6 个 5×5 卷积核，提取边缘、笔画等低级特征。" },
  { name: "S2 池化", type: "pool", shape: "6×14×14", params: 0, note: "2×2 平均池化，降低分辨率并带来一定位移不变性。" },
  { name: "C3 卷积", type: "conv", shape: "16×10×10", params: 2416, note: "16 个 5×5 卷积核，把低级特征组合成更复杂的局部结构。" },
  { name: "S4 池化", type: "pool", shape: "16×5×5", params: 0, note: "再次池化，输出 16 个 5×5 的特征图。" },
  { name: "C5 卷积", type: "conv", shape: "120×1×1", params: 48120, note: "5×5 卷积覆盖整个特征图，等价于全连接，得到 120 维向量。" },
  { name: "F6 全连接", type: "fc", shape: "84", params: 10164, note: "84 个神经元，进一步整合全局特征。" },
  { name: "输出", type: "output", shape: "10", params: 850, note: "10 个类别得分，经 Softmax 得到概率分布。" },
];

const TYPE_STYLE: Record<Layer["type"], { label: string; className: string }> = {
  input: { label: "输入", className: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  conv: { label: "卷积", className: "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300" },
  pool: { label: "池化", className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  fc: { label: "全连接", className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  output: { label: "输出", className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
};

export function CnnStructure({ meta }: { meta: CaseMeta }) {
  const [selected, setSelected] = useState(1);
  const layer = LAYERS[Math.min(selected, LAYERS.length - 1)];
  const totalParams = LAYERS.reduce((sum, item) => sum + item.params, 0);
  const style = TYPE_STYLE[layer.type];

  return (
    <CaseFrame meta={meta}>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[720px] items-center gap-1.5">
          {LAYERS.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelected(index)}
                className={[
                  "rounded-lg border px-2.5 py-2 text-center transition-all",
                  index === selected ? "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900" : "",
                  TYPE_STYLE[item.type].className,
                ].join(" ")}
              >
                <p className="text-[11px] font-medium">{item.name}</p>
                <p className="mt-0.5 font-mono text-[10px] opacity-80">{item.shape}</p>
              </button>
              {index < LAYERS.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{layer.name}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] ${style.className}`}>{style.label}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{layer.note}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
              <p className="text-[10px] text-slate-400">输出尺寸</p>
              <p className="mt-0.5 font-mono text-xs text-slate-700 dark:text-slate-200">{layer.shape}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
              <p className="text-[10px] text-slate-400">参数量</p>
              <p className="mt-0.5 font-mono text-xs text-slate-700 dark:text-slate-200">{layer.params.toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            LeNet-5 总参数量约 {totalParams.toLocaleString()}，当前层占比 {" "}
            {((layer.params / totalParams) * 100).toFixed(1)}%。
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">特征图示意</p>
          {layer.type === "fc" || layer.type === "output" ? (
            <div className="mt-2 flex h-24 items-center gap-1 overflow-hidden">
              {Array.from({ length: 32 }, (_, index) => (
                <span
                  key={index}
                  className="h-full flex-1 rounded bg-brand-400"
                  style={{ opacity: 0.15 + ((index * 37) % 10) / 14 }}
                />
              ))}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, channel) => (
                <div key={channel} className="grid grid-cols-5 gap-0.5 rounded border border-slate-200 p-1 dark:border-slate-700">
                  {Array.from({ length: 25 }, (_, cell) => (
                    <span
                      key={cell}
                      className="aspect-square rounded-sm bg-brand-500"
                      style={{ opacity: 0.1 + (((channel * 13 + cell * 7) % 9) / 10) }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            深层的特征图分辨率更低、通道更多，单通道响应逐渐对应更抽象的语义模式。
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}
