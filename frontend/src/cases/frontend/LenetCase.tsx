import { useEffect, useRef, useState } from "react";

import type { CaseMeta } from "../../api/types";
import CaseFrame from "../CaseFrame";
import {
  classifyDigit,
  grayFromCanvas,
  grayFromImage,
  type LenetPreprocess,
} from "../../inference/lenet";

const SIZE = 280; // 画板逻辑尺寸，降采样到 28×28
const MODES: { value: LenetPreprocess; label: string; hint: string }[] = [
  { value: "raw", label: "MNIST 原图", hint: "直接缩放到 28×28，适合黑底白字的 MNIST 样本" },
  { value: "auto", label: "自动整理笔画", hint: "反色→二值化→外接框裁剪→等比 20×20→居中" },
];

function prepareCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 22;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#111827";
}

/** ch3：LeNet 手写数字在线识别（实验三教师模型 ONNX 推理）。 */
export default function LenetCase({ meta }: { meta: CaseMeta }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<LenetPreprocess>("auto");
  const [probs, setProbs] = useState<number[] | null>(null);
  const [preview, setPreview] = useState<Float32Array | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (canvasRef.current) prepareCanvas(canvasRef.current);
  }, []);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !preview) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(28, 28);
    for (let i = 0; i < preview.length; i += 1) {
      const value = Math.round(preview[i] * 255);
      image.data[i * 4] = value;
      image.data[i * 4 + 1] = value;
      image.data[i * 4 + 2] = value;
      image.data[i * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }, [preview]);

  const pointOf = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    lastRef.current = pointOf(event);
    canvas.setPointerCapture(event.pointerId);
    // 起笔先点一个圆，避免单击没有笔画
    const context = canvas.getContext("2d");
    const point = lastRef.current;
    if (context) {
      context.beginPath();
      context.arc(point.x, point.y, 11, 0, Math.PI * 2);
      context.fillStyle = "#111827";
      context.fill();
    }
  };

  const moveDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const last = lastRef.current;
    if (!canvas || !context || !last) return;
    const point = pointOf(event);
    context.beginPath();
    context.moveTo(last.x, last.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastRef.current = point;
  };

  const endDraw = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  const recognize = async (source?: Float32Array) => {
    const canvas = canvasRef.current;
    if (!source && !canvas) return;
    setBusy(true);
    setStatus(null);
    try {
      const gray = source ?? grayFromCanvas(canvas as HTMLCanvasElement);
      const result = await classifyDigit(gray, mode);
      setProbs(result.probs);
      setPreview(result.preview);
      setElapsed(result.elapsedMs);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "识别失败，请确认模型文件存在");
    } finally {
      setBusy(false);
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) prepareCanvas(canvasRef.current);
    setProbs(null);
    setPreview(null);
    setElapsed(null);
    setStatus(null);
  };

  const uploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = new Image();
    image.onload = () => {
      const gray = grayFromImage(image);
      // 上传图同时回显到画板，便于和手写结果对照
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (canvas && context) {
        prepareCanvas(canvas);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
      void recognize(gray);
    };
    image.src = URL.createObjectURL(file);
    event.target.value = "";
  };

  const top3 = probs
    ? probs
        .map((value, index) => ({ digit: index, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
    : [];

  return (
    <CaseFrame meta={meta}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  mode === item.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
                }`}
                title={item.hint}
              >
                {item.label}
              </button>
            ))}
          </div>
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            className="w-full touch-none cursor-crosshair rounded-xl border border-slate-300 bg-white shadow-inner dark:border-slate-600"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void recognize()}
              disabled={busy}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "识别中…" : "识别数字"}
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
            >
              清空
            </button>
            <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-brand-300 dark:border-slate-700 dark:text-slate-300">
              上传图片
              <input type="file" accept="image/*" className="hidden" onChange={uploadImage} />
            </label>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            模型为实验三教师模型 <span className="font-mono">LeNet-teacher.keras</span> 转换的 61,706 个参数，
            纯 JS 前向推理，不依赖网络或 wasm 运行时。
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">送入网络的 28×28</p>
              <canvas
                ref={previewRef}
                width={28}
                height={28}
                className="mt-2 h-28 w-28 rounded-lg border border-slate-200 bg-slate-900 [image-rendering:pixelated] dark:border-slate-700"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Top-3 概率（{MODES.find((item) => item.value === mode)?.label}）
              </p>
              {top3.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">在左侧画板写一个 0~9 的数字，然后点击「识别数字」。</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {top3.map((item, index) => (
                    <div key={item.digit}>
                      <div className="flex items-center justify-between text-xs">
                        <span className={index === 0 ? "font-semibold text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400"}>
                          数字 {item.digit}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {(item.value * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full ${index === 0 ? "bg-brand-500" : "bg-slate-400"}`}
                          style={{ width: `${Math.max(1, item.value * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {elapsed !== null && (
                    <p className="text-[11px] text-slate-400">推理耗时 {elapsed.toFixed(1)} ms</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {status && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{status}</p>}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="font-semibold">高概率不等于正确</p>
            <p className="mt-1">
              实验三报告中，学生模型把一张「9」以 99.87% 的置信度误判为「4」。遇到结果与书写不符时，
              先检查笔画粗细、是否居中、是否超出 28×28 边界，再切换另一种预处理对比。
            </p>
          </div>
        </div>
      </div>
    </CaseFrame>
  );
}
