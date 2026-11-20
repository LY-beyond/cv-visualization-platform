/// <reference lib="webworker" />

import * as ort from "onnxruntime-web";

import { configureOrt, getSession } from "./ort";
import type {
  DetectionBox,
  DetectionResult,
  InferenceImage,
  InferenceResult,
  OrtModelConfig,
  SegmentationResult,
  WorkerRequest,
  WorkerResponse,
} from "./modelConfig";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

function colorOf(config: OrtModelConfig, classId: number): string {
  if (config.palette.length > 0) return config.palette[classId % config.palette.length];
  const hue = (classId * 47) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

interface PreprocessResult {
  tensor: Float32Array;
  scale: number;
  padX: number;
  padY: number;
  width: number;
  height: number;
}

function preprocess(image: InferenceImage, config: OrtModelConfig): PreprocessResult {
  const [width, height] = config.inputSize;
  const scale = Math.min(width / image.width, height / image.height);
  const resizedW = Math.max(1, Math.round(image.width * scale));
  const resizedH = Math.max(1, Math.round(image.height * scale));
  const padX = Math.floor((width - resizedW) / 2);
  const padY = Math.floor((height - resizedH) / 2);

  const tensor = new Float32Array(3 * width * height);
  for (let channel = 0; channel < 3; channel += 1) {
    const mean = config.mean[channel] ?? 0;
    const std = config.std[channel] ?? 1;
    const padValue = (114 / 255 - mean) / std;
    tensor.fill(padValue, channel * width * height, (channel + 1) * width * height);
  }

  for (let y = 0; y < resizedH; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(y / scale));
    for (let x = 0; x < resizedW; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor(x / scale));
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (padY + y) * width + padX + x;
      for (let channel = 0; channel < 3; channel += 1) {
        const mean = config.mean[channel] ?? 0;
        const std = config.std[channel] ?? 1;
        const value = image.data[sourceIndex + channel] / 255;
        tensor[channel * width * height + targetIndex] = (value - mean) / std;
      }
    }
  }

  return { tensor, scale, padX, padY, width, height };
}

function iou(a: DetectionBox, b: DetectionBox): number {
  const interW = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const interH = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const intersection = interW * interH;
  const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - intersection;
  return union > 0 ? intersection / union : 0;
}

function nms(boxes: DetectionBox[], threshold: number): DetectionBox[] {
  const kept: DetectionBox[] = [];
  const byClass = new Map<number, DetectionBox[]>();
  boxes.forEach((box) => {
    const list = byClass.get(box.classId) ?? [];
    list.push(box);
    byClass.set(box.classId, list);
  });
  byClass.forEach((list) => {
    list.sort((a, b) => b.score - a.score);
    const selected: DetectionBox[] = [];
    list.forEach((box) => {
      if (selected.every((item) => iou(item, box) <= threshold)) selected.push(box);
    });
    kept.push(...selected);
  });
  return kept.sort((a, b) => b.score - a.score).slice(0, 100);
}

