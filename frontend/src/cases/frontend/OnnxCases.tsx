import { useCallback, useEffect, useRef, useState } from "react";
import type { EChartsOption } from "echarts";

import { api } from "../../api/client";
import type { CaseMeta, CaseOutput } from "../../api/types";
import { isModelAvailable, loadManifest, loadModelConfig, pickModel, type ModelTask, type OrtModelConfig } from "../../inference/modelConfig";
import { runInference } from "../../inference/runner";
import CaseFrame from "../CaseFrame";
import CaseResult from "../CaseResult";

const SAMPLES: Record<ModelTask, { name: string; src: string }[]> = {
  detection: [
    { name: "检测课件示例", src: "/assets/course/ch5/ch5-yolov3.jpg" },
    { name: "两阶段检测", src: "/assets/course/ch5/ch5-two-stage.jpg" },
  ],
  segmentation: [
    { name: "分割课件示例", src: "/assets/course/ch4/ch4-deeplab.jpg" },
    { name: "FCN 结构", src: "/assets/course/ch4/ch4-fcn.jpg" },
  ],
};

function loadImageData(src: string, maxSide = 768): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("浏览器不支持 Canvas 2D"));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(context.getImageData(0, 0, width, height));
    };
    image.onerror = () => reject(new Error("示例图片加载失败"));
    image.src = src;
  });
}

function canvasFrom(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext("2d");
  context?.putImageData(imageData, 0, 0);
  return canvas;
}

function barOption(title: string, entries: [string, number][]): EChartsOption {
  return {
    title: { text: title, left: "center", textStyle: { fontSize: 12 } },
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 16, top: 40, bottom: 30 },
    xAxis: { type: "category", data: entries.map(([name]) => name), axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", axisLabel: { fontSize: 10 } },
    series: [{ type: "bar", barMaxWidth: 26, data: entries.map(([, value]) => value) }],
  };
}

interface OnnxPanelProps {
  meta: CaseMeta;
  task: ModelTask;
  fallbackCaseId: string;
  fallbackParams: Record<string, unknown>;
}

