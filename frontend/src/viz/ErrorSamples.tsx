import type { ErrorSample } from "../api/types";

export default function ErrorSamples({ samples }: { samples: ErrorSample[] }) {
  if (samples.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-orange-100 dark:from-rose-900/40 dark:to-orange-900/30">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-500 dark:text-rose-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 9l6 6M15 9l-6 6" />
          </svg>
        </div>
        <p className="text-sm text-slate-400">评估完成后在此展示被错分的样本</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {samples.map((sample) => (
        <figure
          key={`${sample.index}-${sample.predicted_label}`}
          className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
        >
          <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 p-2 dark:from-slate-800 dark:to-slate-900">
            <img
              src={sample.url ?? ""}
              alt={`真实 ${sample.true_label} 预测 ${sample.predicted_label}`}
              className="mx-auto h-20 w-20 rounded object-contain [image-rendering:pixelated] transition-transform duration-300 group-hover:scale-110"
            />
            <span className="absolute left-1.5 top-1.5 rounded-md bg-white/80 px-1 py-0.5 font-mono text-[10px] text-slate-500 backdrop-blur-sm dark:bg-slate-900/70 dark:text-slate-400">
              #{sample.index}
            </span>
          </div>
          <figcaption className="space-y-0.5 px-2 py-1.5 text-center text-[11px] leading-tight">
            <p className="truncate text-emerald-600 dark:text-emerald-400">真 {sample.true_label}</p>
            <p className="truncate text-rose-500 dark:text-rose-400">预 {sample.predicted_label}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
