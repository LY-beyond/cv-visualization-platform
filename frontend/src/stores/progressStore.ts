/** 学习进度：案例访问记录与关卡完成状态，保存在 localStorage，不依赖后端。 */

import { create } from "zustand";

import { learningLevels } from "../chapters/learningPath";

const STORAGE_KEY = "cvp:progress:v1";

export interface ProgressState {
  visitedCases: string[];
  completedLevels: string[];
  visitedLabs: string[];
  lastCase?: { chapterId: string; caseId: string; at: number };
}

interface ProgressActions {
  visitCase: (chapterId: string, caseId: string) => void;
  visitLab: (labId: string) => void;
  reset: () => void;
}

const emptyState: ProgressState = { visitedCases: [], completedLevels: [], visitedLabs: [] };

function loadState(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      visitedCases: Array.isArray(parsed.visitedCases) ? parsed.visitedCases.map(String) : [],
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels.map(String) : [],
      visitedLabs: Array.isArray(parsed.visitedLabs) ? parsed.visitedLabs.map(String) : [],
      lastCase:
        parsed.lastCase && parsed.lastCase.caseId
          ? {
              chapterId: String(parsed.lastCase.chapterId ?? ""),
              caseId: String(parsed.lastCase.caseId),
              at: Number(parsed.lastCase.at ?? Date.now()),
            }
          : undefined,
    };
  } catch {
    return emptyState;
  }
}

function saveState(state: ProgressState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 隐私模式或存储已满时静默失败，进度仅保留在内存中
  }
}

/** 关卡下的案例全部访问过即视为完成。 */
function computeCompleted(visited: string[]): string[] {
  return learningLevels
    .filter((level) => level.cases.length > 0 && level.cases.every((item) => visited.includes(item.caseId)))
    .map((level) => level.id);
}

export const useProgressStore = create<ProgressState & ProgressActions>((set, get) => ({
  ...loadState(),
  visitCase: (chapterId, caseId) => {
    const previous = get();
    const visited = previous.visitedCases.includes(caseId)
      ? previous.visitedCases
      : [...previous.visitedCases, caseId];
    const next: ProgressState = {
      visitedCases: visited,
      completedLevels: computeCompleted(visited),
      visitedLabs: previous.visitedLabs,
      lastCase: { chapterId, caseId, at: Date.now() },
    };
    saveState(next);
    set(next);
  },
  visitLab: (labId) => {
    const previous = get();
    if (previous.visitedLabs.includes(labId)) return;
    const next: ProgressState = { ...previous, visitedLabs: [...previous.visitedLabs, labId] };
    saveState(next);
    set(next);
  },
  reset: () => {
    saveState(emptyState);
    set({ ...emptyState });
  },
}));

export function progressPercent(visited: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(visited, total) / total) * 100);
}
