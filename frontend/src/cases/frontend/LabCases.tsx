import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";

import type { CaseMeta } from "../../api/types";
import ParamPanel from "../../components/ParamPanel";
import SlicPlayer from "../../components/labs/SlicPlayer";
import ThemedChart from "../../viz/ThemedChart";
import CaseFrame from "../CaseFrame";
import { numberValue, stringValue, useCaseValues } from "../params";

/* ------------------------------------------------------------------ */
/* 实验三 · BoVW 特征对比浏览器                                        */
/* ------------------------------------------------------------------ */

const SINGLE_ACCURACY: Record<string, number> = {
  HOG: 0.6905,
  稠密SIFT: 0.6571,
  SIFT: 0.5571,
  LBP: 0.4762,
  ORB: 0.4286,
};

const SIFT_VOCAB: Record<string, number> = { "25": 0.5048, "50": 0.5238, "100": 0.5571, "200": 0.5619 };

const FUSED_ROWS: [string, number, number, string][] = [
  ["SIFT + HOG", 200, 0.7238, "+0.033"],
  ["SIFT + 稠密 SIFT", 200, 0.7238, "+0.033"],
  ["SIFT+ORB+HOG+LBP", 400, 0.7095, "+0.019"],
  ["SIFT+ORB+HOG", 300, 0.6952, "+0.005"],
  ["SIFT + LBP", 200, 0.6286, "−0.062"],
  ["SIFT + ORB", 200, 0.6048, "−0.086"],
];

