import { useEffect, useMemo, useState } from "react";

import type { CaseMeta } from "../../api/types";
import ParamPanel from "../../components/ParamPanel";
import CaseFrame from "../CaseFrame";
import { numberValue, stringValue, useCaseValues } from "../params";

type Box = [number, number, number, number];

function iou(boxA: Box, boxB: Box): number {
  const ix1 = Math.max(boxA[0], boxB[0]);
  const iy1 = Math.max(boxA[1], boxB[1]);
  const ix2 = Math.min(boxA[2], boxB[2]);
  const iy2 = Math.min(boxA[3], boxB[3]);
  const intersection = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const areaA = Math.max(0, boxA[2] - boxA[0]) * Math.max(0, boxA[3] - boxA[1]);
  const areaB = Math.max(0, boxB[2] - boxB[0]) * Math.max(0, boxB[3] - boxB[1]);
  const union = areaA + areaB - intersection;
  return union > 0 ? intersection / union : 0;
}

export function BoxFormatDemo({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const cx = numberValue(values, "x", 160);
  const cy = numberValue(values, "y", 140);
  const width = numberValue(values, "w", 180);
  const height = numberValue(values, "h", 120);
  const format = stringValue(values, "format", "xyxy");

  const x1 = cx - width / 2;
  const y1 = cy - height / 2;
  const x2 = cx + width / 2;
  const y2 = cy + height / 2;
  const xyxy = `[${x1.toFixed(0)}, ${y1.toFixed(0)}, ${x2.toFixed(0)}, ${y2.toFixed(0)}]`;
  const xywh = `[${cx.toFixed(0)}, ${cy.toFixed(0)}, ${width.toFixed(0)}, ${height.toFixed(0)}]`;

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="grid gap-5 md:grid-cols-2">
        <svg viewBox="0 0 340 300" className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {Array.from({ length: 10 }, (_, index) => (
            <g key={index} stroke="#e2e8f0" strokeWidth={1}>
              <line x1={index * 36} y1={0} x2={index * 36} y2={300} />
              <line x1={0} y1={index * 34} x2={340} y2={index * 34} />
            </g>
          ))}
          <rect x={x1} y={y1} width={width} height={height} fill="rgba(37,99,235,0.15)" stroke="#2563eb" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={4} fill="#2563eb" />
          <line x1={x1} y1={Math.min(296, y2 + 12)} x2={x2} y2={Math.min(296, y2 + 12)} stroke="#f59e0b" strokeWidth={2} />
          <text x={cx} y={Math.min(292, y2 + 26)} textAnchor="middle" fontSize={11} fill="#b45309">
            w = {width}
          </text>
          <line x1={Math.max(4, x1 - 12)} y1={y1} x2={Math.max(4, x1 - 12)} y2={y2} stroke="#f59e0b" strokeWidth={2} />
          <text x={Math.max(30, x1 - 18)} y={cy} textAnchor="middle" fontSize={11} fill="#b45309" transform={`rotate(-90 ${Math.max(30, x1 - 18)} ${cy})`}>
            h = {height}
          </text>
          <text x={cx + 8} y={cy - 8} fontSize={11} fill="#1d4ed8">
            (cx, cy)
          </text>
        </svg>

        <div className="space-y-3">
          <div className={[
            "rounded-xl border p-3",
            format === "xyxy"
              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
              : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
          ].join(" ")}>
            <p className="text-xs text-slate-500 dark:text-slate-400">左上右下 xyxy</p>
            <p className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">{xyxy}</p>
            <p className="mt-1 text-xs text-slate-400">x1, y1 为左上角；x2, y2 为右下角。</p>
          </div>
          <div className={[
            "rounded-xl border p-3",
            format === "xywh"
              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
              : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
          ].join(" ")}>
            <p className="text-xs text-slate-500 dark:text-slate-400">中心宽高 xywh</p>
            <p className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">{xywh}</p>
            <p className="mt-1 text-xs text-slate-400">cx, cy 为框中心；w, h 为宽高。</p>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            互转公式：x1 = cx − w/2，y1 = cy − h/2，x2 = cx + w/2，y2 = cy + h/2。不同框架与标注格式混用时最容易在这里出错。
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}

export function IouCalculator({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const ax1 = numberValue(values, "x1", 40);
  const ay1 = numberValue(values, "y1", 40);
  const aw = numberValue(values, "w1", 120);
  const ah = numberValue(values, "h1", 100);
  const bx1 = numberValue(values, "x2", 100);
  const by1 = numberValue(values, "y2", 80);
  const bw = numberValue(values, "w2", 140);
  const bh = numberValue(values, "h2", 120);

  const boxA: Box = [ax1, ay1, ax1 + aw, ay1 + ah];
  const boxB: Box = [bx1, by1, bx1 + bw, by1 + bh];
  const intersection: Box = [
    Math.max(boxA[0], boxB[0]),
    Math.max(boxA[1], boxB[1]),
    Math.min(boxA[2], boxB[2]),
    Math.min(boxA[3], boxB[3]),
  ];
  const interArea = Math.max(0, intersection[2] - intersection[0]) * Math.max(0, intersection[3] - intersection[1]);
  const areaA = aw * ah;
  const areaB = bw * bh;
  const overlap = iou(boxA, boxB);

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="grid gap-5 md:grid-cols-2">
        <svg viewBox="0 0 340 320" className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {Array.from({ length: 11 }, (_, index) => (
            <g key={index} stroke="#eef2f7" strokeWidth={1}>
              <line x1={index * 32} y1={0} x2={index * 32} y2={320} />
              <line x1={0} y1={index * 30} x2={340} y2={index * 30} />
            </g>
          ))}
          <rect x={boxA[0]} y={boxA[1]} width={aw} height={ah} fill="rgba(37,99,235,0.18)" stroke="#2563eb" strokeWidth={2} />
          <rect x={boxB[0]} y={boxB[1]} width={bw} height={bh} fill="rgba(245,158,11,0.18)" stroke="#f59e0b" strokeWidth={2} />
          {interArea > 0 && (
            <rect
              x={intersection[0]}
              y={intersection[1]}
              width={intersection[2] - intersection[0]}
              height={intersection[3] - intersection[1]}
              fill="rgba(139,92,246,0.45)"
              stroke="#7c3aed"
              strokeDasharray="4 3"
            />
          )}
          <text x={boxA[0] + 4} y={boxA[1] + 14} fontSize={11} fill="#1d4ed8">框 A</text>
          <text x={boxB[0] + 4} y={boxB[1] + 14} fontSize={11} fill="#b45309">框 B</text>
        </svg>
        <div className="space-y-3">
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/30">
            <p className="text-xs text-brand-700 dark:text-brand-300">IoU = 交集 / 并集</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-brand-700 dark:text-brand-200">
              {overlap.toFixed(3)}
            </p>
          </div>
          {[
            ["框 A 面积", areaA.toFixed(0)],
            ["框 B 面积", areaB.toFixed(0)],
            ["交集面积", interArea.toFixed(0)],
            ["并集面积", (areaA + areaB - interArea).toFixed(0)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">{label}</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">{value}</span>
            </div>
          ))}
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            IoU 用于判断两个框的重叠程度：NMS 用它抑制重复框，检测评估用它判断预测是否命中真值（通常阈值 0.5）。
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}

interface Candidate {
  id: string;
  label: string;
  score: number;
  box: Box;
}

const CANDIDATES: Candidate[] = [
  { id: "1", label: "猫", score: 0.95, box: [40, 40, 200, 200] },
  { id: "2", label: "猫", score: 0.80, box: [56, 50, 206, 206] },
  { id: "3", label: "猫", score: 0.72, box: [124, 58, 302, 228] },
  { id: "4", label: "狗", score: 0.90, box: [248, 118, 340, 252] },
  { id: "5", label: "狗", score: 0.60, box: [244, 128, 336, 246] },
];

interface Decision {
  id: string;
  kept: boolean;
  reason: string;
  score: number;
}

function computeDecisions(threshold: number): Decision[] {
  const ordered = [...CANDIDATES].sort((a, b) => b.score - a.score);
  const kept: Candidate[] = [];
  return ordered.map((candidate) => {
    let maximum = { value: 0, other: "" };
    kept.forEach((other) => {
      const value = iou(candidate.box, other.box);
      if (value > maximum.value) maximum = { value, other: other.id };
    });
    if (maximum.value > threshold) {
      return {
        id: candidate.id,
        kept: false,
        score: candidate.score,
        reason: `与框 ${maximum.other} 的 IoU = ${maximum.value.toFixed(2)}，大于阈值`,
      };
    }
    kept.push(candidate);
    return { id: candidate.id, kept: true, score: candidate.score, reason: "与已保留框重叠低于阈值，保留" };
  });
}

export function NmsSteps({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const threshold = numberValue(values, "iou_threshold", 0.45);
  const decisions = useMemo(() => computeDecisions(threshold), [threshold]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    setStep(1);
  }, [threshold]);

  const visible = decisions.slice(0, step);
  const keptIds = new Set(visible.filter((item) => item.kept).map((item) => item.id));
  const suppressedIds = new Set(visible.filter((item) => !item.kept).map((item) => item.id));

  const statusOf = (id: string) => {
    if (keptIds.has(id)) return "kept";
    if (suppressedIds.has(id)) return "suppressed";
    return "pending";
  };

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="grid gap-5 md:grid-cols-2">
        <svg viewBox="0 0 340 300" className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {CANDIDATES.map((candidate) => {
            const status = statusOf(candidate.id);
            const stroke = status === "kept" ? "#059669" : status === "suppressed" ? "#94a3b8" : "#2563eb";
            return (
              <g key={candidate.id} opacity={status === "suppressed" ? 0.55 : 1}>
                <rect
                  x={candidate.box[0]}
                  y={candidate.box[1]}
                  width={candidate.box[2] - candidate.box[0]}
                  height={candidate.box[3] - candidate.box[1]}
                  fill={status === "kept" ? "rgba(5,150,105,0.14)" : "rgba(37,99,235,0.10)"}
                  stroke={stroke}
                  strokeWidth={status === "pending" ? 1 : 2}
                  strokeDasharray={status === "suppressed" ? "6 4" : undefined}
                />
                <text x={candidate.box[0] + 5} y={candidate.box[1] + 15} fontSize={11} fill={stroke}>
                  {candidate.label} {candidate.score.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300">
              上一步
            </button>
            <button type="button" onClick={() => setStep((value) => Math.min(decisions.length, value + 1))}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
              下一步
            </button>
            <button type="button" onClick={() => setStep(decisions.length)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300">
              全部展开
            </button>
            <span className="self-center text-xs text-slate-400">进度 {step} / {decisions.length}</span>
          </div>
          <ol className="space-y-2">
            {decisions.map((item, index) => (
              <li
                key={item.id}
                className={[
                  "rounded-lg border px-3 py-2 text-xs",
                  index >= step
                    ? "border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600"
                    : item.kept
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400",
                ].join(" ")}
              >
                <span className="font-mono">框 {item.id}</span> · 得分 {item.score.toFixed(2)} ·{" "}
                {index >= step ? "等待判定" : item.kept ? "保留" : "抑制"}
                {index < step && <span className="mt-0.5 block text-[11px] opacity-80">{item.reason}</span>}
              </li>
            ))}
          </ol>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            保留 {keptIds.size} 个框，抑制 {suppressedIds.size} 个重复框。阈值调低会更激进地去除重叠框。
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}

export function YoloGrid({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const grid = Math.max(3, Math.min(19, Math.round(numberValue(values, "grid", 7))));
  const size = 340;
  const cell = size / grid;
  const targetRow = Math.floor(grid / 2);
  const targetCol = Math.floor(grid / 2);
  const centerX = (targetCol + 0.5) * cell;
  const centerY = (targetRow + 0.5) * cell;

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="grid gap-5 md:grid-cols-2">
        <svg viewBox="0 0 340 340" className="w-full rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          <circle cx={centerX} cy={centerY} r={cell * 0.55} fill="rgba(37,99,235,0.35)" stroke="#2563eb" strokeWidth={2} />
          {Array.from({ length: grid + 1 }, (_, index) => (
            <g key={index} stroke="#cbd5e1" strokeWidth={1}>
              <line x1={index * cell} y1={0} x2={index * cell} y2={size} />
              <line x1={0} y1={index * cell} x2={size} y2={index * cell} />
            </g>
          ))}
          <rect x={targetCol * cell} y={targetRow * cell} width={cell} height={cell} fill="rgba(245,158,11,0.25)" stroke="#f59e0b" strokeWidth={2} />
          {[
            { w: cell * 1.8, h: cell * 1.0, color: "#dc2626", name: "A1" },
            { w: cell * 1.1, h: cell * 1.1, color: "#7c3aed", name: "A2" },
            { w: cell * 0.7, h: cell * 1.7, color: "#0891b2", name: "A3" },
          ].map((anchor) => (
            <g key={anchor.name}>
              <rect
                x={centerX - anchor.w / 2}
                y={centerY - anchor.h / 2}
                width={anchor.w}
                height={anchor.h}
                fill="none"
                stroke={anchor.color}
                strokeWidth={1.5}
                strokeDasharray="5 3"
              />
              <text x={centerX - anchor.w / 2} y={centerY - anchor.h / 2 - 4} fontSize={10} fill={anchor.color}>
                {anchor.name}
              </text>
            </g>
          ))}
        </svg>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["网格划分", `${grid} × ${grid}`],
              ["单格锚框", "3 个"],
              ["总预测框", `${grid * grid * 3}`],
              ["负责单元", `第 ${targetRow + 1} 行 ${targetCol + 1} 列`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-0.5 font-mono text-sm text-slate-700 dark:text-slate-200">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            目标中心落在哪个格子，就由该格子负责预测。每个格子输出若干锚框的置信度与偏移量，形成“网格 + 锚框”的密集预测。
          </p>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            YOLOv3 起在 3 个尺度上分别划分网格，小网格负责大目标，大网格负责小目标。
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}

const FLOW = [
  { name: "输入图像", detail: "任意尺寸图像送入主干网络提取特征。" },
  { name: "候选区域", detail: "RPN 以锚框为基准生成候选区域，并做初步前景/背景判定。" },
  { name: "RoI 特征", detail: "RoIAlign 把不同大小的候选区域池化为固定尺寸特征。" },
  { name: "分类 + 回归", detail: "全连接头输出类别概率与边界框偏移量，得到最终检测框。" },
  { name: "掩码分支", detail: "Mask R-CNN 在分类回归之外增加逐像素掩码分支，扩展到实例分割。" },
];

export function TwoStageFlow({ meta }: { meta: CaseMeta }) {
  const [active, setActive] = useState(0);
  return (
    <CaseFrame meta={meta}>
      <div className="flex flex-wrap items-center gap-2">
        {FLOW.map((item, index) => (
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
            {index < FLOW.length - 1 && <span className="text-slate-300">→</span>}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{FLOW[active].name}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{FLOW[active].detail}</p>
      </div>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        两阶段方法先“找候选再精细分类”，精度高但速度较慢；单阶段方法直接回归类别与框，速度更快。
      </p>
    </CaseFrame>
  );
}
