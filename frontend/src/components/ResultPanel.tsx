import type { ReactNode } from "react";

interface ResultPanelProps {
  title: string;
  hint?: string;
  children?: ReactNode;
}

export default function ResultPanel({ title, hint, children }: ResultPanelProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {children ?? <p className="mt-2 text-xs leading-relaxed text-slate-400">{hint}</p>}
    </div>
  );
}
