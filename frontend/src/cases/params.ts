import { useCallback, useState } from "react";

import type { ParamSpec } from "../api/types";

export function defaultValues(specs: ParamSpec[]): Record<string, unknown> {
  return Object.fromEntries(specs.map((spec) => [spec.name, spec.default]));
}

export function useCaseValues(specs: ParamSpec[]) {
  const [values, setValues] = useState<Record<string, unknown>>(() => defaultValues(specs));
  const setValue = useCallback((name: string, value: unknown) => {
    setValues((previous) => ({ ...previous, [name]: value }));
  }, []);
  return { values, setValue };
}

export function numberValue(values: Record<string, unknown>, name: string, fallback = 0): number {
  const parsed = Number(values[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function stringValue(values: Record<string, unknown>, name: string, fallback = ""): string {
  const value = values[name];
  return value === undefined || value === null ? fallback : String(value);
}
