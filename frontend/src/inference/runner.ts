/** 主线程推理客户端：Worker 常驻，模型会话缓存在 Worker 内。 */

import type { InferenceImage, InferenceResult, ModelTask, OrtModelConfig, WorkerRequest, WorkerResponse } from "./modelConfig";

interface Pending {
  resolve: (result: InferenceResult) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<number, Pending>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./inference.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const task = pending.get(response.id);
    if (!task) return;
    pending.delete(response.id);
    if (response.ok && response.result) task.resolve(response.result);
    else task.reject(new Error(response.error ?? "推理失败"));
  };
  worker.onerror = (event) => {
    pending.forEach((task) => task.reject(new Error(event.message || "推理 Worker 异常")));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function runInference(
  task: ModelTask,
  image: InferenceImage,
  config: OrtModelConfig,
): Promise<InferenceResult> {
  const id = sequence + 1;
  sequence = id;
  const wasmPaths = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/models/ort/`;

  return new Promise<InferenceResult>((resolve, reject) => {
    const current = ensureWorker();
    pending.set(id, { resolve, reject });
    const request: WorkerRequest = { id, task, image, config, wasmPaths };
    current.postMessage(request, [image.data.buffer]);
  });
}

export function disposeInferenceWorker(): void {
  worker?.terminate();
  worker = null;
  pending.clear();
}
