import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

interface ConfusionMatrixProps {
  matrix: number[][];
  classNames: string[];
}

export default function ConfusionMatrix({ matrix, classNames }: ConfusionMatrixProps) {
  if (matrix.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">评估完成后在此展示混淆矩阵热力图</p>;
  }

  const maxValue = Math.max(...matrix.flat(), 1);
  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { position: "top" },
    grid: { left: 60, right: 24, top: 24, bottom: 60 },
    xAxis: { type: "category", data: classNames, name: "预测" },
    yAxis: { type: "category", data: classNames, name: "真实" },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: ["#eef6ff", "#59a6ff", "#1550dc"] },
    },
    series: [
      {
        type: "heatmap",
        data: matrix.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => [columnIndex, rowIndex, value]),
        ),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320 }} notMerge />;
}
