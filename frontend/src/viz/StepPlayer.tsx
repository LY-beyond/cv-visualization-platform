import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import Formula from "./Formula";

export interface StepPlayerStep {
  title?: string;
  description?: string;
  image?: string;
  formula?: string;
  /** 可选 KaTeX 表达式，优先于 formula 渲染 */
  latex?: string;
}

interface StepPlayerProps {
  steps: StepPlayerStep[];
  autoPlay?: boolean;
  interval?: number;
  showImages?: boolean;
  /** 当前步骤变化时回调，供“当前计算”等卡片复用同一份状态。 */
  onStepChange?: (step: StepPlayerStep, index: number) => void;
}

const SPEEDS = [0.5, 1, 2];

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

/** 通用步骤播放器：播放/暂停、前后切换、调速、键盘操作，图片与说明同步。 */
export default function StepPlayer({
  steps,
  autoPlay = false,
  interval = 1800,
  showImages = true,
  onStepChange,
}: StepPlayerProps) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = steps.length;
  const current = steps[Math.min(index, Math.max(total - 1, 0))] ?? {};
  const atEnd = index >= total - 1;

  // 步骤内容变化时回到第一步；减少动效时默认不自动播放
  useEffect(() => {
    setIndex(0);
    setPlaying(autoPlay && !reducedMotion && steps.length > 1);
  }, [steps, autoPlay, reducedMotion]);

  // 自动播放：到最后一步自动停止，卸载或暂停时清理定时器
  useEffect(() => {
    if (!playing || reducedMotion) return;
    if (index >= total - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex((previous) => Math.min(previous + 1, total - 1));
    }, interval / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, interval, speed, total, reducedMotion]);

  useEffect(() => {
    if (total === 0) return;
    onStepChange?.(current, index);
  }, [current, index, onStepChange, total]);

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndex(Math.max(0, Math.min(next, total - 1)));
    },
    [total],
  );

  const togglePlay = useCallback(() => {
    if (total <= 1) return;
    setPlaying((previous) => {
      if (previous) return false;
      if (atEnd) {
        setIndex(0);
        return true;
      }
      return true;
    });
  }, [atEnd, total]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      togglePlay();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPlaying(false);
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPlaying(false);
      goTo(index - 1);
    }
  };

  if (total === 0) return null;

  return (
    <section
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="步骤播放器"
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 outline-none transition-all duration-300 focus:ring-2 focus:ring-brand-300 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-500 via-violet-500 to-accent-400 opacity-70" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-violet-500 text-[10px] font-bold text-white shadow-sm">
            ▶
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">步骤回放</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-xs text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            {Math.min(index + 1, total)} / {total}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              goTo(index - 1);
            }}
            disabled={index === 0}
            className="btn-ghost !px-2.5 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={total <= 1}
            className="btn-gradient !px-3 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {playing ? "暂停" : "播放"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              goTo(index + 1);
            }}
            disabled={atEnd}
            className="btn-ghost !px-2.5 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一步
          </button>
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {SPEEDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSpeed(item)}
                aria-pressed={speed === item}
                className={[
                  "rounded-md px-2 py-0.5 text-xs transition-all duration-200",
                  speed === item
                    ? "bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300",
                ].join(" ")}
              >
                {item}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-1">
        {steps.map((step, stepIndex) => (
          <button
            key={`${step.title ?? "step"}-${stepIndex}`}
            type="button"
            aria-label={`跳转到第 ${stepIndex + 1} 步`}
            onClick={() => {
              setPlaying(false);
              goTo(stepIndex);
            }}
            className={[
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              stepIndex <= index
                ? "progress-gradient"
                : "bg-slate-200 hover:bg-brand-200 dark:bg-slate-700 dark:hover:bg-brand-800",
            ].join(" ")}
          />
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-gradient-to-br from-slate-50 to-brand-50/40 p-3 dark:from-slate-800/60 dark:to-slate-800/30">
        <p className="flex items-start gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-violet-500 font-mono text-[10px] text-white">
            {index + 1}
          </span>
          {current.title ?? "步骤"}
        </p>
        {(current.latex || current.formula) && (
          <Formula
            latex={current.latex}
            fallback={current.formula}
            className="mt-2 rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-brand-700 dark:bg-slate-900/60 dark:text-brand-300"
          />
        )}
        {current.description && (
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {current.description}
          </p>
        )}
        {showImages && current.image && (
          <img
            src={current.image}
            alt={current.title ?? "步骤图像"}
            className="mt-3 w-full rounded-lg border border-slate-100 object-contain dark:border-slate-800"
          />
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        键盘：空格播放/暂停，左右方向键切换步骤
      </p>
    </section>
  );
}
