import { useEffect, useMemo, useState } from "react";

interface Detection {
  label: string;
  confidence: number;
  box: number[];
  mask_pixels?: number;
}

interface PredictionFile {
  model: string;
  image?: string;
  count?: number;
  threshold?: number;
  detections?: Detection[];
  images?: {
    image: string;
    raw_count: number;
    threshold: number;
    count: number;
    detections: Detection[];
  }[];
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TABS = [
  {
    id: "yolo",
    label: "YOLO v3",
    description: "预训练权重推理：obj 0.25 + NMS 0.45，直接输出解码后的框。",
    files: ["yolo-dog-cycle-car", "yolo-cup1", "yolo-eagle", "yolo-traffic"],
  },
  {
    id: "mask",
    label: "Mask R-CNN",
    description: "预训练权重推理：框 + 类别 + 分数 + 掩膜，掩膜像素数由预测文件统计。",
    files: [
      "mask-mask_rcnn_12283150_12d37e6389_z",
      "mask-mask_rcnn_2383514521_1fc8d7b0de_z",
      "mask-mask_rcnn_3862500489_6fd195d183_z",
    ],
  },
  {
    id: "faster",
    label: "Faster R-CNN",
    description: "预训练权重推理：阈值 0.7，文件同时记录原始候选数与绘制数。",
    files: ["faster-rcnn"],
  },
] as const;

/** 大型检测模型的预计算结果浏览器：读取迁移后的预测 JSON，不加载 640MB 权重。 */
export default function DetectorResults() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("yolo");
  const [fileIndex, setFileIndex] = useState(0);
  const [data, setData] = useState<PredictionFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const current = useMemo(() => TABS.find((item) => item.id === tab) ?? TABS[0], [tab]);
  const currentFile = current.files[fileIndex] ?? current.files[0];

  useEffect(() => {
    setFileIndex(0);
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${BASE}/labs/lab5/predictions/${currentFile}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<PredictionFile>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "预测文件读取失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentFile]);

  const rows = useMemo(() => {
    if (!data) return [] as { name: string; raw?: number; threshold?: number; detections: Detection[] }[];
    if (data.images) {
      return data.images.map((item) => ({
        name: item.image,
        raw: item.raw_count,
        threshold: item.threshold,
        detections: item.detections,
      }));
    }
    return [
      {
        name: data.image ?? "预测结果",
        threshold: data.threshold,
        detections: data.detections ?? [],
      },
    ];
  }, [data]);

  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    setImageIndex(0);
  }, [data]);

  const activeRow = rows[Math.min(imageIndex, Math.max(rows.length - 1, 0))];

  return (
    <div className="section-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                tab === item.id
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          预计算 · 不加载权重
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {current.description}
      </p>

      {current.files.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {current.files.map((file, index) => (
            <button
              key={file}
              type="button"
              onClick={() => setFileIndex(index)}
              className={[
                "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                fileIndex === index
                  ? "border-brand-400 text-brand-700 dark:text-brand-300"
                  : "border-slate-200 text-slate-500 hover:border-brand-300 dark:border-slate-700 dark:text-slate-400",
              ].join(" ")}
            >
              {file.replace(/^(yolo|mask)-/, "").replace(/_z$/, "")}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="mt-4 text-sm text-slate-400">读取预测结果…</p>}
      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          预测文件读取失败：{error}
        </p>
      )}

      {data && !loading && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-200">{data.model}</span>
            {rows.length > 1 &&
              rows.map((row, index) => (
                <button
                  key={row.name}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={[
                    "rounded-full border px-2.5 py-1 transition-colors",
                    imageIndex === index
                      ? "border-brand-400 text-brand-700 dark:text-brand-300"
                      : "border-slate-200 hover:border-brand-300 dark:border-slate-700",
                  ].join(" ")}
                >
                  {row.name}
                </button>
              ))}
            {activeRow && (
              <span className="font-mono">
                输出 {activeRow.detections.length} 框
                {activeRow.raw != null && ` · 原始候选 ${activeRow.raw}`}
                {activeRow.threshold != null && ` · 阈值 ${activeRow.threshold}`}
              </span>
            )}
          </div>

          {activeRow && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">类别</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">置信度</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">框 [x1, y1, x2, y2]</th>
                    {tab === "mask" && (
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">掩膜像素</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeRow.detections.map((item, index) => (
                    <tr
                      key={`${item.label}-${index}`}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200">{item.label}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                        {(item.confidence * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {item.box.map((value) => Number(value).toFixed(1)).join(", ")}
                      </td>
                      {tab === "mask" && (
                        <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                          {item.mask_pixels ?? "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-slate-400">
            这些数值来自实验五的预计算推理结果，仅说明官方权重在其训练分布内的输出行为，
            不构成本实验训练精度或 mAP 评估。
          </p>
        </div>
      )}
    </div>
  );
}
