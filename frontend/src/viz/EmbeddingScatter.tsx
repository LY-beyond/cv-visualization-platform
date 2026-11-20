import type { EChartsOption } from "echarts";

import { useUiStore } from "../stores/uiStore";
import ThemedChart from "./ThemedChart";

export interface EmbeddingPoint {
  x: number;
  y: number;
  label: string;
}

export default function EmbeddingScatter({ points }: { points: EmbeddingPoint[] }) {
  const isDark = useUiStore((state) => state.theme) === "dark";

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/40 dark:to-violet-900/30">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-500 dark:text-brand-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="8" r="2" />
            <circle cx="16" cy="6" r="2" />
            <circle cx="11" cy="15" r="2" />
            <circle cx="19" cy="16" r="2" />
            <circle cx="5" cy="18" r="2" />
          </svg>
        </div>
        <p className="text-sm text-slate-400">特征提取后在此展示降维投影散点图</p>
      </div>
    );
  }

  const labels = Array.from(new Set(points.map((point) => point.label)));
  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (params: unknown) => {
        const item = params as { seriesName: string; value: [number, number] };
        return `<b>${item.seriesName}</b><br/>x: ${item.value[0].toFixed(3)}<br/>y: ${item.value[1].toFixed(3)}`;
      },
    },
    legend: {
      top: 0,
      type: "scroll",
      itemWidth: 10,
      itemHeight: 10,
      icon: "circle",
      textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 },
    },
    grid: { left: 44, right: 24, top: 44, bottom: 32 },
    xAxis: { type: "value", scale: true, splitLine: { lineStyle: { type: "dashed" } } },
    yAxis: { type: "value", scale: true, splitLine: { lineStyle: { type: "dashed" } } },
    series: labels.map((label) => ({
      name: label,
      type: "scatter",
      symbolSize: 9,
      emphasis: { scale: 1.6, focus: "series" },
      itemStyle: {
        opacity: 0.85,
        borderColor: isDark ? "#0f172a" : "#ffffff",
        borderWidth: 1.5,
      },
      data: points.filter((point) => point.label === label).map((point) => [point.x, point.y]),
    })),
  };

  return <ThemedChart option={option} height={340} />;
}
