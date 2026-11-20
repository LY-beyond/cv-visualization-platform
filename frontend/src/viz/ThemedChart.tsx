import type { CSSProperties } from "react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import { useUiStore } from "../stores/uiStore";

/** 全站图表统一色板，与界面「蓝 → 紫 → 橙」的渐变主色保持一致。 */
export const CHART_PALETTE = [
  "#3385fb",
  "#8b5cf6",
  "#ff6b33",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#0ea5e9",
  "#84cc16",
];

type AxisOption = Record<string, unknown>;

/** 为坐标轴补充统一的轴线、刻度与网格样式，保留图表自身已设置的属性。 */
function styleAxis(axis: AxisOption | AxisOption[] | undefined, isDark: boolean) {
  if (!axis) return axis;
  const base = {
    axisLine: { lineStyle: { color: isDark ? "#475569" : "#cbd5e1" } },
    axisTick: { show: false },
    axisLabel: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 },
    splitLine: {
      lineStyle: {
        color: isDark ? "rgba(71, 85, 105, 0.35)" : "rgba(203, 213, 225, 0.65)",
        type: "dashed",
      },
    },
    nameTextStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 },
  };
  const apply = (item: AxisOption): AxisOption => {
    const axisLine = (item.axisLine as AxisOption | undefined) ?? {};
    const axisLabel = (item.axisLabel as AxisOption | undefined) ?? {};
    const splitLine = (item.splitLine as AxisOption | undefined) ?? {};
    const nameTextStyle = (item.nameTextStyle as AxisOption | undefined) ?? {};
    return {
      ...base,
      ...item,
      axisLine: {
        ...base.axisLine,
        ...axisLine,
        lineStyle: {
          ...base.axisLine.lineStyle,
          ...((axisLine.lineStyle as AxisOption | undefined) ?? {}),
        },
      },
      axisLabel: { ...base.axisLabel, ...axisLabel },
      splitLine: {
        ...base.splitLine,
        ...splitLine,
        lineStyle: {
          ...base.splitLine.lineStyle,
          ...((splitLine.lineStyle as AxisOption | undefined) ?? {}),
        },
      },
      nameTextStyle: { ...base.nameTextStyle, ...nameTextStyle },
    };
  };
  return Array.isArray(axis) ? axis.map(apply) : apply(axis);
}

/** 统一图表视觉：色板、字号、坐标轴与浮动提示框。 */
export function withChartTheme(option: EChartsOption, isDark: boolean): EChartsOption {
  const tooltip = typeof option.tooltip === "object" && !Array.isArray(option.tooltip) ? option.tooltip : {};
  return {
    color: CHART_PALETTE,
    textStyle: {
      fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      color: isDark ? "#cbd5e1" : "#475569",
    },
    animationDuration: 500,
    animationEasing: "cubicOut",
    ...option,
    tooltip: {
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.97)",
      borderColor: isDark ? "rgba(71, 85, 105, 0.6)" : "rgba(203, 213, 225, 0.9)",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: isDark ? "#e2e8f0" : "#334155", fontSize: 12 },
      extraCssText:
        "border-radius: 10px; box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.18); backdrop-filter: blur(6px);",
      ...tooltip,
    },
    xAxis: styleAxis(option.xAxis as AxisOption | AxisOption[], isDark),
    yAxis: styleAxis(option.yAxis as AxisOption | AxisOption[], isDark),
  };
}

interface ThemedChartProps {
  option: EChartsOption;
  height?: number;
  style?: CSSProperties;
  onEvents?: Record<string, (params: unknown) => void>;
}

/**
 * 图表统一外壳：注入共享色板与坐标轴样式，并跟随全局浅色/深色主题切换，
 * 同时强制背景透明以融入卡片，避免深色模式下出现深蓝底板。
 */
export default function ThemedChart({ option, height = 260, style, onEvents }: ThemedChartProps) {
  const theme = useUiStore((state) => state.theme);
  const isDark = theme === "dark";
  const merged = withChartTheme({ backgroundColor: "transparent", ...option }, isDark);

  return (
    <ReactECharts
      option={merged}
      theme={isDark ? "dark" : undefined}
      style={{ height, ...style }}
      onEvents={onEvents}
      notMerge
    />
  );
}
