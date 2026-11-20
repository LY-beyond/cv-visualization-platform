/** 训练任务状态：创建任务、订阅 SSE、回放历史曲线与评估结果。 */

import { create } from "zustand";

import { ApiError, api } from "../api/client";
import type { EvaluationResult, MetricPoint, TrainRequest, TrainTaskInfo } from "../api/types";

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function isRunning(task: TrainTaskInfo): boolean {
  return task.state === "queued" || task.state === "running";
}

interface TaskState {
  tasks: TrainTaskInfo[];
  currentId: string | null;
  current: TrainTaskInfo | null;
  metrics: MetricPoint[];
  logs: string[];
  evaluation: EvaluationResult | null;
  error: string | null;
  running: boolean;
  load: () => Promise<void>;
  create: (payload: TrainRequest) => Promise<void>;
  select: (id: string) => Promise<void>;
  reset: () => void;
}

let stream: EventSource | null = null;

function closeStream(): void {
  if (stream) {
    stream.close();
    stream = null;
  }
}

type SetState = (
  partial:
    | Partial<TaskState>
    | ((state: TaskState) => Partial<TaskState>),
) => void;
type GetState = () => TaskState;

async function refresh(taskId: string, set: SetState): Promise<void> {
  try {
    const task = await api.training.detail(taskId);
    const history = await api.training.history(taskId).catch(() => null);
    set((state) => ({
      current: task,
      tasks: state.tasks.map((item) => (item.id === taskId ? task : item)),
      metrics: history?.metrics?.length ? history.metrics : state.metrics,
      evaluation: history?.evaluation ?? state.evaluation,
      running: isRunning(task),
    }));
  } catch (error) {
    set({ error: messageOf(error, "任务状态刷新失败"), running: false });
  }
}

function attach(taskId: string, set: SetState, get: GetState): void {
  closeStream();
  const source = new EventSource(api.training.eventsUrl(taskId));
  stream = source;

  source.addEventListener("state", (raw) => {
    const event = raw as MessageEvent;
    if (typeof event.data !== "string" || !event.data) return;
    const data = JSON.parse(event.data) as {
      state?: TrainTaskInfo["state"];
      progress?: number;
      current_epoch?: number;
      total_epochs?: number;
    };
    set((state) => {
      if (!state.current || state.current.id !== taskId) return {};
      const next: TrainTaskInfo = {
        ...state.current,
        state: data.state ?? state.current.state,
        progress: data.progress ?? state.current.progress,
        current_epoch: data.current_epoch ?? state.current.current_epoch,
        total_epochs: data.total_epochs ?? state.current.total_epochs,
      };
      return {
        current: next,
        tasks: state.tasks.map((item) => (item.id === taskId ? next : item)),
        running: isRunning(next),
      };
    });
  });

  source.addEventListener("metric", (raw) => {
    const event = raw as MessageEvent;
    if (typeof event.data !== "string" || !event.data) return;
    const data = JSON.parse(event.data) as { payload: MetricPoint };
    set((state) => ({ metrics: [...state.metrics, data.payload] }));
  });

  source.addEventListener("log", (raw) => {
    const event = raw as MessageEvent;
    if (typeof event.data !== "string" || !event.data) return;
    const data = JSON.parse(event.data) as { message?: string };
    if (!data.message) return;
    set((state) => ({ logs: [...state.logs, data.message as string] }));
  });

  source.addEventListener("done", () => {
    closeStream();
    set({ running: false });
    void refresh(taskId, set);
  });

  source.addEventListener("error", (raw) => {
    const event = raw as MessageEvent;
    // 服务端推送的 error 事件带 data；浏览器原生连接错误没有 data
    if (typeof event.data !== "string" || !event.data) return;
    const data = JSON.parse(event.data) as { message?: string };
    closeStream();
    set({ error: data.message ?? "训练失败", running: false });
    void refresh(get().currentId ?? taskId, set);
  });
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentId: null,
  current: null,
  metrics: [],
  logs: [],
  evaluation: null,
  error: null,
  running: false,
  load: async () => {
    try {
      const tasks = await api.training.list();
      set((state) => ({
        tasks,
        currentId: state.currentId ?? tasks[0]?.id ?? null,
      }));
      const { currentId, current } = get();
      // 首次进入时自动回放最近一次训练，断网也能看到已保存结果
      if (!current && currentId) {
        await get().select(currentId);
      }
    } catch (error) {
      set({ error: messageOf(error, "训练任务列表加载失败") });
    }
  },
  create: async (payload) => {
    closeStream();
    set({ error: null, metrics: [], logs: [], evaluation: null, running: true });
    try {
      const task = await api.training.create(payload);
      set((state) => ({
        tasks: [task, ...state.tasks],
        currentId: task.id,
        current: task,
      }));
      attach(task.id, set, get);
    } catch (error) {
      set({ error: messageOf(error, "创建训练任务失败"), running: false });
    }
  },
  select: async (id) => {
    closeStream();
    set({
      currentId: id,
      metrics: [],
      logs: [],
      evaluation: null,
      error: null,
      running: false,
    });
    try {
      const task = await api.training.detail(id);
      const history = await api.training.history(id).catch(() => null);
      set({
        current: task,
        metrics: history?.metrics ?? [],
        evaluation: history?.evaluation ?? null,
        running: isRunning(task),
      });
      if (isRunning(task)) attach(id, set, get);
    } catch (error) {
      set({ error: messageOf(error, "任务详情加载失败") });
    }
  },
  reset: () => {
    closeStream();
    set({
      currentId: null,
      current: null,
      metrics: [],
      logs: [],
      evaluation: null,
      error: null,
      running: false,
    });
  },
}));
