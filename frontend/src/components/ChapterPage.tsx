import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, api } from "../api/client";
import type { CaseMeta } from "../api/types";
import CaseWorkbench from "../cases/CaseWorkbench";
import ImageUploader from "../components/ImageUploader";
import KnowledgeCard from "../components/KnowledgeCard";
import ModelCard from "../components/ModelCard";
import ResultPanel from "../components/ResultPanel";
import { findChapter } from "../chapters/config";
import { useDatasetStore } from "../stores/datasetStore";
import { useModelStore } from "../stores/modelStore";
import ConfusionMatrix from "../viz/ConfusionMatrix";
import EmbeddingScatter from "../viz/EmbeddingScatter";
import TrainingCurve from "../viz/TrainingCurve";

export default function ChapterPage() {
  const { chapterId } = useParams();
  const chapter = findChapter(chapterId);

  const { items: datasets, currentId: datasetId, load: loadDatasets, select: selectDataset } = useDatasetStore();
  const { items: models, load: loadModels } = useModelStore();

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
  const activeCase = cases.find((item) => item.id === activeCaseId) ?? null;

  return (
    <div className="space-y-12">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-slate-400">CHAPTER {chapter.order}</span>
          <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            已实现章节框架
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white lg:text-4xl">
          {chapter.title}
        </h1>
        <p className="mt-1 text-sm text-slate-400">{chapter.subtitle}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {chapter.description}
        </p>
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

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">交互实验</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            选择数据集与案例，调节参数后观察结果；模型训练与对比面板将逐步接入。
          </p>
        </div>

        <div className="mb-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
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
          <label className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">模型</span>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              defaultValue=""
            >
              <option value="">暂未接入训练实现</option>
              {visibleModels.map((item) => (
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
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                item.id === activeCaseId
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
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
          <CaseWorkbench meta={activeCase} />
        ) : (
          <ResultPanel title="案例工作台" hint="从上方选择一个案例开始。" />
        )}
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">结果展示</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            训练曲线、混淆矩阵与特征投影已封装为可复用可视化组件，接入评估数据后自动渲染。
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="section-card">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">训练曲线</p>
            <TrainingCurve data={[]} />
          </div>
          <div className="section-card">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">混淆矩阵</p>
            <ConfusionMatrix matrix={[]} classNames={[]} />
          </div>
          <div className="section-card">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">特征嵌入投影</p>
            <EmbeddingScatter points={[]} />
          </div>
        </div>
      </section>

      {visibleModels.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">关联模型</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">模型卡片信息来自后端注册表。</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {visibleModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
