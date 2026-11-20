import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../api/client";
import type { CaseMeta, CaseOutput } from "../api/types";
import { buildAssistantContext, useAssistantStore } from "../assistant/context";
import { findChapter } from "../chapters/config";
import ParamPanel from "../components/ParamPanel";
import { useProgressStore } from "../stores/progressStore";
import CaseFrame from "./CaseFrame";
import CaseResult from "./CaseResult";
import { defaultValues } from "./params";
import { getCaseComponent } from "./registry";

export default function CaseWorkbench({ meta }: { meta: CaseMeta }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => defaultValues(meta.params));
  const [output, setOutput] = useState<CaseOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const requestId = useRef(0);
  const setAssistantContext = useAssistantStore((state) => state.setContext);
  const visitCase = useProgressStore((state) => state.visitCase);

  const canRun = meta.implemented && meta.implementation !== "frontend";

  // 把当前案例上下文同步给学习助手，参数或结果变化时自动更新
  useEffect(() => {
    const chapter = findChapter(meta.chapter);
    setAssistantContext(
      buildAssistantContext({
        chapterId: meta.chapter,
        chapterTitle: chapter?.title ?? meta.chapter,
        caseId: meta.id,
        caseName: meta.name,
        params: values,
        metrics: output?.metrics ?? {},
        steps: (output?.steps ?? []) as unknown as { title?: string; description?: string; formula?: string }[],
        images: output?.images ?? [],
        charts: output?.charts ?? [],
      }),
    );
  }, [meta.chapter, meta.id, meta.name, values, output, setAssistantContext]);

  // 前端交互案例没有执行请求，打开即视为访问
  useEffect(() => {
    if (getCaseComponent(meta.id)) visitCase(meta.chapter, meta.id);
  }, [meta.chapter, meta.id, visitCase]);

  useEffect(() => {
    setValues(defaultValues(meta.params));
    setOutput(null);
    setError(null);
  }, [meta.id, meta.params]);

  const run = useCallback(async () => {
    if (!canRun) return;
    const ticket = requestId.current + 1;
    requestId.current = ticket;
    setRunning(true);
    setError(null);
    try {
      const result = await api.cases.execute(meta.id, { params: values });
      if (ticket === requestId.current) {
        setOutput(result);
        visitCase(meta.chapter, meta.id);
      }
    } catch (err) {
      if (ticket === requestId.current) {
        setOutput(null);
        setError(err instanceof Error ? err.message : "案例执行失败");
      }
    } finally {
      if (ticket === requestId.current) setRunning(false);
    }
  }, [canRun, meta.id, values]);

  // 参数变化后自动重算，避免每次手动点击执行
  useEffect(() => {
    if (!canRun) return;
    const timer = window.setTimeout(() => {
      void run();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [canRun, run]);

  const Custom = getCaseComponent(meta.id);
  if (Custom) return <Custom meta={meta} />;

  return (
    <CaseFrame meta={meta}>
      <ParamPanel
        specs={meta.params}
        values={values}
        onChange={(name, value) => setValues((previous) => ({ ...previous, [name]: value }))}
      />

      {canRun && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={running}
            onClick={() => void run()}
            className="btn-gradient !px-4 !py-2 !text-xs disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                计算中…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
                重新计算
              </span>
            )}
          </button>
          <span className="text-xs text-slate-400">参数变化后会自动更新结果</span>
        </div>
      )}

      {!canRun && (
        <p className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200 dark:from-amber-900/25 dark:to-orange-900/20 dark:text-amber-300 dark:ring-amber-500/30">
          {meta.implementation === "frontend"
            ? "该前端交互组件尚未注册，敬请期待。"
            : "该案例的后端计算尚未接入。"}
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200 dark:from-rose-900/25 dark:to-orange-900/20 dark:text-rose-300 dark:ring-rose-500/30">
          {error}
        </p>
      )}

      {running && !output && (
        <p className="py-8 text-center text-sm text-slate-400">正在计算案例结果…</p>
      )}

      {output && <CaseResult output={output} caseId={meta.id} caseName={meta.name} params={values} />}
    </CaseFrame>
  );
}
