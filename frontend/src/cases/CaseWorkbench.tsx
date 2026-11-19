import { useState } from "react";

import { api } from "../api/client";
import type { CaseMeta } from "../api/types";
import ParamPanel from "../components/ParamPanel";
import ResultPanel from "../components/ResultPanel";
import { getCaseComponent } from "./registry";

const IMPL_TEXT: Record<CaseMeta["implementation"], string> = {
  backend: "后端计算",
  frontend: "前端动画",
  hybrid: "前后端配合",
};

export default function CaseWorkbench({ meta }: { meta: CaseMeta }) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const Custom = getCaseComponent(meta.id);
  if (Custom) return <Custom meta={meta} />;

  const canRun = meta.implemented && meta.implementation !== "frontend";

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const output = await api.cases.execute(meta.id, { params: {} });
      setResult(JSON.stringify(output, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "案例执行失败");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="section-card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{meta.name}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meta.description}</p>
        </div>
        <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {IMPL_TEXT[meta.implementation]}
        </span>
      </div>

      <ParamPanel specs={meta.params} />

      {meta.implementation === "frontend" ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          纯前端案例：在 src/cases 中注册组件后即可在此挂载。
        </p>
      ) : (
        <button
          type="button"
          disabled={!canRun || running}
          onClick={run}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          {running ? "计算中…" : canRun ? "执行案例" : "后端算法待接入"}
        </button>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </p>
      )}
      {result && (
        <ResultPanel title="计算结果">
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {result}
          </pre>
        </ResultPanel>
      )}
    </div>
  );
}
