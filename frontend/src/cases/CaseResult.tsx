import { useCallback, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";

import type { CaseOutput } from "../api/types";
import { diagnose, type DiagnosisLevel } from "../assistant/rules";
import Formula from "../viz/Formula";
import StepPlayer, { type StepPlayerStep } from "../viz/StepPlayer";
import ThemedChart from "../viz/ThemedChart";

interface CaseImage {
  title?: string;
  src: string;
  caption?: string;
}

interface CaseChart {
  title?: string;
  option: EChartsOption;
  height?: number;
}

const LEVEL_STYLE: Record<DiagnosisLevel, string> = {
  info: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/60 dark:bg-brand-900/20 dark:text-brand-300",
  warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300",
  error: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300",
};

const LEVEL_TEXT: Record<DiagnosisLevel, string> = { info: "提示", warn: "注意", error: "问题" };

interface CaseResultProps {
  output: CaseOutput;
  caseId?: string;
  caseName?: string;
  params?: Record<string, unknown>;
}

/** 统一渲染 CaseOutput：指标、图像、图表、当前计算、结果诊断与步骤回放。 */
export default function CaseResult({ output, caseId = "", caseName, params = {} }: CaseResultProps) {
  const images = useMemo(() => (output.images ?? []) as unknown as CaseImage[], [output]);
  const charts = useMemo(() => (output.charts ?? []) as unknown as CaseChart[], [output]);
  const steps = useMemo(() => (output.steps ?? []) as unknown as StepPlayerStep[], [output]);
  const metrics = Object.entries(output.metrics ?? {});
  const [currentStep, setCurrentStep] = useState<StepPlayerStep | null>(null);

  const onStepChange = useCallback((step: StepPlayerStep) => setCurrentStep(step), []);
  const activeStep = currentStep ?? steps[0];

  const diagnoses = useMemo(
    () =>
      diagnose({
        chapterId: "",
        chapterTitle: "",
        caseId,
        caseName,
        params,
        metrics: output.metrics ?? {},
        steps,
        resultSummary: { images: images.length, charts: charts.length },
      }),
    // 同一份 output 只计算一次诊断
    [caseId, caseName, params, output, steps, images.length],
  );

  return (
    <div className="space-y-5">
      {output.message && (
        <p className="rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 px-3 py-2 text-sm text-brand-700 ring-1 ring-brand-100 dark:from-brand-900/25 dark:to-violet-900/20 dark:text-brand-200 dark:ring-brand-900/40">
          {output.message}
        </p>
      )}

      {metrics.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([key, value]) => (
            <div
              key={key}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-500 via-violet-500 to-accent-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <p className="truncate text-xs text-slate-400" title={key}>
                {key}
              </p>
              <p className="mt-0.5 break-words font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {images.map((item, index) => (
            <figure
              key={`${item.title ?? "image"}-${index}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-brand-300 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700"
            >
              <div className="overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <img
                  src={item.src}
                  alt={item.title ?? "案例结果"}
                  className="w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              {(item.title || item.caption) && (
                <figcaption className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                  {item.title && (
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</p>
                  )}
                  {item.caption && <p className="mt-0.5 text-xs text-slate-400">{item.caption}</p>}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {charts.length > 0 && (
        <div className="grid gap-4">
          {charts.map((item, index) => (
            <div
              key={`${item.title ?? "chart"}-${index}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {item.title && (
                <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-brand-50/50 px-4 py-2 dark:border-slate-800 dark:from-slate-800/60 dark:to-brand-900/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-brand-500 to-violet-500" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</p>
                </div>
              )}
              <div className="p-3">
                <ThemedChart option={item.option} height={item.height ?? 260} />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeStep && (activeStep.formula || activeStep.description) && (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-brand-50/40 px-4 py-3 dark:border-slate-700 dark:from-slate-900 dark:to-brand-900/10">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-brand-500 to-violet-500" />
            当前计算
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {activeStep.title ?? "步骤"}
          </p>
          {(activeStep.latex || activeStep.formula) && (
            <Formula
              latex={activeStep.latex}
              fallback={activeStep.formula}
              className="mt-2 rounded-lg bg-white/80 px-3 py-1.5 font-mono text-xs text-brand-700 shadow-sm dark:bg-slate-800/60 dark:text-brand-300"
            />
          )}
          {activeStep.description && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {activeStep.description}
            </p>
          )}
        </div>
      )}

      {diagnoses.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            结果诊断
          </p>
          <ul className="mt-2 space-y-2">
            {diagnoses.slice(0, 4).map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className={`rounded-lg border border-l-4 px-3 py-2 transition-all duration-200 hover:translate-x-0.5 ${LEVEL_STYLE[item.level]}`}
              >
                <p className="text-xs font-semibold">
                  [{LEVEL_TEXT[item.level]}] {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div className="space-y-3">
          <StepPlayer steps={steps} onStepChange={onStepChange} />
          <details className="group rounded-xl border border-slate-200 transition-colors duration-200 hover:border-brand-200 dark:border-slate-700 dark:hover:border-brand-800">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300">
              查看全部步骤（{steps.length}）
              <svg viewBox="0 0 24 24" className="chevron ml-auto h-3.5 w-3.5 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <ol className="space-y-2 px-4 pb-3">
              {steps.map((step, index) => (
                <li key={`${step.title ?? "step"}-${index}`} className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {index + 1}. {step.title}
                  </span>
                  {step.description && <span className="ml-1">{step.description}</span>}
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}
