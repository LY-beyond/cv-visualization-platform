import type { EChartsOption } from "echarts";

import { useUiStore } from "../stores/uiStore";
import ThemedChart from "./ThemedChart";

interface ConfusionMatrixProps {
  matrix: number[][];
  classNames: string[];
}

export default function ConfusionMatrix({ matrix, classNames }: ConfusionMatrixProps) {
  const isDark = useUiStore((state) => state.theme) === "dark";

  if (matrix.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/40 dark:to-violet-900/30">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-500 dark:text-brand-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </div>
        <p className="text-sm text-slate-400">评估完成后在此展示混淆矩阵热力图</p>
      </div>
    );
  }

  const maxValue = Math.max(...matrix.flat(), 1);
  const dense = classNames.length > 12;
  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      position: "top",
      formatter: (params: unknown) => {
        const [x, y, value] = (params as { value: [number, number, number] }).value;
        return [
          `<span style="font-weight:600">真实：${classNames[y]}</span>`,
          `预测：${classNames[x]}`,
          `样本数：<b>${value}</b>`,
        ].join("<br/>");
      },
    },
    grid: { left: 64, right: 24, top: 24, bottom: 72 },
    xAxis: {
      type: "category",
      data: classNames,
      name: "预测",
      nameLocation: "middle",
      nameGap: 34,
      axisLabel: { rotate: classNames.length > 6 ? 40 : 0, interval: 0, fontSize: dense ? 9 : 11 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: classNames,
      name: "真实",
      nameLocation: "middle",
      nameGap: 46,
      axisLabel: { interval: 0, fontSize: dense ? 9 : 11 },
      splitLine: { show: false },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 4,
      itemWidth: 200,
      itemHeight: 12,
      textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 },
      inRange: { color: ["#eef6ff", "#8ec6ff", "#8b5cf6", "#ff6b33"] },
    },
    series: [
      {
        type: "heatmap",
        data: matrix.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => [columnIndex, rowIndex, value]),
        ),
        itemStyle: {
          borderColor: isDark ? "#0f172a" : "#ffffff",
          borderWidth: 2,
          borderRadius: 4,
        },
        label: {
          show: !dense,
          fontSize: 11,
          fontWeight: 600,
          formatter: (params: unknown) => {
            const value = (params as { value: [number, number, number] }).value[2];
            return value === 0 ? "" : String(value);
          },
        },
        emphasis: {
          itemStyle: {
            borderColor: "#ff6b33",
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: "rgba(51, 133, 251, 0.35)",
          },
        },
      },
    ],
  };

  return <ThemedChart option={option} height={360} />;
}
