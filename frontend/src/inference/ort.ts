/**
 * onnxruntime-web 初始化：优先 WebGPU，失败回退 WASM。
 * 仅在执行推理的 Worker 中调用，避免阻塞主线程。
 */

import * as ort from "onnxruntime-web";

let configured = false;

export function configureOrt(wasmPaths: string): void {
  if (configured) return;
  // 单线程 WASM 不依赖 SharedArrayBuffer，断网静态托管也能运行
  ort.env.wasm.wasmPaths = wasmPaths;
  ort.env.wasm.numThreads = 1;
  ort.env.logLevel = "error";
  configured = true;
}

const sessionCache = new Map<string, ort.InferenceSession>();

export async function getSession(modelUrl: string): Promise<ort.InferenceSession> {
  const cached = sessionCache.get(modelUrl);
  if (cached) return cached;

  const response = await fetch(modelUrl);
  if (!response.ok) throw new Error("模型文件加载失败，请确认本地模型路径");
  const bytes = await response.arrayBuffer();

  const hasGPU = typeof navigator !== "undefined" && "gpu" in navigator;
  if (hasGPU) {
    try {
      const session = await ort.InferenceSession.create(bytes, {
        executionProviders: ["webgpu"],
        graphOptimizationLevel: "all",
      });
      sessionCache.set(modelUrl, session);
      return session;
    } catch {
      // WebGPU 不可用时继续尝试 WASM
    }
  }

  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  sessionCache.set(modelUrl, session);
  return session;
}
