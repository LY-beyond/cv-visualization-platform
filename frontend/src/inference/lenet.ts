/**
 * LeNet-5 手写数字推理：实验三教师模型（Keras → ONNX）在浏览器内运行。
 *
 * 两种预处理与实验报告一致：
 * - raw：MNIST 原图，直接缩放到 28×28（黑底白字）；
 * - auto：自动整理笔画，反色 → 二值化 → 外接框裁剪 → 等比 20×20 → 居中 28×28。
 */

import { modelUrl } from "./modelConfig";

export type LenetPreprocess = "raw" | "auto";

export interface LenetResult {
  /** 10 类概率 */
  probs: number[];
  /** 预处理预览（0..1 灰度，28×28） */
  preview: Float32Array;
  elapsedMs: number;
}

const SIZE = 28;
const WEIGHTS_URL = modelUrl("lenet-mnist/weights.bin");

/**
 * 实验三教师模型的权重按层顺序拼接为 float32 二进制：
 * conv1 150 / b6 / conv2 2400 / b16 / fc1 48000 / b120 / fc2 10080 / b84 / fc3 840 / b10。
 */
const OFFSETS = {
  conv1W: 0,
  conv1B: 150,
  conv2W: 156,
  conv2B: 2556,
  fc1W: 2572,
  fc1B: 50572,
  fc2W: 50692,
  fc2B: 60772,
  fc3W: 60856,
  fc3B: 61696,
} as const;

let weightsPromise: Promise<Float32Array> | null = null;

function loadWeights(): Promise<Float32Array> {
  if (!weightsPromise) {
    weightsPromise = fetch(WEIGHTS_URL).then(async (response) => {
      if (!response.ok) throw new Error("LeNet 权重加载失败，请确认本地模型文件");
      return new Float32Array(await response.arrayBuffer());
    });
    weightsPromise.catch(() => {
      weightsPromise = null;
    });
  }
  return weightsPromise;
}

/** 互相关卷积（深度学习惯例），填充 0，NHWC 输入输出。 */
function conv2d(
  input: Float32Array,
  height: number,
  width: number,
  inChannels: number,
  weight: Float32Array,
  bias: Float32Array,
  outChannels: number,
  kernel: number,
  padding: number,
): { data: Float32Array; height: number; width: number; channels: number } {
  const outHeight = height + padding * 2 - kernel + 1;
  const outWidth = width + padding * 2 - kernel + 1;
  const output = new Float32Array(outHeight * outWidth * outChannels);
  for (let oc = 0; oc < outChannels; oc += 1) {
    const wBase = oc * inChannels * kernel * kernel;
    for (let oy = 0; oy < outHeight; oy += 1) {
      for (let ox = 0; ox < outWidth; ox += 1) {
        let sum = bias[oc];
        for (let ic = 0; ic < inChannels; ic += 1) {
          for (let ky = 0; ky < kernel; ky += 1) {
            const iy = oy - padding + ky;
            if (iy < 0 || iy >= height) continue;
            for (let kx = 0; kx < kernel; kx += 1) {
              const ix = ox - padding + kx;
              if (ix < 0 || ix >= width) continue;
              sum +=
                input[(iy * width + ix) * inChannels + ic] *
                weight[wBase + (ic * kernel + ky) * kernel + kx];
            }
          }
        }
        output[(oy * outWidth + ox) * outChannels + oc] = Math.tanh(sum);
      }
    }
  }
  return { data: output, height: outHeight, width: outWidth, channels: outChannels };
}

/** 2×2 平均池化，步长 2。 */
function averagePool(
  input: Float32Array,
  height: number,
  width: number,
  channels: number,
): { data: Float32Array; height: number; width: number; channels: number } {
  const outHeight = Math.floor(height / 2);
  const outWidth = Math.floor(width / 2);
  const output = new Float32Array(outHeight * outWidth * channels);
  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      for (let c = 0; c < channels; c += 1) {
        const sum =
          input[((y * 2) * width + x * 2) * channels + c] +
          input[((y * 2) * width + x * 2 + 1) * channels + c] +
          input[((y * 2 + 1) * width + x * 2) * channels + c] +
          input[((y * 2 + 1) * width + x * 2 + 1) * channels + c];
        output[(y * outWidth + x) * channels + c] = sum / 4;
      }
    }
  }
  return { data: output, height: outHeight, width: outWidth, channels };
}

function dense(
  input: Float32Array,
  weight: Float32Array,
  bias: Float32Array,
  outFeatures: number,
  activate: boolean,
): Float32Array {
  const output = new Float32Array(outFeatures);
  const inFeatures = input.length;
  for (let o = 0; o < outFeatures; o += 1) {
    let sum = bias[o];
    const base = o * inFeatures;
    for (let i = 0; i < inFeatures; i += 1) sum += input[i] * weight[base + i];
    output[o] = activate ? Math.tanh(sum) : sum;
  }
  return output;
}

