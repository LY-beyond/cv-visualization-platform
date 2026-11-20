/**
 * 学习助手上下文：由案例工作台写入当前章节、案例、参数、指标与步骤，
 * 助手抽屉与结果诊断卡共用同一份数据，离线即可工作。
 */

import { create } from "zustand";

export interface AssistantStep {
  title?: string;
  description?: string;
  formula?: string;
}

export interface AssistantContext {
  chapterId: string;
  chapterTitle: string;
  caseId?: string;
  caseName?: string;
  params: Record<string, unknown>;
  metrics: Record<string, unknown>;
  steps: AssistantStep[];
  resultSummary: { images: number; charts: number };
}

interface AssistantStore {
  context: AssistantContext | null;
  open: boolean;
  setContext: (context: AssistantContext) => void;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useAssistantStore = create<AssistantStore>((set, get) => ({
  context: null,
  open: false,
  setContext: (context) => set({ context }),
  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
}));

export interface ContextInput {
  chapterId: string;
  chapterTitle: string;
  caseId?: string;
  caseName?: string;
  params?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  steps?: AssistantStep[];
  images?: unknown[];
  charts?: unknown[];
}

export function buildAssistantContext(input: ContextInput): AssistantContext {
  return {
    chapterId: input.chapterId,
    chapterTitle: input.chapterTitle,
    caseId: input.caseId,
    caseName: input.caseName,
    params: input.params ?? {},
    metrics: input.metrics ?? {},
    steps: input.steps ?? [],
    resultSummary: {
      images: input.images?.length ?? 0,
      charts: input.charts?.length ?? 0,
    },
  };
}
