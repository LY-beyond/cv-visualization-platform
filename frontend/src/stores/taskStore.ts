/** 训练任务状态：任务列表、当前任务与逐轮指标。 */

import { create } from "zustand";

import { api } from "../api/client";
import type { MetricPoint, TrainTaskInfo } from "../api/types";

interface TaskState {
  tasks: TrainTaskInfo[];
  currentId: string | null;
  metrics: MetricPoint[];
  load: () => Promise<void>;
  select: (id: string) => void;
  appendMetric: (point: MetricPoint) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  currentId: null,
  metrics: [],
  load: async () => {
    const tasks = await api.training.list();
    set({ tasks });
  },
  select: (id) => set({ currentId: id, metrics: [] }),
  appendMetric: (point) => set((state) => ({ metrics: [...state.metrics, point] })),
}));
