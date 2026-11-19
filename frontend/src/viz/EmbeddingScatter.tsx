import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

export interface EmbeddingPoint {
  x: number;
  y: number;
  label: string;
}

export default function EmbeddingScatter({ points }: { points: EmbeddingPoint[] }) {
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">特征提取后在此展示降维投影散点图</p>;
  }

  const labels = Array.from(new Set(points.map((point) => point.label)));
  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    legend: { top: 0 },
    grid: { left: 40, right: 24, top: 36, bottom: 28 },
    xAxis: { type: "value", scale: true },
    yAxis: { type: "value", scale: true },
    series: labels.map((label) => ({
      name: label,
      type: "scatter",
      symbolSize: 8,
      data: points.filter((point) => point.label === label).map((point) => [point.x, point.y]),
    })),
  };

  return <ReactECharts option={option} style={{ height: 320 }} notMerge />;
}
