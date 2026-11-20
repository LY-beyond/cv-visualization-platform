import type { ModelMeta } from "../api/types";

const LEVEL_TEXT: Record<ModelMeta["level"], string> = {
  trainable: "现场训练",
  pretrained: "预训练推理",
  structure: "结构展示",
};

const LEVEL_STYLE: Record<ModelMeta["level"], string> = {
  trainable:
    "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm",
  pretrained:
    "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm",
  structure:
    "bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm",
};

/** 指标数字跨度很大（准确率 0.98、参数量 2859 万、AP 55.8），按量级选择小数位。 */
function formatMetric(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(4);
}

export default function ModelCard({ model }: { model: ModelMeta }) {
  const isReference = model.level === "structure";
  return (
    <article className="group card-interactive flex flex-col gap-3 overflow-hidden !p-5">
      {/* 顶部渐变装饰条 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-accent-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 transition-colors duration-200 group-hover:text-gradient-brand dark:text-white">
            {model.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {model.alias ? `${model.alias} · ` : ""}
            {model.year ? `${model.year} · ` : ""}
            {model.venue ? `${model.venue} · ` : ""}
            {model.params}
          </p>
        </div>
        <span className={`badge shrink-0 ${LEVEL_STYLE[model.level]}`}>{LEVEL_TEXT[model.level]}</span>
      </div>

      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{model.innovation}</p>

      <div className="flex flex-wrap gap-1.5">
        <span className="badge bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300">
          {model.task}
        </span>
        {isReference ? (
          <span className="badge bg-gradient-to-r from-slate-100 to-slate-200 text-slate-500 dark:from-slate-800 dark:to-slate-700 dark:text-slate-400">
            参考模型
          </span>
        ) : model.implemented ? (
          <span className="badge bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-sm">
            已接入 ✦
          </span>
        ) : (
          <span className="badge bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            待接入
          </span>
        )}
      </div>

      <p className="rounded-xl bg-gradient-to-r from-slate-50 to-brand-50/60 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:from-slate-800/60 dark:to-slate-800/40 dark:text-slate-400">
        <span className="font-semibold text-brand-600 dark:text-brand-400">结构：</span>
        {model.structure_note || "待补充"}
      </p>

      {model.preprocess && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          预处理：
          {model.preprocess.input_size.length === 2
            ? `${model.preprocess.input_size[0]}×${model.preprocess.input_size[1]} · `
            : ""}
          {model.preprocess.channel_order} · {model.preprocess.resize}
          {model.preprocess.mean.length > 0 &&
            ` · 均值 ${model.preprocess.mean.map((item) => item.toFixed(3)).join("/")}`}
        </p>
      )}

      {(model.metrics?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {model.metrics?.map((metric) => (
            <span
              key={metric.name}
              title={metric.note}
              className="badge bg-gradient-to-r from-emerald-500/10 to-teal-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:from-emerald-900/40 dark:to-teal-900/30 dark:text-emerald-300 dark:ring-emerald-500/20"
            >
              <span className="font-semibold">{metric.name}</span>{" "}
              <span className="font-mono text-[11px]">{formatMetric(metric.value)}</span>
            </span>
          ))}
        </div>
      )}

      {(model.paper_url || model.code_url) && (
        <div className="mt-auto flex flex-wrap gap-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
          {model.paper_url && (
            <a
              href={model.paper_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30 dark:hover:text-brand-200"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              论文
            </a>
          )}
          {model.code_url && (
            <a
              href={model.code_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-violet-600 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30 dark:hover:text-violet-200"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              官方代码
            </a>
          )}
        </div>
      )}

      {(model.labels?.length ?? 0) > 0 && (
        <p className="truncate text-xs text-slate-400" title={model.labels?.join("、")}>
          类别：{model.labels?.slice(0, 8).join("、")}
          {(model.labels?.length ?? 0) > 8 ? ` 等 ${model.labels?.length} 类` : ""}
        </p>
      )}
    </article>
  );
}
