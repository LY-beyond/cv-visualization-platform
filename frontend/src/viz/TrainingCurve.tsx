import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import type { MetricPoint } from "../api/types";

export default function TrainingCurve({ data }: { data: MetricPoint[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">训练开始后在此展示损失与准确率曲线</p>;
  }

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { data: ["训练损失", "验证损失", "训练准确率"], top: 0 },
    grid: { left: 48, right: 48, top: 36, bottom: 28 },
    xAxis: { type: "category", data: data.map((point) => `E${point.epoch}`) },
    yAxis: [
      { type: "value", name: "Loss" },
      { type: "value", name: "Acc", max: 1, min: 0 },
    ],
    series: [
      { name: "训练损失", type: "line", smooth: true, data: data.map((point) => point.loss ?? null) },
      { name: "验证损失", type: "line", smooth: true, data: data.map((point) => point.val_loss ?? null) },
      {
        name: "训练准确率",
        type: "line",
        smooth: true,
        yAxisIndex: 1,
        data: data.map((point) => point.accuracy ?? null),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} notMerge />;
}
