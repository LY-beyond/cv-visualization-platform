import type { ParamSpec } from "../api/types";

interface ParamPanelProps {
  specs: ParamSpec[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}

/** 受控参数面板：数值与变更统一由父组件持有，便于执行案例时直接读取。 */
export default function ParamPanel({ specs, values, onChange }: ParamPanelProps) {
  if (specs.length === 0) {
    return <p className="text-sm text-slate-400">该案例暂无可调参数。</p>;
  }

  return (
    <div className="grid gap-4 rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50/40 p-4 dark:from-slate-800/60 dark:to-slate-800/30 sm:grid-cols-2">
      {specs.map((spec) => {
        const value = values[spec.name];
        const minimum = spec.minimum ?? 0;
        const maximum = spec.maximum ?? 100;
        const percent = Math.max(
          0,
          Math.min(100, ((Number(value ?? 0) - minimum) / Math.max(1, maximum - minimum)) * 100),
        );
        return (
          <label key={spec.name} className="block text-sm">
            <span className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
              <span className="font-medium">{spec.label}</span>
              {spec.type !== "select" && spec.type !== "switch" && (
                <span className="rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                  {String(value)}
                </span>
              )}
            </span>
            {spec.type === "select" ? (
              <select
                value={String(value)}
                onChange={(event) => onChange(spec.name, event.target.value)}
                className="input-base mt-1.5"
              >
                {spec.options.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : spec.type === "switch" ? (
              <span className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => onChange(spec.name, event.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
                />
                <span className="text-xs text-slate-400">{Boolean(value) ? "已开启" : "已关闭"}</span>
              </span>
            ) : spec.type === "number" ? (
              <input
                type="number"
                min={spec.minimum ?? undefined}
                max={spec.maximum ?? undefined}
                step={spec.step ?? 1}
                value={Number(value ?? 0)}
                onChange={(event) => onChange(spec.name, Number(event.target.value))}
                className="input-base mt-1.5"
              />
            ) : (
              <input
                type="range"
                min={minimum}
                max={maximum}
                step={spec.step ?? 1}
                value={Number(value ?? 0)}
                onChange={(event) => onChange(spec.name, Number(event.target.value))}
                className="mt-2.5 w-full"
                style={{ ["--range-progress" as string]: `${percent}%` }}
              />
            )}
            {spec.description && (
              <span className="mt-1 block text-xs leading-relaxed text-slate-400">{spec.description}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
