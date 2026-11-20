/**
 * 浏览器端推理模型配置：与参考站一致，每个模型一份 JSON，
 * 声明输入尺寸、归一化、标签、阈值与配色；模型缺失时由案例降级。
 */

const modelsRoot = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/models`;

export type ModelTask = "detection" | "segmentation";

export interface ModelManifestEntry {
  id: string;
  task: ModelTask;
  name: string;
  dir: string;
  hint?: string;
  license?: string;
}

export interface ModelManifest {
  version: number;
  models: ModelManifestEntry[];
}

export interface OrtModelConfig {
  id: string;
  name: string;
  task: ModelTask;
  modelUrl: string;
  inputSize: [number, number];
  layout: "NCHW";
  mean: number[];
  std: number[];
  scoreThreshold: number;
  iouThreshold: number;
  outputFormat: "yolov8" | "yolov5" | "segmentation";
  labels: string[];
  palette: string[];
}

interface RawModelConfig {
  modelPath: string;
  labelsPath: string;
  inputSize: [number, number];
  layout?: "NCHW";
  mean?: number[];
  std?: number[];
  scoreThreshold?: number;
  iouThreshold?: number;
  outputFormat?: "yolov8" | "yolov5" | "segmentation";
  palette?: string[];
}

export interface InferenceImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
  classId: number;
  label: string;
  color: string;
}

export interface SegmentationMask {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface DetectionResult {
  kind: "detection";
  boxes: DetectionBox[];
  counts: Record<string, number>;
  timings: { preprocess: number; inference: number; postprocess: number };
}

export interface SegmentationResult {
  kind: "segmentation";
  mask: SegmentationMask;
  counts: Record<string, number>;
  timings: { preprocess: number; inference: number; postprocess: number };
}

export type InferenceResult = DetectionResult | SegmentationResult;

export interface WorkerRequest {
  id: number;
  task: ModelTask;
  image: InferenceImage;
  config: OrtModelConfig;
  wasmPaths: string;
}

export interface WorkerResponse {
  id: number;
  ok: boolean;
  result?: InferenceResult;
  error?: string;
}

export function modelUrl(relativePath: string): string {
  return `${modelsRoot}/${relativePath}`;
}

export async function loadManifest(): Promise<ModelManifest> {
  const response = await fetch(modelUrl("manifest.json"));
  if (!response.ok) throw new Error("模型清单不存在");
  return (await response.json()) as ModelManifest;
}

export async function loadModelConfig(entry: ModelManifestEntry): Promise<OrtModelConfig> {
  const dir = `${entry.dir}/`;
  const [rawResponse, labelsResponse] = await Promise.all([
    fetch(modelUrl(`${dir}config.json`)),
    fetch(modelUrl(`${dir}labels.json`)),
  ]);
  if (!rawResponse.ok) throw new Error(`模型配置缺失：${entry.dir}/config.json`);
  const raw = (await rawResponse.json()) as RawModelConfig;
  const labels = labelsResponse.ok ? ((await labelsResponse.json()) as string[]) : [];

  return {
    id: entry.id,
    name: entry.name,
    task: entry.task,
    modelUrl: modelUrl(`${dir}${raw.modelPath}`),
    inputSize: raw.inputSize ?? [640, 640],
    layout: raw.layout ?? "NCHW",
    mean: raw.mean ?? [0, 0, 0],
    std: raw.std ?? [1, 1, 1],
    scoreThreshold: raw.scoreThreshold ?? 0.35,
    iouThreshold: raw.iouThreshold ?? 0.45,
    outputFormat: raw.outputFormat ?? (entry.task === "segmentation" ? "segmentation" : "yolov8"),
    labels,
    palette: raw.palette ?? [],
  };
}

/** 通过响应头判断模型文件是否真实存在，避免把 SPA 回退页当作模型。 */
export async function isModelAvailable(config: OrtModelConfig): Promise<boolean> {
  try {
    const response = await fetch(config.modelUrl, { method: "HEAD" });
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) return false;
    const length = Number(response.headers.get("content-length") ?? "0");
    return Number.isFinite(length) ? length > 100_000 : true;
  } catch {
    return false;
  }
}

export function pickModel(manifest: ModelManifest, task: ModelTask): ModelManifestEntry | undefined {
  return manifest.models.find((item) => item.task === task);
}
