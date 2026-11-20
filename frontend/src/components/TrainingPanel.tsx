import { useEffect, useState } from "react";

import type { DatasetMeta, ModelMeta, ParamSpec, TrainTaskInfo } from "../api/types";
import { useTaskStore } from "../stores/taskStore";

const STATE_TEXT: Record<TrainTaskInfo["state"], string> = {
  created: "已创建",
  queued: "排队中",
  running: "训练中",
  succeeded: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

const STATE_STYLE: Record<TrainTaskInfo["state"], string> = {
  created: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300",
  queued: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300",
  running: "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm animate-pulse-glow",
  succeeded: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm",
  failed: "bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-sm",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

interface TrainingPanelProps {
  datasets: DatasetMeta[];
  datasetId: string | null;
  onDatasetChange: (id: string) => void;
  models: ModelMeta[];
}

function initialParams(specs: ParamSpec[]): Record<string, unknown> {
  return Object.fromEntries(specs.map((spec) => [spec.name, spec.default]));
}

export default function TrainingPanel({
  datasets,
  datasetId,
  onDatasetChange,
  models,
}: TrainingPanelProps) {
  const { tasks, current, error, running, create, select, load } = useTaskStore();

  const trainable = models.filter((model) => model.level === "trainable" && model.implemented);
  const available = trainable.filter(
    (model) => !datasetId || model.datasets.length === 0 || model.datasets.includes(datasetId),
  );

  const [modelId, setModelId] = useState<string>(available[0]?.id ?? "");
  const selected = available.find((model) => model.id === modelId) ?? null;
  const [params, setParams] = useState<Record<string, unknown>>(() =>
    initialParams(selected?.hyperparams ?? []),
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const next = available.find((model) => model.id === modelId) ?? available[0] ?? null;
    setModelId(next?.id ?? "");
  }, [datasetId]);

  useEffect(() => {
    const model = available.find((item) => item.id === modelId) ?? null;
    setParams(initialParams(model?.hyperparams ?? []));
  }, [modelId]);

  if (trainable.length === 0) {
    return (
      <div className="section-card border-dashed text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">模型训练</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          本章暂无可现场训练的模型，模型接入后将在此提供训练入口。
        </p>
      </div>
    );
  }

  const start = () => {
    if (!selected || !datasetId || running) return;
    void create({ model_id: selected.id, dataset_id: datasetId, hyperparams: params });
  };

  return (
    <div className="section-card relative overflow-hidden space-y-5">
      {/* 顶部渐变装饰 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-accent-400 opacity-70" />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            <span className="text-gradient-brand">模型训练</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            选择数据集与模型，设置超参数后开始训练；逐轮指标与评估结果实时推送。
          </p>
        </div>
        {current && (
          <span className={`badge ${STATE_STYLE[current.state]}`}>
            {STATE_TEXT[current.state]}
            {current.total_epochs > 0 && ` · ${current.current_epoch}/${current.total_epochs} 轮`}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-500 dark:text-slate-400">训练数据集</span>
          <select
            value={datasetId ?? ""}
            onChange={(event) => onDatasetChange(event.target.value)}
            className="input-base mt-1.5"
          >
            {datasets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500 dark:text-slate-400">模型</span>
          <select
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            disabled={available.length === 0}
            className="input-base mt-1.5 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
          >
            {available.length === 0 && <option value="">该数据集暂无可训练模型</option>}
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={start}
            disabled={!selected || !datasetId || running}
            className="btn-gradient w-full !justify-center disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                训练中…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                开始训练
              </span>
            )}
          </button>
        </div>
      </div>

      {selected && selected.hyperparams.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50/40 p-4 dark:from-slate-800/60 dark:to-slate-800/30 sm:grid sm:grid-cols-3">
          {selected.hyperparams.map((spec) => (
            <label key={spec.name} className="block text-sm">
              <span className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="font-medium">{spec.label}</span>
                <span className="font-mono text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded px-1.5 py-0.5">
                  {String(params[spec.name] ?? "")}
                </span>
              </span>
              {spec.type === "select" ? (
                <select
                  value={String(params[spec.name] ?? "")}
                  onChange={(event) =>
                    setParams({ ...params, [spec.name]: event.target.value })
                  }
                  className="input-base mt-1.5"
                >
                  {spec.options.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : spec.type === "switch" ? (
                <input
                  type="checkbox"
                  checked={Boolean(params[spec.name])}
                  onChange={(event) =>
                    setParams({ ...params, [spec.name]: event.target.checked })
                  }
                  className="mt-2 h-4 w-4 rounded border-slate-300 text-brand-600"
                />
              ) : (
                <input
                  type="range"
                  min={spec.minimum ?? 0}
                  max={spec.maximum ?? 100}
                  step={spec.step ?? 1}
                  value={Number(params[spec.name] ?? 0)}
                  onChange={(event) =>
                    setParams({ ...params, [spec.name]: Number(event.target.value) })
                  }
                  className="mt-2 w-full"
                  style={{
                    ["--range-progress" as string]: `${
                      ((Number(params[spec.name] ?? 0) - (spec.minimum ?? 0)) /
                        Math.max(1, (spec.maximum ?? 100) - (spec.minimum ?? 0))) *
                      100
                    }%`,
                  }}
                />
              )}
            </label>
          ))}
        </div>
      )}

      {current && (
        <div className="space-y-2">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full progress-gradient transition-all duration-500"
              style={{ width: `${Math.round((current.progress ?? 0) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            任务 <span className="font-mono">{current.id}</span> ·{" "}
            <span className="font-medium text-gradient-brand">{current.model_id}</span> @{" "}
            {current.dataset_id}
            {current.finished_at ? ` · 结束于 ${current.finished_at}` : ""}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200 dark:from-rose-900/30 dark:to-orange-900/20 dark:text-rose-300 dark:ring-rose-500/30">
          {error}
        </p>
      )}

      {tasks.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">训练记录</p>
          <div className="flex flex-wrap gap-2">
            {tasks.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void select(item.id)}
                className={[
                  "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  item.id === current?.id
                    ? "border-transparent bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-glow"
                    : "border-slate-200 bg-white text-slate-500 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand-700 dark:hover:text-brand-200",
                ].join(" ")}
              >
                {item.model_id} · {STATE_TEXT[item.state]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
