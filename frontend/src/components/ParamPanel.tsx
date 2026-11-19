import { useState } from "react";

import type { ParamSpec } from "../api/types";

function initialValues(specs: ParamSpec[]): Record<string, unknown> {
  return Object.fromEntries(specs.map((spec) => [spec.name, spec.default]));
}

export default function ParamPanel({ specs }: { specs: ParamSpec[] }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(specs));

  if (specs.length === 0) {
    return <p className="text-sm text-slate-400">该案例暂无可调参数。</p>;
  }

  return (
    <div className="space-y-4">
      {specs.map((spec) => {
        const value = values[spec.name];
        return (
          <label key={spec.name} className="block text-sm">
            <span className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>{spec.label}</span>
              {spec.type !== "select" && spec.type !== "switch" && (
                <span className="font-mono text-xs text-slate-400">{String(value)}</span>
              )}
            </span>
            {spec.type === "select" ? (
              <select
                value={String(value)}
                onChange={(event) => setValues({ ...values, [spec.name]: event.target.value })}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
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
                checked={Boolean(value)}
                onChange={(event) => setValues({ ...values, [spec.name]: event.target.checked })}
                className="mt-2 h-4 w-4 rounded border-slate-300 text-brand-600"
              />
            ) : (
              <input
                type="range"
                min={spec.minimum ?? 0}
                max={spec.maximum ?? 100}
                step={spec.step ?? 1}
                value={Number(value ?? 0)}
                onChange={(event) => setValues({ ...values, [spec.name]: Number(event.target.value) })}
                className="mt-2 w-full accent-brand-600"
              />
            )}
            {spec.description && (
              <span className="mt-1 block text-xs text-slate-400">{spec.description}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
