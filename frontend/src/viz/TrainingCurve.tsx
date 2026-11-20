import type { EChartsOption } from "echarts";

import type { MetricPoint } from "../api/types";
import { useUiStore } from "../stores/uiStore";
import ThemedChart from "./ThemedChart";

interface SeriesMeta {
  key: string;
  name: string;
  color: string;
  axis?: 0 | 1;
}

const SERIES_META: SeriesMeta[] = [
  { key: "loss", name: "训练损失", color: "#3385fb" },
  { key: "val_loss", name: "验证损失", color: "#ff6b33" },
  { key: "accuracy", name: "训练准确率", color: "#8b5cf6", axis: 1 },
  { key: "val_accuracy", name: "验证准确率", color: "#14b8a6", axis: 1 },
];

export default function TrainingCurve({ data }: { data: MetricPoint[] }) {
  const isDark = useUiStore((state) => state.theme) === "dark";

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/40 dark:to-violet-900/30">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-500 dark:text-brand-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 17 9 11 13 15 21 6" />
            <polyline points="15 6 21 6 21 12" />
          </svg>
        </div>
        <p className="text-sm text-slate-400">训练开始后在此展示损失与准确率曲线</p>
      </div>
    );
  }

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
    legend: {
      top: 0,
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 16,
      icon: "roundRect",
      textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 },
    },
    grid: { left: 52, right: 52, top: 42, bottom: 28 },
    xAxis: { type: "category", data: data.map((point) => `E${point.epoch}`), boundaryGap: false },
    yAxis: [
      { type: "value", name: "Loss", scale: true },
      { type: "value", name: "Acc", max: 1, min: 0 },
    ],
    series: SERIES_META.map((meta) => ({
      name: meta.name,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      showSymbol: data.length <= 20,
      lineStyle: { width: 2.5, color: meta.color },
      itemStyle: { color: meta.color, borderColor: isDark ? "#0f172a" : "#ffffff", borderWidth: 1.5 },
      areaStyle: meta.axis
        ? {
            opacity: 0.12,
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: meta.color },
                { offset: 1, color: "rgba(255,255,255,0)" },
              ],
            },
          }
        : undefined,
      yAxisIndex: meta.axis ?? 0,
      data: data.map((point) => (point as unknown as Record<string, number | null>)[meta.key] ?? null),
    })),
  };

  return <ThemedChart option={option} height={300} />;
}
