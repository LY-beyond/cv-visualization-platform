import type { ComponentType } from "react";

import type { CaseMeta } from "../api/types";

export type CaseComponent = ComponentType<{ meta: CaseMeta }>;

/**
 * 前端交互案例注册表。
 * 新增纯前端案例时，在此登记案例标识与组件，章节页会自动挂载。
 */
const registry: Record<string, CaseComponent> = {};

export function getCaseComponent(caseId: string): CaseComponent | undefined {
  return registry[caseId];
}
