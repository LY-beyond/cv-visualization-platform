import type { ReactNode } from "react";
import type { EChartsOption } from "echarts";

import ThemedChart from "../../viz/ThemedChart";
import type { LabChart } from "../../data/labs";

interface LabChartCardProps {
  chart: LabChart;
}

/** 实验数据卡：柱状图、折线图或表格，统一标注数据来源。 */
export default function LabChartCard({ chart }: LabChartCardProps) {
  let body: ReactNode;

  if (chart.kind === "table") {
    body = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {chart.data.columns.map((column) => (
                <th
                  key={column}
                  className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.data.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className={[
                      "px-3 py-2 align-top",
                      cellIndex === 0
                        ? "font-medium text-slate-700 dark:text-slate-200"
                        : "text-slate-600 dark:text-slate-300",
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    const unit = chart.data.unit ?? "";
    const isLine = chart.kind === "line";
    const option: EChartsOption = {
      grid: { left: 48, right: 24, top: 36, bottom: 44 },
      tooltip: { trigger: "axis", valueFormatter: (value) => `${value}${unit}` },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      xAxis: {
        type: "category",
        data: isLine ? chart.data.x : chart.data.categories,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: unit,
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { type: "dashed", opacity: 0.4 } },
      },
      series: chart.data.series.map((item) => ({
        name: item.name,
        type: isLine ? "line" : "bar",
        smooth: isLine,
        symbolSize: 6,
        barMaxWidth: 32,
        data: item.values,
        label: {
          show: !isLine && item.values.length <= 8,
          position: "top",
          fontSize: 10,
          formatter: (params: { value?: unknown }) => `${params.value}${unit}`,
        },
      })),
    };
    body = <ThemedChart option={option} height={280} />;
  }

  return (
    <article className="section-card">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{chart.title}</h4>
        <p className="mt-1 text-[11px] text-slate-400">数据来源：{chart.source}</p>
      </div>
      {body}
    </article>
  );
}
