import type { ModelMeta } from "../api/types";

const LEVEL_TEXT: Record<ModelMeta["level"], string> = {
  trainable: "现场训练",
  pretrained: "预训练推理",
  structure: "结构展示",
};

const LEVEL_STYLE: Record<ModelMeta["level"], string> = {
  trainable: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  pretrained: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  structure: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function ModelCard({ model }: { model: ModelMeta }) {
  return (
    <article className="section-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{model.name}</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {model.alias ? `${model.alias} · ` : ""}
            {model.year ? `${model.year} · ` : ""}
            {model.params}
          </p>
        </div>
        <span className={`badge ${LEVEL_STYLE[model.level]}`}>{LEVEL_TEXT[model.level]}</span>
      </div>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{model.innovation}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {model.task}
        </span>
        {model.implemented ? (
          <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            已接入
          </span>
        ) : (
          <span className="badge bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            待接入
          </span>
        )}
      </div>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        结构：{model.structure_note || "待补充"}
      </p>
    </article>
  );
}
