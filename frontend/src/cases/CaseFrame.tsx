import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { CaseMeta } from "../api/types";
import { caseLabOrigin } from "../data/labs";
import Formula from "../viz/Formula";
import { getGuidance } from "./guidance";

const IMPL_TEXT: Record<CaseMeta["implementation"], string> = {
  backend: "后端计算",
  frontend: "前端交互",
  hybrid: "前后端配合",
};

/** 案例卡片外壳：标题、原理、核心公式与建议区，前端案例与后端案例共用。 */
export default function CaseFrame({ meta, children }: { meta: CaseMeta; children: ReactNode }) {
  const guidance = getGuidance(meta.id);
  const hasExtra = guidance.hints.length > 0 || (guidance.pitfalls?.length ?? 0) > 0;
  const origin = caseLabOrigin[meta.id];
  const labNo = origin?.labId.replace("lab", "");

  return (
    <div id={`case-${meta.id}`} className="section-card scroll-mt-24 space-y-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-accent-400 opacity-80" />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <span className="text-gradient-brand">{meta.name}</span>
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meta.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {origin && (
            <Link
              to={`/labs/${origin.labId}#${origin.sectionId}`}
              className="badge bg-gradient-to-r from-brand-500/10 to-violet-500/10 text-brand-700 ring-1 ring-brand-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-brand-500/20 hover:to-violet-500/20 dark:from-brand-900/40 dark:to-violet-900/40 dark:text-brand-300 dark:ring-brand-500/20"
              title={`${origin.labTitle} · ${origin.sectionTitle}`}
            >
              来自上机实验 {labNo}
            </Link>
          )}
          <span className="badge bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300">
            {IMPL_TEXT[meta.implementation]}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/80 via-violet-50/50 to-accent-50/40 px-4 py-3 dark:border-brand-900/60 dark:from-brand-900/25 dark:via-violet-900/15 dark:to-slate-900/20">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-brand-200/40 to-violet-200/30 blur-2xl dark:from-brand-700/20 dark:to-violet-700/10" />
        <p className="relative flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-brand-500 to-violet-500" />
          原理
        </p>
        <p className="relative mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{guidance.principle}</p>
        {(guidance.latex || guidance.formula) && (
          <Formula
            latex={guidance.latex}
            fallback={guidance.formula}
            className="relative mt-2 rounded-lg bg-white/80 px-3 py-1.5 text-xs text-brand-700 shadow-sm dark:bg-slate-900/60 dark:text-brand-300"
          />
        )}
      </div>

      {hasExtra && (
        <details className="group rounded-xl border border-slate-200 transition-colors duration-200 hover:border-brand-200 dark:border-slate-700 dark:hover:border-brand-800">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            建议尝试与常见误区
            <svg viewBox="0 0 24 24" className="chevron ml-auto h-3.5 w-3.5 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="space-y-3 px-4 pb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {guidance.hints.length > 0 && (
              <div className="rounded-lg bg-gradient-to-br from-brand-50/70 to-white px-3 py-2 dark:from-brand-900/20 dark:to-slate-900/20">
                <p className="font-semibold text-brand-700 dark:text-brand-300">建议尝试</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {guidance.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}
            {(guidance.pitfalls?.length ?? 0) > 0 && (
              <div className="rounded-lg bg-gradient-to-br from-rose-50/70 to-white px-3 py-2 dark:from-rose-900/20 dark:to-slate-900/20">
                <p className="font-semibold text-rose-500 dark:text-rose-300">常见误区</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {guidance.pitfalls?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {children}
    </div>
  );
}
