/** 统一接口封装：错误提示、加载状态与类型转换。 */

import type {
  ApiResponse,
  CaseMeta,
  CaseOutput,
  CaseRequest,
  ComparisonItem,
  DatasetDetail,
  DatasetMeta,
  EvaluationResult,
  MetricPoint,
  ModelMeta,
  SampleList,
  TrainRequest,
  TrainTaskInfo,
} from "./types";

const API_BASE = "/api";

export class ApiError extends Error {
  code: number;
  status: number;

  constructor(message: string, code: number, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    // 非 JSON 响应（如静态文件）交给调用方处理
  }

  if (!response.ok || !body || body.code !== 0) {
    throw new ApiError(
      body?.message ?? `请求失败（HTTP ${response.status}）`,
      body?.code ?? response.status,
      response.status,
    );
  }
  return body.data;
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const api = {
  datasets: {
    list: (chapter?: string) => request<DatasetMeta[]>(`/datasets${query({ chapter })}`),
    detail: (id: string) => request<DatasetDetail>(`/datasets/${id}`),
    classes: (id: string) => request<string[]>(`/datasets/${id}/classes`),
    samples: (id: string, split = "train", offset = 0, limit = 24) =>
      request<SampleList>(`/datasets/${id}/samples${query({ split, offset, limit })}`),
  },
  models: {
    list: (chapter?: string, datasetId?: string) =>
      request<ModelMeta[]>(`/models${query({ chapter, dataset_id: datasetId })}`),
    detail: (id: string) => request<ModelMeta>(`/models/${id}`),
  },
  cases: {
    list: (chapter?: string) => request<CaseMeta[]>(`/cases${query({ chapter })}`),
    detail: (id: string) => request<CaseMeta>(`/cases/${id}`),
    execute: (id: string, payload: CaseRequest) =>
      request<CaseOutput>(`/cases/${id}/execute`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  training: {
    create: (payload: TrainRequest) =>
      request<TrainTaskInfo>("/training/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    list: () => request<TrainTaskInfo[]>("/training/tasks"),
    detail: (id: string) => request<TrainTaskInfo>(`/training/tasks/${id}`),
    comparison: (datasetId: string) =>
      request<ComparisonItem[]>(`/training/comparison${query({ dataset_id: datasetId })}`),
    evaluation: (id: string) => request<EvaluationResult>(`/training/tasks/${id}/evaluation`),
    history: (id: string) =>
      request<{ task_id: string; metrics: MetricPoint[]; evaluation: EvaluationResult | null }>(
        `/training/tasks/${id}/history`,
      ),
    eventsUrl: (id: string) => `${API_BASE}/training/tasks/${id}/events`,
  },
};
