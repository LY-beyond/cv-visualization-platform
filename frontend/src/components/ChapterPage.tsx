import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { ApiError, api } from "../api/client";
import type { CaseMeta } from "../api/types";
import CaseWorkbench from "../cases/CaseWorkbench";
import ImageUploader from "../components/ImageUploader";
import KnowledgeCard from "../components/KnowledgeCard";
import ModelCard from "../components/ModelCard";
import ModelComparison from "../components/ModelComparison";
import ResultPanel from "../components/ResultPanel";
import TrainingPanel from "../components/TrainingPanel";
import { findChapter } from "../chapters/config";
import { useDatasetStore } from "../stores/datasetStore";
import { useModelStore } from "../stores/modelStore";
import { useTaskStore } from "../stores/taskStore";
import ConfusionMatrix from "../viz/ConfusionMatrix";
import EmbeddingScatter, { type EmbeddingPoint } from "../viz/EmbeddingScatter";
import ErrorSamples from "../viz/ErrorSamples";
import TrainingCurve from "../viz/TrainingCurve";
import Formula from "../viz/Formula";

export default function ChapterPage() {
  const { chapterId } = useParams();
  const location = useLocation();
  const chapter = findChapter(chapterId);

  const { items: datasets, currentId: datasetId, load: loadDatasets, select: selectDataset } = useDatasetStore();
  const { items: models, load: loadModels } = useModelStore();
  const { metrics, evaluation, current } = useTaskStore();

  const [cases, setCases] = useState<CaseMeta[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [casesError, setCasesError] = useState<string | null>(null);

  useEffect(() => {
    void loadDatasets();
    void loadModels();
  }, [loadDatasets, loadModels]);

  useEffect(() => {
    if (!chapter || chapter.status !== "active") return;
    setCasesError(null);
    api.cases
      .list(chapter.id)
      .then((items) => {
        setCases(items);
        setActiveCaseId(items[0]?.id ?? null);
      })
      .catch((error) => {
        setCases([]);
        setCasesError(error instanceof ApiError ? error.message : "案例列表加载失败");
      });
  }, [chapter]);

  // 支持 /chapters/:id#case-xxx 直达案例：切换案例后滚动并短暂高亮
  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash.startsWith("case-") || cases.length === 0) return;
    const caseId = hash.slice("case-".length);
    if (!cases.some((item) => item.id === caseId)) return;
    setActiveCaseId(caseId);
    const timer = window.setTimeout(() => {
      const element = document.getElementById(hash);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      element.classList.add("ring-2", "ring-brand-400");
      window.setTimeout(() => element.classList.remove("ring-2", "ring-brand-400"), 1600);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [location.hash, cases]);

  if (!chapter) {
    return (
      <div className="section-card text-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">章节不存在</h2>
        <Link to="/" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  if (chapter.status === "planned") {
    return (
      <div className="space-y-6">
        <header>
          <p className="font-mono text-xs text-slate-400">{chapter.order}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{chapter.title}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{chapter.description}</p>
        </header>
        <div className="section-card border-dashed text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">本期不实现，架构中保留扩展入口</p>
          <p className="mt-2 text-xs text-slate-400">
            后续按“新增章节”步骤补充导航、页面模板、数据集与案例注册即可接入。
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const chapterDatasets = datasets.filter((item) => item.chapter === chapter.id);
  const visibleDatasets = chapterDatasets.length > 0 ? chapterDatasets : datasets;
  const visibleModels = models.filter((item) => item.chapter === chapter.id);
  // 可训练/预训练模型优先展示，最新模型卡（结构展示）折叠为参考清单，避免页面过长
  const primaryModels = visibleModels.filter((item) => item.level !== "structure");
  const referenceModels = visibleModels.filter((item) => item.level === "structure");
  const activeCase = cases.find((item) => item.id === activeCaseId) ?? null;
  const embeddingPoints: EmbeddingPoint[] = (evaluation?.embedding ?? []).flatMap((point) => {
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    return [{ x, y, label: String(point.label ?? "未知") }];
  });

  return (
    <div className="space-y-12">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-brand-soft p-6 shadow-card dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-brand-300/30 to-violet-300/20 blur-3xl dark:from-brand-700/20 dark:to-violet-700/10" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs font-bold tracking-wider text-gradient-brand">
              CHAPTER {chapter.order}
            </span>
            <span className="badge bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
              已实现章节框架
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 dark:text-white lg:text-4xl">
            <span className="text-gradient-brand">{chapter.title}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">{chapter.subtitle}</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {chapter.description}
          </p>
        </div>
      </header>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">知识点讲解</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">文案依据课程课件整理，可按章补充结构图与公式。</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {chapter.knowledge.map((block, index) => (
            <KnowledgeCard key={block.title} index={index} title={block.title} points={block.points} />
          ))}
        </div>
      </section>

      {chapter.formulas && chapter.formulas.length > 0 && (
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">核心公式</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">公式表述依据课程课件整理。</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {chapter.formulas.map((formula) => (
              <div key={formula.name} className="section-card">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formula.name}</p>
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-brand-700 dark:bg-slate-800/60 dark:text-brand-300">
                  <Formula latex={formula.latex} fallback={formula.expression} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{formula.note}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {chapter.table && (
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{chapter.table.title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">对比结论依据课程课件表述整理。</p>
          </div>
          <div className="section-card overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {chapter.table.columns.map((column) => (
                    <th
                      key={column}
                      className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chapter.table.rows.map((row) => (
                  <tr key={row[0]} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${row[0]}-${cellIndex}`}
                        className={[
                          "px-3 py-2 align-top",
                          cellIndex === 0
                            ? "font-medium text-slate-700 dark:text-slate-200"
                            : "text-slate-600 dark:text-slate-300",
                        ].join(" ")}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {chapter.figures && chapter.figures.length > 0 && (
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">课件结构图</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              从课程课件提取的结构图与示意图，离线环境同样可用。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {chapter.figures.map((figure) => (
              <figure
                key={figure.src}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <img
                  src={figure.src}
                  alt={figure.caption}
                  loading="lazy"
                  className="w-full bg-white object-contain"
                />
                <figcaption className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {figure.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">交互实验</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            选择数据集与案例，调节参数后观察结果；模型训练与多模型对比见下方。
          </p>
        </div>

        <div className="mb-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">数据集</span>
            <select
              value={datasetId ?? ""}
              onChange={(event) => selectDataset(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {visibleDatasets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">输入图片</span>
            <div className="mt-1.5">
              <ImageUploader />
            </div>
          </div>
        </div>

        {casesError && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {casesError}
          </p>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {cases.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveCaseId(item.id)}
              className={[
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200",
                item.id === activeCaseId
                  ? "border-transparent bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-glow"
                  : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:text-brand-200",
              ].join(" ")}
            >
              {item.name}
            </button>
          ))}
          {cases.length === 0 && !casesError && (
            <p className="text-sm text-slate-400">该章节暂未登记交互案例。</p>
          )}
        </div>

        {activeCase ? (
          <CaseWorkbench key={activeCase.id} meta={activeCase} />
        ) : (
          <ResultPanel title="案例工作台" hint="从上方选择一个案例开始。" />
        )}
      </section>

      {visibleModels.some((model) => model.level === "trainable") && (
        <section>
          <TrainingPanel
            datasets={visibleDatasets}
            datasetId={datasetId}
            onDatasetChange={selectDataset}
            models={visibleModels}
          />
        </section>
      )}

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">结果展示</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              训练曲线随 SSE 实时更新，训练结束后展示混淆矩阵、错误样例与特征投影。
            </p>
          </div>
          {evaluation && (
            <div className="flex flex-wrap gap-2">
              <span className="badge bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-sm">
                Top-1 {(((evaluation.accuracy ?? 0) * 100)).toFixed(2)}%
              </span>
              {evaluation.top5_accuracy != null && (
                <span className="badge bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300">
                  Top-5 {(evaluation.top5_accuracy * 100).toFixed(2)}%
                </span>
              )}
              <span className="badge bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-sm">
                错分 {evaluation.error_samples.length} 例
              </span>
            </div>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="section-card">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">训练曲线</p>
            <TrainingCurve data={metrics} />
          </div>
          <div className="section-card">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">混淆矩阵</p>
            <ConfusionMatrix
              matrix={evaluation?.confusion_matrix ?? []}
              classNames={evaluation?.class_names ?? []}
            />
          </div>
          <div className="section-card">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">特征嵌入投影</p>
            <EmbeddingScatter points={embeddingPoints} />
          </div>
        </div>
        <div className="section-card mt-4">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">错误样例</p>
          <ErrorSamples samples={evaluation?.error_samples ?? []} />
        </div>
      </section>

      {visibleModels.some((model) => model.level === "trainable") && datasetId && (
        <section>
          <ModelComparison
            datasetId={datasetId}
            refreshKey={`${current?.id ?? ""}:${current?.state ?? ""}:${evaluation?.task_id ?? ""}:${datasetId}`}
          />
        </section>
      )}

      {visibleModels.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">关联模型</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">模型卡片信息来自后端注册表。</p>
            </div>
          </div>
          {primaryModels.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {primaryModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          )}
          {referenceModels.length > 0 && (
            <details className="group card-interactive mt-4 !p-0">
              <summary className="relative cursor-pointer select-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                {/* 渐变装饰角标 */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-50 via-violet-50/50 to-accent-50/40 opacity-60 dark:from-brand-900/15 dark:via-violet-900/10 dark:to-accent-900/10" />
                <div className="relative flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-br from-brand-500 to-violet-500" />
                  最新模型参考清单（
                  <span className="font-bold text-gradient-brand">{referenceModels.length}</span>
                  个，含论文与官方代码）
                  <svg viewBox="0 0 24 24" className="chevron ml-auto h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {referenceModels.map((model) => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
