/** 模型对比面板：同一数据集上各模型最近一次评估的横向比较。 */

import { useEffect, useState } from "react";

import { ApiError, api } from "../api/client";
import type { ComparisonItem } from "../api/types";

interface ModelComparisonProps {
  datasetId: string | null;
  /** 任务或数据集变化时触发重新拉取，由父组件拼接。 */
  refreshKey: string;
}

function MiniMatrix({ matrix, classNames }: { matrix: number[][]; classNames: string[] }) {
  if (matrix.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-400">暂无混淆矩阵</p>;
  }
  const max = Math.max(...matrix.flat(), 1);
  return (
    <div
      className="grid gap-px rounded-md border border-slate-200 bg-slate-200 p-px dark:border-slate-700 dark:bg-slate-700"
      style={{ gridTemplateColumns: `repeat(${matrix.length}, minmax(0, 1fr))` }}
    >
      {matrix.flatMap((row, rowIndex) =>
        row.map((value, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            title={`${classNames[rowIndex] ?? rowIndex} → ${classNames[columnIndex] ?? columnIndex}：${value}`}
            className="aspect-square rounded-[2px]"
            style={{
              backgroundColor:
                value === 0
                  ? "rgba(148, 163, 184, 0.18)"
                  : `rgba(21, 80, 220, ${0.15 + 0.85 * (value / max)})`,
            }}
          />
        )),
      )}
    </div>
  );
}

export default function ModelComparison({ datasetId, refreshKey }: ModelComparisonProps) {
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.training
      .comparison(datasetId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((reason) => {
        if (!cancelled) {
          setItems([]);
          setError(reason instanceof ApiError ? reason.message : "模型对比加载失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [datasetId, refreshKey]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">模型对比</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          同一数据集上各模型最近一次评估按准确率排序，训练完成后自动刷新。
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="section-card text-sm text-slate-400">对比数据加载中…</p>
      ) : items.length === 0 ? (
        <div className="section-card border-dashed text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            该数据集暂无已完成训练并评估的模型，训练后即可在此对比。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const score = Math.round((item.accuracy ?? 0) * 100);
            return (
              <div key={item.task_id} className="section-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.model_name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{item.model_id}</p>
                  </div>
                  <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    Top-1 {score}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Top-5{" "}
                    {item.top5_accuracy != null ? `${(item.top5_accuracy * 100).toFixed(2)}%` : "—"}
                  </span>
                  <span>参数量：{item.params || "—"}</span>
                  {item.finished_at && <span>完成于 {item.finished_at}</span>}
                </div>

                <div>
                  <p className="mb-1.5 text-xs text-slate-400">混淆矩阵</p>
                  <MiniMatrix matrix={item.confusion_matrix} classNames={item.class_names} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