export function BowExplorer({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const feature = stringValue(values, "feature", "HOG");
  const vocab = stringValue(values, "vocab", "100");

  const option = useMemo<EChartsOption>(() => {
    const categories = Object.keys(SINGLE_ACCURACY);
    return {
      grid: { left: 48, right: 20, top: 30, bottom: 40 },
      tooltip: { trigger: "axis", valueFormatter: (value) => `${(Number(value) * 100).toFixed(2)}%` },
      xAxis: { type: "category", data: categories, axisLabel: { fontSize: 11 } },
      yAxis: { type: "value", min: 0.35, max: 0.78, name: "准确率", axisLabel: { fontSize: 11 } },
      series: [{
        type: "bar",
        barMaxWidth: 42,
        data: categories.map((name) => ({
          value: SINGLE_ACCURACY[name],
          itemStyle: { color: name === feature ? "#2563eb" : "#c7d2fe" },
        })),
        label: { show: true, position: "top", fontSize: 10, formatter: (params: { value?: unknown }) => `${(Number(params.value) * 100).toFixed(1)}%` },
      }],
    };
  }, [feature]);

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="section-card">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">五种单特征准确率（k=100）</p>
          <ThemedChart option={option} height={260} />
        </div>
        <div className="section-card space-y-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">当前选择</p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
              {feature} · k={vocab} → {((SINGLE_ACCURACY[feature] ?? 0) * 100).toFixed(2)}%
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">词典规模 k（SIFT）</p>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              {Object.entries(SIFT_VOCAB).map(([k, accuracy]) => (
                <div
                  key={k}
                  className={[
                    "rounded-lg border px-2 py-1.5 text-xs",
                    k === vocab
                      ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900",
                  ].join(" ")}
                >
                  <p className="font-mono">k={k}</p>
                  <p className="mt-0.5 font-semibold">{(accuracy * 100).toFixed(2)}%</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            切到 HOG：准确率最高（69.05%）；切到 ORB：只有 42.86%。k 从 25 增到 200 收益递减，
            因为每张图只有约 157 个描述子，词表越大直方图越稀疏。
          </p>
        </div>
      </div>

      <div className="section-card">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">六种联合特征（各自建词典后拼接）</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {["组合", "维度", "准确率", "相对最佳单特征"].map((column) => (
                  <th key={column} className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FUSED_ROWS.map((row) => (
                <tr key={row[0]} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200">{row[0]}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-500">{row[1]}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-200">{(row[2] * 100).toFixed(2)}%</td>
                  <td className={["px-3 py-1.5 font-mono", row[3].startsWith("+") ? "text-emerald-600" : "text-rose-500"].join(" ")}>
                    {row[3]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CaseFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 实验四 · SLIC 迭代回放                                             */
/* ------------------------------------------------------------------ */

export function SlicIterationCase({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const compactness = stringValue(values, "compactness", "40");

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <SlicPlayer
        mode={compactness === "5" ? "m5" : "m40"}
        onModeChange={(mode) => setValue("compactness", mode === "m5" ? "5" : "40")}
      />
    </CaseFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 实验五 · YOLO Anchor 解码                                          */
/* ------------------------------------------------------------------ */

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function YoloDecodeLab({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const grid = numberValue(values, "scale", 13);
  const tx = numberValue(values, "tx", 0);
  const ty = numberValue(values, "ty", 0);
  const tw = numberValue(values, "tw", 0);
  const th = numberValue(values, "th", 0);
  const anchorW = numberValue(values, "anchor_w", 2);
  const anchorH = numberValue(values, "anchor_h", 3);
  const [quantize, setQuantize] = useState(false);

  const cellX = Math.floor(grid / 2);
  const cellY = Math.floor(grid / 2);
  const bx = (sigmoid(tx) + cellX) / grid;
  const by = (sigmoid(ty) + cellY) / grid;
  const bw = (anchorW * Math.exp(tw)) / grid;
  const bh = (anchorH * Math.exp(th)) / grid;

  const canvas = 360;
  const cell = canvas / grid;
  const boxWidth = bw * canvas;
  const boxHeight = bh * canvas;
  const centerX = bx * canvas;
  const centerY = by * canvas;

  const quantizedX = Math.floor(grid * bx) / grid;
  const quantizedY = Math.floor(grid * by) / grid;
  const quantizedOffset = Math.hypot((bx - quantizedX) * 640, (by - quantizedY) * 640);

  const lines = Array.from({ length: grid + 1 }, (_, index) => index * cell);

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div>
          <svg viewBox={`0 0 ${canvas} ${canvas}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {lines.map((position) => (
              <g key={position} stroke={grid > 30 ? "#eef2f7" : "#e2e8f0"} strokeWidth={1}>
                <line x1={position} y1={0} x2={position} y2={canvas} />
                <line x1={0} y1={position} x2={canvas} y2={position} />
              </g>
            ))}
            <rect
              x={cellX * cell}
              y={cellY * cell}
              width={cell}
              height={cell}
              fill="rgba(37,99,235,0.12)"
              stroke="#2563eb"
              strokeWidth={1.5}
            />
            <rect
              x={centerX - boxWidth / 2}
              y={centerY - boxHeight / 2}
              width={boxWidth}
              height={boxHeight}
              fill="rgba(16,185,129,0.14)"
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            <circle cx={centerX} cy={centerY} r={4} fill="#059669" />
            {quantize && (
              <circle cx={quantizedX * canvas} cy={quantizedY * canvas} r={4} fill="#f97316" />
            )}
            <text x={cellX * cell + 4} y={cellY * cell + 14} fontSize={10} fill="#2563eb">
              cell ({cellX}, {cellY})
            </text>
          </svg>
          <button
            type="button"
            onClick={() => setQuantize((value) => !value)}
            className={[
              "mt-2 rounded-lg border px-3 py-1.5 text-xs transition-colors",
              quantize
                ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                : "border-slate-200 text-slate-500 hover:border-amber-300 dark:border-slate-700 dark:text-slate-400",
            ].join(" ")}
          >
            叠加 YOLO v1 取整误差（橙色点）
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3 font-mono text-xs leading-6 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
            <p>b_x = (σ({tx.toFixed(2)}) + {cellX}) / {grid} = {bx.toFixed(4)}</p>
            <p>b_y = (σ({ty.toFixed(2)}) + {cellY}) / {grid} = {by.toFixed(4)}</p>
            <p>b_w = {anchorW} · e^{tw.toFixed(2)} / {grid} = {bw.toFixed(4)}</p>
            <p>b_h = {anchorH} · e^{th.toFixed(2)} / {grid} = {bh.toFixed(4)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["中心像素 (640×640)", `${(bx * 640).toFixed(1)}, ${(by * 640).toFixed(1)}`],
              ["框像素宽高", `${(bw * 640).toFixed(1)} × ${(bh * 640).toFixed(1)}`],
              ["σ(tx) / σ(ty)", `${sigmoid(tx).toFixed(3)} / ${sigmoid(ty).toFixed(3)}`],
              ["网格数 / 单尺度先验数", `${grid} × ${grid} × 3 = ${grid * grid * 3}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-0.5 font-mono text-slate-700 dark:text-slate-200">{value}</p>
              </div>
            ))}
          </div>
          {quantize && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              YOLO v1 用 int(S·x) 选网格，中心被量化到网格左上角，本次偏移约 {quantizedOffset.toFixed(1)} 像素（按 640 输入换算）。
              这就是把编码值解码画回原图时出现轻微错位的原因。
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-slate-400">
            σ 把中心偏移限制在 0~1 个格子内，因此预测中心永远不会跳出负责网格；宽高用指数恢复，
            训练初期 t≈0 时预测框形状接近 Anchor。
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 实验五 · Letterbox 坐标同步                                        */
/* ------------------------------------------------------------------ */

const SOURCE_WIDTH = 640;
const SOURCE_HEIGHT = 480;

export function LetterboxLab({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const target = numberValue(values, "target", 416);
  const x1 = numberValue(values, "x1", 120);
  const y1 = numberValue(values, "y1", 80);
  const x2 = numberValue(values, "x2", 340);
  const y2 = numberValue(values, "y2", 260);
  const safeX2 = Math.max(x1 + 10, x2);
  const safeY2 = Math.max(y1 + 10, y2);

  const scale = Math.min(target / SOURCE_WIDTH, target / SOURCE_HEIGHT);
  const resizedWidth = SOURCE_WIDTH * scale;
  const resizedHeight = SOURCE_HEIGHT * scale;
  const padX = (target - resizedWidth) / 2;
  const padY = (target - resizedHeight) / 2;

  const mapped = [x1 * scale + padX, y1 * scale + padY, safeX2 * scale + padX, safeY2 * scale + padY];

  const preview = 300;
  const sourceScale = preview / SOURCE_WIDTH;
  const targetScale = preview / target;

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">原图 640×480</p>
          <svg viewBox={`0 0 ${preview} ${preview * 0.75}`} className="w-full rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
            <rect x={0} y={0} width={preview} height={preview * 0.75} fill="#f1f5f9" />
            {Array.from({ length: 8 }, (_, index) => (
              <line key={`v${index}`} x1={index * (preview / 8)} y1={0} x2={index * (preview / 8)} y2={preview * 0.75} stroke="#e2e8f0" />
            ))}
            {Array.from({ length: 6 }, (_, index) => (
              <line key={`h${index}`} x1={0} y1={index * (preview / 8)} x2={preview} y2={index * (preview / 8)} stroke="#e2e8f0" />
            ))}
            <rect
              x={x1 * sourceScale}
              y={y1 * sourceScale}
              width={(safeX2 - x1) * sourceScale}
              height={(safeY2 - y1) * sourceScale}
              fill="rgba(37,99,235,0.14)"
              stroke="#2563eb"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Letterbox 后 {target}×{target}（灰色为补边）
          </p>
          <svg viewBox={`0 0 ${preview} ${preview}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <rect x={0} y={0} width={preview} height={preview} fill="#f8fafc" />
            <rect x={0} y={0} width={preview} height={preview} fill="#e2e8f0" />
            <rect x={padX * targetScale} y={padY * targetScale} width={resizedWidth * targetScale} height={resizedHeight * targetScale} fill="#ffffff" />
            <rect
              x={mapped[0] * targetScale}
              y={mapped[1] * targetScale}
              width={(mapped[2] - mapped[0]) * targetScale}
              height={(mapped[3] - mapped[1]) * targetScale}
              fill="rgba(16,185,129,0.16)"
              stroke="#059669"
              strokeWidth={2}
            />
          </svg>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["缩放比例 s", `min(${target}/640, ${target}/480) = ${scale.toFixed(4)}`],
          ["补边 padX / padY", `${padX.toFixed(1)} / ${padY.toFixed(1)}`],
          ["映射后框", `[${mapped.map((value) => value.toFixed(1)).join(", ")}]`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] text-slate-400">{label}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-700 dark:text-slate-200">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-50 px-4 py-3 font-mono text-xs leading-6 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
        <p>x′ = s·x + padX，y′ = s·y + padY</p>
        <p>x1′ = {scale.toFixed(3)}×{x1} + {padX.toFixed(1)} = {mapped[0].toFixed(1)}</p>
        <p>y2′ = {scale.toFixed(3)}×{safeY2} + {padY.toFixed(1)} = {mapped[3].toFixed(1)}</p>
      </div>
    </CaseFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 实验五 · 置信度与 NMS 双阈值实验台                                 */
/* ------------------------------------------------------------------ */

interface Candidate {
  label: string;
  confidence: number;
  box: [number, number, number, number];
  synthetic?: boolean;
}

const FALLBACK_CANDIDATES: Candidate[] = [
  { label: "person", confidence: 0.92, box: [120, 300, 210, 620] },
  { label: "person", confidence: 0.88, box: [126, 306, 216, 626], synthetic: true },
  { label: "car", confidence: 0.86, box: [640, 420, 980, 610] },
  { label: "car", confidence: 0.79, box: [652, 432, 992, 622], synthetic: true },
  { label: "car", confidence: 0.63, box: [220, 400, 430, 520] },
  { label: "traffic light", confidence: 0.58, box: [860, 120, 905, 300] },
];

function iou(a: Candidate["box"], b: Candidate["box"]): number {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]);
  const iy2 = Math.min(a[3], b[3]);
  const intersection = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const areaA = Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]);
  const areaB = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  const union = areaA + areaB - intersection;
  return union > 0 ? intersection / union : 0;
}

interface TrafficPayload {
  detections: { label: string; confidence: number; box: number[] }[];
}

export function NmsThresholdLab({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const conf = numberValue(values, "conf", 0.5);
  const iouThreshold = numberValue(values, "iou", 0.45);
  const [source, setSource] = useState<Candidate[]>(FALLBACK_CANDIDATES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/labs/lab5/predictions/yolo-traffic.json`)
      .then((response) => (response.ok ? (response.json() as Promise<TrafficPayload>) : Promise.reject(new Error("missing"))))
      .then((payload) => {
        const candidates: Candidate[] = [];
        payload.detections.forEach((item) => {
          const [x1, y1, x2, y2] = item.box;
          candidates.push({ label: item.label, confidence: item.confidence, box: [x1, y1, x2, y2] });
          candidates.push({
            label: item.label,
            confidence: item.confidence * 0.92,
            box: [x1 + 6, y1 + 5, x2 + 7, y2 + 6],
            synthetic: true,
          });
          candidates.push({
            label: item.label,
            confidence: item.confidence * 0.85,
            box: [x1 - 5, y1 - 4, x2 - 6, y2 - 5],
            synthetic: true,
          });
        });
        setSource(candidates);
        setLoaded(true);
      })
      .catch(() => setLoaded(false));
  }, []);

  const filtered = useMemo(() => source.filter((item) => item.confidence >= conf), [source, conf]);
  const kept = useMemo(() => {
    const ordered = [...filtered].sort((a, b) => b.confidence - a.confidence);
    const output: Candidate[] = [];
    for (const candidate of ordered) {
      if (output.every((item) => iou(item.box, candidate.box) < iouThreshold)) {
        output.push(candidate);
      }
    }
    return output;
  }, [filtered, iouThreshold]);

  const distribution = useMemo(() => {
    const counter = new Map<string, number>();
    kept.forEach((item) => counter.set(item.label, (counter.get(item.label) ?? 0) + 1));
    return [...counter.entries()].sort((a, b) => b[1] - a[1]);
  }, [kept]);

  const maxCoordinate = useMemo(
    () => Math.max(...source.flatMap((item) => [item.box[2], item.box[3]]), 640),
    [source],
  );
  const canvasWidth = 380;
  const canvasHeight = 240;
  const scale = Math.min(canvasWidth / maxCoordinate, canvasHeight / (maxCoordinate * 0.62));

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <svg viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} className="w-full rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-700">
          {Array.from({ length: 12 }, (_, index) => (
            <line key={`v${index}`} x1={(index * canvasWidth) / 12} y1={0} x2={(index * canvasWidth) / 12} y2={canvasHeight} stroke="rgba(148,163,184,0.15)" />
          ))}
          {filtered.map((item, index) => {
            const [x1, y1, x2, y2] = item.box;
            return (
              <rect
                key={`f-${index}`}
                x={x1 * scale}
                y={y1 * scale}
                width={Math.max(2, (x2 - x1) * scale)}
                height={Math.max(2, (y2 - y1) * scale)}
                fill="none"
                stroke="rgba(148,163,184,0.55)"
                strokeWidth={1}
                strokeDasharray="3 2"
              />
            );
          })}
          {kept.map((item, index) => {
            const [x1, y1, x2, y2] = item.box;
            return (
              <g key={`k-${index}`}>
                <rect
                  x={x1 * scale}
                  y={y1 * scale}
                  width={Math.max(2, (x2 - x1) * scale)}
                  height={Math.max(2, (y2 - y1) * scale)}
                  fill="rgba(16,185,129,0.12)"
                  stroke="#34d399"
                  strokeWidth={2}
                />
                <text x={x1 * scale + 2} y={Math.max(10, y1 * scale - 3)} fontSize={9} fill="#a7f3d0">
                  {item.label} {(item.confidence * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
          <text x={10} y={16} fontSize={10} fill="#94a3b8">
            {loaded ? "实验五夜间街景检测（派生候选）" : "内置候选（未加载实验数据）"}
          </text>
        </svg>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["候选总数", source.length],
              ["置信度过滤后", filtered.length],
              ["NMS 保留", kept.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900">
                <p className="font-mono text-lg font-semibold text-brand-700 dark:text-brand-300">{value}</p>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">保留类别分布</p>
            <div className="mt-2 space-y-1.5">
              {distribution.length === 0 && <p className="text-xs text-slate-400">当前阈值下没有保留框。</p>}
              {distribution.map(([label, count]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / Math.max(...distribution.map((item) => item[1]))) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono text-xs text-slate-500">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            灰色虚线是置信度过滤后仍被 NMS 抑制的框。为演示抑制过程，每个真实检测额外派生了 2 个
            置信度略低、位置偏移 5~7 像素的候选（实验导出的 JSON 已做过 NMS）。
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}
