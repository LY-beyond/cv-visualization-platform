import { Link } from "react-router-dom";

import { labs } from "../data/labs";
import { useProgressStore } from "../stores/progressStore";

export default function LabsPage() {
  const visitedLabs = useProgressStore((state) => state.visitedLabs);
  const caseCount = new Set(labs.flatMap((lab) => lab.sections.flatMap((section) => section.caseIds ?? []))).size;
  const chartCount = labs.reduce((total, lab) => total + lab.charts.length, 0);
  const figureCount = labs.reduce((total, lab) => total + lab.gallery.length, 0);

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-brand-50 to-white p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Lab Archive</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white lg:text-3xl">上机实验中心</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          五次上机实验的完整档案：实验任务与原理、报告中的真实数据、结果图、预计算推理结果与思考题。
          章节里的交互案例与这里双向跳转——案例页标注「来自实验 N」，档案里的知识点可直接跳到对应案例。
        </p>
        <p className="mt-3 text-xs text-slate-400">
          已读 {visitedLabs.length} / {labs.length} 份档案，进度保存在本地。
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "实验档案", value: labs.length },
            { label: "关联案例", value: caseCount },
            { label: "数据图表", value: chartCount },
            { label: "结果图", value: figureCount },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="font-mono text-lg font-semibold text-brand-700 dark:text-brand-300">{item.value}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {labs.map((lab) => {
          const caseIds = new Set(lab.sections.flatMap((section) => section.caseIds ?? []));
          return (
            <Link
              key={lab.id}
              to={`/labs/${lab.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="h-44 overflow-hidden bg-slate-100 dark:bg-slate-950">
                <img
                  src={lab.cover}
                  alt={lab.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-slate-400">{lab.id.toUpperCase()}</p>
                  <div className="flex items-center gap-2">
                    {visitedLabs.includes(lab.id) && (
                      <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        已读
                      </span>
                    )}
                    <p className="text-xs text-slate-400">{lab.date}</p>
                  </div>
                </div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{lab.title}</h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {lab.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lab.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                  <span>
                    {lab.sections.length} 个知识点 · {lab.charts.length} 组数据 · {lab.gallery.length} 张结果图
                    {caseIds.size > 0 && ` · ${caseIds.size} 个案例`}
                  </span>
                  <span className="font-medium text-brand-600 group-hover:underline">进入档案 →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
