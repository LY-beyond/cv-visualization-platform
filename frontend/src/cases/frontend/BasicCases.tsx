import { useEffect, useState } from "react";

import type { CaseMeta } from "../../api/types";
import ParamPanel from "../../components/ParamPanel";
import CaseFrame from "../CaseFrame";
import { numberValue, stringValue, useCaseValues } from "../params";

const INPUT = Array.from({ length: 8 }, (_, row) =>
  Array.from({ length: 8 }, (_, col) => (row * 6 + col * 4 + 3) % 19),
);

function cellStyle(value: number, max: number, active: boolean) {
  const alpha = 0.12 + 0.6 * (value / max);
  return {
    background: active ? "rgba(37,99,235,0.85)" : `rgba(37,99,235,${alpha.toFixed(2)})`,
    color: active || value / max > 0.45 ? "#fff" : "#1e293b",
  };
}

export function PoolingDemo({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const mode = stringValue(values, "mode", "max");
  const windowSize = Math.max(2, Math.min(8, Math.round(numberValue(values, "window", 2))));
  const outputSize = Math.floor(INPUT.length / windowSize);
  const totalWindows = Math.max(1, outputSize * outputSize);

  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 700);
    return () => window.clearInterval(timer);
  }, [playing]);

  const current = tick % totalWindows;
  const currentRow = Math.floor(current / outputSize);
  const currentCol = current % outputSize;

  const pooled = Array.from({ length: outputSize }, (_, row) =>
    Array.from({ length: outputSize }, (_, col) => {
      const cells = INPUT.slice(row * windowSize, (row + 1) * windowSize).flatMap((line) =>
        line.slice(col * windowSize, (col + 1) * windowSize),
      );
      const sum = cells.reduce((acc, value) => acc + value, 0);
      return mode === "avg" ? Math.round((sum / cells.length) * 10) / 10 : Math.max(...cells);
    }),
  );
  const pooledMax = mode === "avg" ? 18 : 18;

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          {playing ? "暂停动画" : "播放动画"}
        </button>
        <span className="text-xs text-slate-400">
          第 {current + 1} / {totalWindows} 个窗口 · {windowSize}×{windowSize} · {mode === "avg" ? "平均池化" : "最大池化"}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">输入特征图（8×8）</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}>
            {INPUT.map((line, row) =>
              line.map((value, col) => {
                const active =
                  row >= currentRow * windowSize &&
                  row < (currentRow + 1) * windowSize &&
                  col >= currentCol * windowSize &&
                  col < (currentCol + 1) * windowSize;
                return (
                  <div
                    key={`${row}-${col}`}
                    className={[
                      "flex aspect-square items-center justify-center rounded font-mono text-[11px]",
                      active ? "ring-2 ring-amber-400" : "",
                    ].join(" ")}
                    style={cellStyle(value, 18, active)}
                  >
                    {value}
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            输出特征图（{outputSize}×{outputSize}）
          </p>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${outputSize}, minmax(0, 1fr))` }}>
            {pooled.map((line, row) =>
              line.map((value, col) => (
                <div
                  key={`${row}-${col}`}
                  className={[
                    "flex aspect-square items-center justify-center rounded font-mono text-xs",
                    row === currentRow && col === currentCol ? "ring-2 ring-amber-400" : "",
                  ].join(" ")}
                  style={cellStyle(value, pooledMax, row === currentRow && col === currentCol)}
                >
                  {value}
                </div>
              )),
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {mode === "avg" ? "平均池化取窗口内均值，保留整体强度信息。" : "最大池化取窗口内最大值，保留最显著响应。"}
            窗口步长等于窗口大小，因此输出尺寸为输入尺寸的 1/{windowSize}。
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}

const KERNELS: Record<string, { label: string; matrix: number[][] }> = {
  sobel_x: { label: "Sobel 横向", matrix: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
  sobel_y: { label: "Sobel 纵向", matrix: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] },
  laplace: { label: "Laplace", matrix: [[0, 1, 0], [1, -4, 1], [0, 1, 0]] },
  blur: { label: "均值模糊", matrix: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]] },
};

const FEATURE = Array.from({ length: 7 }, (_, row) =>
  Array.from({ length: 7 }, (_, col) => (row * 3 + col * 5 + 2) % 10),
);

export function ConvSlide({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const kernelKey = stringValue(values, "kernel", "sobel_x");
  const stride = Math.max(1, Math.min(4, Math.round(numberValue(values, "stride", 1))));
  const kernel = KERNELS[kernelKey] ?? KERNELS.sobel_x;
  const outputSize = Math.floor((FEATURE.length - 3) / stride) + 1;

  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 650);
    return () => window.clearInterval(timer);
  }, [playing, outputSize]);

  const total = Math.max(1, outputSize * outputSize);
  const current = tick % total;
  const currentRow = Math.floor(current / outputSize);
  const currentCol = current % outputSize;
  const top = currentRow * stride;
  const left = currentCol * stride;

  const output = Array.from({ length: outputSize }, (_, row) =>
    Array.from({ length: outputSize }, (_, col) => {
      let sum = 0;
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          sum += FEATURE[row * stride + i][col * stride + j] * kernel.matrix[i][j];
        }
      }
      return Math.round(sum * 10) / 10;
    }),
  );
  const currentValue = output[currentRow][currentCol];

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          {playing ? "暂停动画" : "播放动画"}
        </button>
        <span className="text-xs text-slate-400">
          {kernel.label} · 步长 {stride} · 第 {current + 1} / {total} 个位置
        </span>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-3">
        <div>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">卷积核 3×3</p>
          <div className="grid w-36 gap-1" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {kernel.matrix.map((line, row) =>
              line.map((value, col) => (
                <div
                  key={`${row}-${col}`}
                  className="flex aspect-square items-center justify-center rounded bg-slate-800 font-mono text-[10px] text-white dark:bg-slate-700"
                >
                  {Number.isInteger(value) ? value : value.toFixed(2)}
                </div>
              )),
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            当前窗口加权和 = <span className="font-mono text-brand-600">{currentValue}</span>
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">输入特征图 7×7</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {FEATURE.map((line, row) =>
              line.map((value, col) => {
                const active =
                  row >= top && row < top + 3 && col >= left && col < left + 3;
                return (
                  <div
                    key={`${row}-${col}`}
                    className={[
                      "flex aspect-square items-center justify-center rounded font-mono text-[11px]",
                      active
                        ? "bg-amber-400 text-slate-900 ring-2 ring-amber-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    {value}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            输出特征图（{outputSize}×{outputSize}）
          </p>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${outputSize}, minmax(0, 1fr))` }}>
            {output.map((line, row) =>
              line.map((value, col) => (
                <div
                  key={`${row}-${col}`}
                  className={[
                    "flex aspect-square items-center justify-center rounded font-mono text-[10px]",
                    row === currentRow && col === currentCol
                      ? "bg-brand-600 text-white ring-2 ring-amber-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                  ].join(" ")}
                >
                  {value}
                </div>
              )),
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            输出尺寸 = ⌊(7 − 3) / {stride}⌋ + 1 = {outputSize}
          </p>
        </div>
      </div>
    </CaseFrame>
  );
}