function OnnxPanel({ meta, task, fallbackCaseId, fallbackParams }: OnnxPanelProps) {
  const [phase, setPhase] = useState<"checking" | "ready" | "fallback">("checking");
  const [config, setConfig] = useState<OrtModelConfig | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<CaseOutput | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string>(SAMPLES[task][0].src);
  const uploadUrl = useRef<string | null>(null);
  const autoRun = useRef(false);

  const runFallback = useCallback(async () => {
    setBusy(true);
    try {
      const result = await api.cases.execute(fallbackCaseId, { params: fallbackParams });
      setOutput(result);
    } catch (fallbackError) {
      setError(fallbackError instanceof Error ? fallbackError.message : "示例案例加载失败");
    } finally {
      setBusy(false);
    }
  }, [fallbackCaseId, fallbackParams]);

  useEffect(() => {
    let cancelled = false;
    setPhase("checking");
    setOutput(null);
    setError(null);
    (async () => {
      try {
        const manifest = await loadManifest();
        const entry = pickModel(manifest, task);
        if (!entry) throw new Error("模型清单中没有该任务的配置");
        const loaded = await loadModelConfig(entry);
        const available = await isModelAvailable(loaded);
        if (cancelled) return;
        if (!available) {
          setPhase("fallback");
          setNote(
            `未检测到本地模型 ${entry.dir}/${loaded.modelUrl.split("/").pop()}，当前展示内置示例。将导出的 ONNX 文件放入 public/models/${entry.dir}/ 后刷新即可启用真实推理。`,
          );
          void runFallback();
          return;
        }
        setConfig(loaded);
        setPhase("ready");
        setNote(`模型已就绪：${loaded.name}（${loaded.inputSize[0]}×${loaded.inputSize[1]}，优先 WebGPU，失败回退 WASM）`);
      } catch (loadError) {
        if (cancelled) return;
        setPhase("fallback");
        setNote(`模型加载失败，已回退内置示例：${loadError instanceof Error ? loadError.message : "未知错误"}`);
        void runFallback();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [task, runFallback]);

  useEffect(
    () => () => {
      if (uploadUrl.current) URL.revokeObjectURL(uploadUrl.current);
    },
    [],
  );

  const infer = useCallback(
    async (src: string) => {
      if (!config) return;
      setBusy(true);
      setError(null);
      try {
        const imageData = await loadImageData(src);
        const startedAt = Date.now();
        const result = await runInference(
          task,
          { data: new Uint8ClampedArray(imageData.data), width: imageData.width, height: imageData.height },
          config,
        );
        const total = Date.now() - startedAt;
        const baseCanvas = canvasFrom(imageData);

        if (result.kind === "detection") {
          const context = baseCanvas.getContext("2d");
          if (context) {
            context.lineWidth = 2;
            context.font = "12px sans-serif";
            result.boxes.forEach((box) => {
              context.strokeStyle = box.color;
              context.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
              const label = `${box.label} ${(box.score * 100).toFixed(0)}%`;
              const labelWidth = context.measureText(label).width + 8;
              const labelY = Math.max(0, box.y1 - 16);
              context.fillStyle = box.color;
              context.fillRect(box.x1, labelY, labelWidth, 16);
              context.fillStyle = "#ffffff";
              context.fillText(label, box.x1 + 4, labelY + 12);
            });
          }
          const overlay = baseCanvas.toDataURL("image/png");
          const counts = Object.entries(result.counts).sort((a, b) => b[1] - a[1]);
          setOutput({
            images: [
              { title: "检测结果", src: overlay, caption: `共 ${result.boxes.length} 个目标，检测阈值 ${config.scoreThreshold}` },
            ],
            charts: counts.length > 0 ? [{ title: "类别统计", option: barOption("检测类别数量", counts) }] : [],
            metrics: {
              检测框数量: result.boxes.length,
              类别数量: counts.length,
              推理方式: "浏览器 ONNX",
              总耗时: `${total} ms`,
            },
            steps: [
              {
                title: "预处理",
                description: `letterbox 缩放到 ${config.inputSize[0]}×${config.inputSize[1]}，按 mean/std 归一化并转为 NCHW。`,
                formula: "x' = (x / 255 − mean) / std",
              },
              {
                title: "模型推理",
                description: `ONNX Runtime 执行 ${config.name}，推理耗时 ${result.timings.inference} ms。`,
                formula: "outputs = model(input)",
              },
              {
                title: "后处理",
                description: `按置信度 ${config.scoreThreshold} 过滤，按类别做 NMS（IoU ${config.iouThreshold}），还原到原图坐标。`,
                formula: "keep = NMS(score ≥ τ_conf, IoU ≤ τ_nms)",
              },
              {
                title: "结果叠加",
                description: `在原图上绘制 ${result.boxes.length} 个检测框并统计类别，耗时 ${result.timings.postprocess} ms。`,
                image: overlay,
              },
            ],
            message: `浏览器端推理完成：预处理 ${result.timings.preprocess} ms，推理 ${result.timings.inference} ms。`,
          } as unknown as CaseOutput);
        } else {
          const context = baseCanvas.getContext("2d");
          if (context && result.mask) {
            const maskCanvas = document.createElement("canvas");
            maskCanvas.width = result.mask.width;
            maskCanvas.height = result.mask.height;
            maskCanvas.getContext("2d")?.putImageData(
              new ImageData(new Uint8ClampedArray(result.mask.data), result.mask.width, result.mask.height),
              0,
              0,
            );
            context.imageSmoothingEnabled = false;
            context.drawImage(maskCanvas, 0, 0, imageData.width, imageData.height);
          }
          const overlay = baseCanvas.toDataURL("image/png");
          const totalPixels = imageData.width * imageData.height;
          const counts = Object.entries(result.counts)
            .filter(([label]) => label !== "background")
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
          const foreground = counts.reduce((sum, [, value]) => sum + value, 0);
          setOutput({
            images: [
              {
                title: "分割掩码叠加",
                src: overlay,
                caption: `语义类别 ${counts.length} 类，前景像素占比 ${((foreground / totalPixels) * 100).toFixed(1)}%`,
              },
            ],
            charts:
              counts.length > 0
                ? [
                    {
                      title: "类别像素占比",
                      option: barOption(
                        "类别像素占比（%）",
                        counts.map(([label, value]) => [label, Number(((value / totalPixels) * 100).toFixed(2))]),
                      ),
                    },
                  ]
                : [],
            metrics: {
              类别数量: counts.length,
              前景占比: `${((foreground / totalPixels) * 100).toFixed(1)}%`,
              推理方式: "浏览器 ONNX",
              总耗时: `${total} ms`,
            },
            steps: [
              {
                title: "预处理",
                description: `缩放到 ${config.inputSize[0]}×${config.inputSize[1]}，按 ImageNet 均值方差归一化。`,
                formula: "x' = (x / 255 − mean) / std",
              },
              {
                title: "模型推理",
                description: `ONNX Runtime 执行 ${config.name}，输出逐像素类别 logits，耗时 ${result.timings.inference} ms。`,
                formula: "logits = model(input)",
              },
              {
                title: "逐像素 argmax",
                description: "对每个像素在类别维度取最大得分，并按调色板着色。",
                formula: "label(p) = argmax_c logits[c, p]",
              },
              {
                title: "掩码叠加",
                description: `以半透明颜色叠加到原图，前景占比 ${((foreground / totalPixels) * 100).toFixed(1)}%。`,
                image: overlay,
              },
            ],
            message: `浏览器端推理完成：预处理 ${result.timings.preprocess} ms，推理 ${result.timings.inference} ms。`,
          } as unknown as CaseOutput);
        }
      } catch (inferenceError) {
        setError(inferenceError instanceof Error ? inferenceError.message : "推理失败");
      } finally {
        setBusy(false);
      }
    },
    [config, task],
  );

  // 模型就绪后自动跑一次示例，减少答辩现场操作
  useEffect(() => {
    if (phase === "ready" && config && !autoRun.current) {
      autoRun.current = true;
      void infer(currentSrc);
    }
  }, [phase, config, currentSrc, infer]);

  const onUpload = (file: File | null) => {
    if (!file) return;
    if (uploadUrl.current) URL.revokeObjectURL(uploadUrl.current);
    const url = URL.createObjectURL(file);
    uploadUrl.current = url;
    setCurrentSrc(url);
    if (config) void infer(url);
  };

  return (
    <CaseFrame meta={meta}>
      <div className="space-y-3">
        <p
          className={[
            "rounded-lg px-3 py-2 text-xs leading-relaxed",
            phase === "fallback"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200",
          ].join(" ")}
        >
          {phase === "checking" ? "正在检查本地模型…" : note}
        </p>

        {phase !== "checking" && (
          <div className="flex flex-wrap items-center gap-2">
            {SAMPLES[task].map((sample) => (
              <button
                key={sample.src}
                type="button"
                onClick={() => {
                  setCurrentSrc(sample.src);
                  if (config) void infer(sample.src);
                }}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
              >
                {sample.name}
              </button>
            ))}
            <label className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-brand-300 dark:border-slate-700 dark:text-slate-300">
              上传图片
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => onUpload(event.target.files?.[0] ?? null)}
              />
            </label>
            {config && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void infer(currentSrc)}
                className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {busy ? "推理中…" : "重新推理"}
              </button>
            )}
            {phase === "fallback" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runFallback()}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                重新加载示例
              </button>
            )}
          </div>
        )}

        {busy && <p className="py-4 text-center text-xs text-slate-400">正在浏览器内执行 ONNX 推理…</p>}

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {error}
          </p>
        )}

        {output && !busy && (
          <CaseResult output={output} caseId={meta.id} caseName={meta.name} params={{}} />
        )}
      </div>
    </CaseFrame>
  );
}

export function OnnxDetectCase({ meta }: { meta: CaseMeta }) {
  return (
    <OnnxPanel
      meta={meta}
      task="detection"
      fallbackCaseId="detect_overlay"
      fallbackParams={DETECT_FALLBACK_PARAMS}
    />
  );
}

export function OnnxSegmentCase({ meta }: { meta: CaseMeta }) {
  return (
    <OnnxPanel
      meta={meta}
      task="segmentation"
      fallbackCaseId="mask_overlay"
      fallbackParams={SEGMENT_FALLBACK_PARAMS}
    />
  );
}

const DETECT_FALLBACK_PARAMS = { conf: 0.5, iou: 0.45 };
const SEGMENT_FALLBACK_PARAMS = { alpha: 0.5 };
