/**
 * KaTeX 公式渲染：优先使用 latex 表达式，缺失时回退到纯文本。
 * 长公式允许横向滚动，颜色继承父级以适配深色模式。
 */

import katex from "katex";
import { useMemo } from "react";

interface FormulaProps {
  latex?: string;
  fallback?: string;
  displayMode?: boolean;
  className?: string;
}

export default function Formula({ latex, fallback, displayMode = true, className }: FormulaProps) {
  const html = useMemo(() => {
    if (!latex) return null;
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (html) {
    return (
      <div
        className={`formula-block overflow-x-auto ${className ?? ""}`}
        // KaTeX 输出为可信的本地渲染结果，不含外部输入脚本
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (!fallback) return null;

  return (
    <pre
      className={`overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-brand-700 dark:bg-slate-900/60 dark:text-brand-300 ${className ?? ""}`}
    >
      {fallback}
    </pre>
  );
}