function postprocessDetection(
  data: Float32Array,
  dims: readonly number[],
  config: OrtModelConfig,
  pre: PreprocessResult,
  image: InferenceImage,
): DetectionResult {
  const numLabels = config.labels.length || 80;
  const isYoloV5 = config.outputFormat === "yolov5";
  const expectedChannels = 4 + numLabels + (isYoloV5 ? 1 : 0);
  const channelLast = dims.length === 3 && dims[2] === expectedChannels;
  const channels = channelLast ? dims[2] : dims[1];
  const anchors = channelLast ? dims[1] : dims[2];
  const read = (anchor: number, channel: number) =>
    channelLast ? data[anchor * channels + channel] : data[channel * anchors + anchor];

  const boxes: DetectionBox[] = [];
  const classStart = isYoloV5 ? 5 : 4;

  for (let anchor = 0; anchor < anchors; anchor += 1) {
    let bestScore = -1;
    let bestClass = -1;
    for (let classIndex = 0; classIndex < numLabels; classIndex += 1) {
      const score = read(anchor, classStart + classIndex);
      if (score > bestScore) {
        bestScore = score;
        bestClass = classIndex;
      }
    }
    if (isYoloV5) bestScore *= read(anchor, 4);
    if (bestScore < config.scoreThreshold) continue;

    const centerX = read(anchor, 0);
    const centerY = read(anchor, 1);
    const boxW = read(anchor, 2);
    const boxH = read(anchor, 3);
    const x1 = Math.max(0, (centerX - boxW / 2 - pre.padX) / pre.scale);
    const y1 = Math.max(0, (centerY - boxH / 2 - pre.padY) / pre.scale);
    const x2 = Math.min(image.width - 1, (centerX + boxW / 2 - pre.padX) / pre.scale);
    const y2 = Math.min(image.height - 1, (centerY + boxH / 2 - pre.padY) / pre.scale);
    if (x2 <= x1 || y2 <= y1) continue;

    boxes.push({
      x1,
      y1,
      x2,
      y2,
      score: bestScore,
      classId: bestClass,
      label: config.labels[bestClass] ?? `class ${bestClass}`,
      color: colorOf(config, bestClass),
    });
  }

  const merged = nms(boxes, config.iouThreshold);
  const counts: Record<string, number> = {};
  merged.forEach((box) => {
    counts[box.label] = (counts[box.label] ?? 0) + 1;
  });
  return {
    kind: "detection",
    boxes: merged,
    counts,
    timings: { preprocess: 0, inference: 0, postprocess: 0 },
  };
}

function postprocessSegmentation(
  data: Float32Array,
  dims: readonly number[],
  config: OrtModelConfig,
): SegmentationResult {
  const [, channels, height, width] = dims;
  const mask = new Uint8ClampedArray(width * height * 4);
  const counts: Record<string, number> = {};
  const pixels = width * height;

  for (let index = 0; index < pixels; index += 1) {
    let bestClass = 0;
    let bestScore = -Infinity;
    for (let channel = 0; channel < channels; channel += 1) {
      const score = data[channel * pixels + index];
      if (score > bestScore) {
        bestScore = score;
        bestClass = channel;
      }
    }
    const label = config.labels[bestClass] ?? `class ${bestClass}`;
    counts[label] = (counts[label] ?? 0) + 1;
    const color = colorOf(config, bestClass);
    const rgb = parseColor(color);
    const offset = index * 4;
    mask[offset] = rgb[0];
    mask[offset + 1] = rgb[1];
    mask[offset + 2] = rgb[2];
    mask[offset + 3] = bestClass === 0 ? 0 : 150;
  }

  return {
    kind: "segmentation",
    mask: { data: mask, width, height },
    counts,
    timings: { preprocess: 0, inference: 0, postprocess: 0 },
  };
}

function parseColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const normalized = color.slice(1);
    const value =
      normalized.length === 3
        ? normalized
            .split("")
            .map((char) => `${char}${char}`)
            .join("")
        : normalized;
    return [
      Number.parseInt(value.slice(0, 2), 16),
      Number.parseInt(value.slice(2, 4), 16),
      Number.parseInt(value.slice(4, 6), 16),
    ];
  }
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    return [Number(match[0]), Number(match[1]), Number(match[2])];
  }
  return [128, 128, 128];
}

async function run(request: WorkerRequest): Promise<InferenceResult> {
  configureOrt(request.wasmPaths);
  const session = await getSession(request.config.modelUrl);

  const preStart = Date.now();
  const pre = preprocess(request.image, request.config);
  const preprocessTime = Date.now() - preStart;

  const tensor = new ort.Tensor("float32", pre.tensor, [1, 3, pre.height, pre.width]);
  const feed = { [session.inputNames[0]]: tensor };
  const inferenceStart = Date.now();
  const outputs = await session.run(feed);
  const inferenceTime = Date.now() - inferenceStart;

  const output = outputs[session.outputNames[0]];
  const data = output.data as Float32Array;
  const dims = output.dims as readonly number[];

  const postStart = Date.now();
  const result =
    request.task === "detection"
      ? postprocessDetection(data, dims, request.config, pre, request.image)
      : postprocessSegmentation(data, dims, request.config);
  const postprocessTime = Date.now() - postStart;

  return { ...result, timings: { preprocess: preprocessTime, inference: inferenceTime, postprocess: postprocessTime } };
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    const result = await run(request);
    scope.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    scope.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : "推理失败",
    });
  }
};