/** 从画板提取 28×28 灰度：画板为白底黑字，按块平均降采样。 */
export function grayFromCanvas(canvas: HTMLCanvasElement): Float32Array {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法读取画板");
  const { width, height } = canvas;
  const data = context.getImageData(0, 0, width, height).data;
  const output = new Float32Array(SIZE * SIZE);
  const blockX = width / SIZE;
  const blockY = height / SIZE;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let sum = 0;
      let count = 0;
      const x0 = Math.floor(x * blockX);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * blockX));
      const y0 = Math.floor(y * blockY);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * blockY));
      for (let py = y0; py < y1; py += 1) {
        for (let px = x0; px < x1; px += 1) {
          const index = (py * width + px) * 4;
          sum += data[index];
          count += 1;
        }
      }
      output[y * SIZE + x] = count > 0 ? sum / count / 255 : 1;
    }
  }
  return output;
}

/** 从上传图片提取 28×28 灰度（白底黑字，等比缩放后居中）。 */
export function grayFromImage(image: HTMLImageElement): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法处理图片");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, SIZE, SIZE);
  const scale = Math.min(SIZE / image.naturalWidth, SIZE / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.drawImage(
    image,
    Math.floor((SIZE - width) / 2),
    Math.floor((SIZE - height) / 2),
    width,
    height,
  );
  const data = context.getImageData(0, 0, SIZE, SIZE).data;
  const output = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < output.length; i += 1) output[i] = data[i * 4] / 255;
  return output;
}

/** 反色 + 二值化 + 外接框裁剪 + 等比 20×20 + 居中到 28×28。 */
function normalizeStrokes(gray: Float32Array): Float32Array {
  const ink = new Float32Array(SIZE * SIZE);
  let minX = SIZE;
  let minY = SIZE;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const value = 1 - gray[y * SIZE + x];
      if (value > 0.25) {
        ink[y * SIZE + x] = value;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return gray;

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const fit = 20 / Math.max(cropW, cropH);
  const targetW = Math.max(1, Math.round(cropW * fit));
  const targetH = Math.max(1, Math.round(cropH * fit));
  const offsetX = Math.floor((SIZE - targetW) / 2);
  const offsetY = Math.floor((SIZE - targetH) / 2);
  const output = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < targetH; y += 1) {
    for (let x = 0; x < targetW; x += 1) {
      const sx = minX + (x + 0.5) * (cropW / targetW) - 0.5;
      const sy = minY + (y + 0.5) * (cropH / targetH) - 0.5;
      const x0 = Math.max(0, Math.min(SIZE - 1, Math.round(sx)));
      const y0 = Math.max(0, Math.min(SIZE - 1, Math.round(sy)));
      output[(offsetY + y) * SIZE + offsetX + x] = ink[y0 * SIZE + x0];
    }
  }
  return output;
}

/** 预处理并前向计算，返回 10 类概率与送入网络的 28×28 图。 */
export async function classifyDigit(
  gray: Float32Array,
  mode: LenetPreprocess,
): Promise<LenetResult> {
  const input = mode === "auto" ? normalizeStrokes(gray) : gray;
  const weights = await loadWeights();
  const started = performance.now();
  const slice = (start: number, length: number) => weights.subarray(start, start + length);

  // 28×28×1 → conv1(pad=2) → tanh → AP2 → 14×14×6
  const conv1 = conv2d(
    input,
    SIZE,
    SIZE,
    1,
    slice(OFFSETS.conv1W, 150),
    slice(OFFSETS.conv1B, 6),
    6,
    5,
    2,
  );
  const pool1 = averagePool(conv1.data, conv1.height, conv1.width, 6);

  // 14×14×6 → conv2 → tanh → AP2 → 5×5×16
  const conv2 = conv2d(
    pool1.data,
    pool1.height,
    pool1.width,
    6,
    slice(OFFSETS.conv2W, 2400),
    slice(OFFSETS.conv2B, 16),
    16,
    5,
    0,
  );
  const pool2 = averagePool(conv2.data, conv2.height, conv2.width, 16);

  // Keras 以 channels_last 展平，NHWC 顺序可直接送入全连接
  const fc1 = dense(pool2.data, slice(OFFSETS.fc1W, 48000), slice(OFFSETS.fc1B, 120), 120, true);
  const fc2 = dense(fc1, slice(OFFSETS.fc2W, 10080), slice(OFFSETS.fc2B, 84), 84, true);
  const logits = dense(fc2, slice(OFFSETS.fc3W, 840), slice(OFFSETS.fc3B, 10), 10, false);

  let max = -Infinity;
  for (const value of logits) max = Math.max(max, value);
  let total = 0;
  const probs = Array.from(logits, (value) => {
    const exp = Math.exp(value - max);
    total += exp;
    return exp;
  });
  for (let i = 0; i < probs.length; i += 1) probs[i] /= total;

  const elapsedMs = performance.now() - started;
  return { probs, preview: input, elapsedMs };
}
