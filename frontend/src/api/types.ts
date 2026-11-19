/** 与后端 schemas 对齐的接口类型定义。 */

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface ParamOption {
  label: string;
  value: string | number | boolean;
}

export interface ParamSpec {
  name: string;
  label: string;
  type: "number" | "slider" | "select" | "switch";
  default: unknown;
  minimum?: number | null;
  maximum?: number | null;
  step?: number | null;
  options: ParamOption[];
  description?: string | null;
}

export interface DatasetMeta {
  id: string;
  name: string;
  chapter: string;
  task: string;
  modality: string;
  description: string;
  class_names: string[];
  sample_count: number;
  example_image?: string | null;
  source: string;
}

export interface DatasetDetail extends DatasetMeta {
  splits: Record<string, number>;
  notes: string[];
}

export interface SampleRef {
  index: number;
  split: string;
  label?: number | null;
  label_name?: string | null;
  path?: string | null;
  url?: string | null;
}

export interface SampleList {
  dataset_id: string;
  split: string;
  total: number;
  items: SampleRef[];
}

export type ModelLevel = "trainable" | "pretrained" | "structure";

export interface ModelMeta {
  id: string;
  name: string;
  alias?: string | null;
  chapter: string;
  task: string;
  level: ModelLevel;
  year?: number | null;
  innovation: string;
  params: string;
  structure_note: string;
  pros: string[];
  cons: string[];
  datasets: string[];
  hyperparams: ParamSpec[];
  weight_path?: string | null;
  implemented: boolean;
}

export interface CaseMeta {
  id: string;
  name: string;
  chapter: string;
  description: string;
  implementation: "backend" | "frontend" | "hybrid";
  params: ParamSpec[];
  implemented: boolean;
}

export interface CaseRequest {
  params: Record<string, unknown>;
  image?: string | null;
  dataset_id?: string | null;
  sample_index?: number | null;
}

export interface CaseOutput {
  images: Record<string, unknown>[];
  overlay?: Record<string, unknown> | null;
  charts: Record<string, unknown>[];
  steps: Record<string, unknown>[];
  metrics: Record<string, unknown>;
  message: string;
}

export type TaskState =
  | "created"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface TrainRequest {
  model_id: string;
  dataset_id: string;
  hyperparams: Record<string, unknown>;
}

export interface TrainTaskInfo {
  id: string;
  model_id: string;
  dataset_id: string;
  hyperparams: Record<string, unknown>;
  state: TaskState;
  progress: number;
  current_epoch: number;
  total_epochs: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
  result_url?: string | null;
}

export interface MetricPoint {
  epoch: number;
  loss?: number | null;
  accuracy?: number | null;
  val_loss?: number | null;
  val_accuracy?: number | null;
}

export interface ErrorSample {
  dataset_id: string;
  index: number;
  true_label: string;
  predicted_label: string;
  url?: string | null;
}

export interface EvaluationResult {
  task_id: string;
  accuracy?: number | null;
  top5_accuracy?: number | null;
  confusion_matrix: number[][];
  class_names: string[];
  error_samples: ErrorSample[];
  embedding: Record<string, unknown>[];
}
