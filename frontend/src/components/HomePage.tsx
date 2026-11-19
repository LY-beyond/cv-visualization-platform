import { useEffect } from "react";
import { Link } from "react-router-dom";

import { activeChapters, plannedChapters } from "../chapters/config";
import { useDatasetStore } from "../stores/datasetStore";
import { useModelStore } from "../stores/modelStore";

export default function HomePage() {
  const { items: datasets, load: loadDatasets } = useDatasetStore();
  const { items: models, load: loadModels } = useModelStore();

  useEffect(() => {
    void loadDatasets();
    void loadModels();
  }, [loadDatasets, loadModels]);

  const stats = [
    { label: "课件章节", value: activeChapters.length, hint: "与课件一一对应" },
    { label: "注册数据集", value: datasets.length || "—", hint: "可平滑扩展大数据集" },
    { label: "注册模型", value: models.length || "—", hint: "现场训练 / 预训练 / 结构展示" },
    { label: "后续扩展", value: plannedChapters.length, hint: "跟踪 / 多目 / 问答占位" },
  ];

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-brand-50 to-white p-8 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 lg:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Computer Vision Course Project
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-slate-900 dark:text-white lg:text-4xl">
          计算机视觉交互式教学可视化平台
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 lg:text-base">
          按课件章节组织知识点讲解、可交互算法案例、模型训练与对比，贯通从手工特征到深度学习端到端方法的演进主线。
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/60"
            >
              <p className="text-2xl font-semibold text-brand-700 dark:text-brand-300">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{stat.label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{stat.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">课程章节</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              每章采用“知识点讲解 / 交互实验 / 结果展示”三段式页面结构。
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {activeChapters.map((chapter) => (
            <Link
              key={chapter.id}
              to={`/chapters/${chapter.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs text-slate-400">{chapter.order}</span>
                <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  {chapter.knowledge.length} 个知识块
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                {chapter.title}
              </h3>
              <p className="text-xs text-slate-400">{chapter.subtitle}</p>
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {chapter.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
