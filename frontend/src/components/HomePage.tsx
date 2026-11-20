import { useEffect } from "react";
import { Link } from "react-router-dom";

import { activeChapters } from "../chapters/config";
import { learningLevels, learningWorlds } from "../chapters/learningPath";
import { labs } from "../data/labs";
import { useDatasetStore } from "../stores/datasetStore";
import { useModelStore } from "../stores/modelStore";
import { progressPercent, useProgressStore } from "../stores/progressStore";

export default function HomePage() {
  const { items: datasets, load: loadDatasets } = useDatasetStore();
  const { items: models, load: loadModels } = useModelStore();
  const { visitedCases, completedLevels } = useProgressStore();

  useEffect(() => {
    void loadDatasets();
    void loadModels();
  }, [loadDatasets, loadModels]);

  const pathCaseIds = Array.from(
    new Set(learningLevels.flatMap((level) => level.cases.map((item) => item.caseId))),
  );
  const visitedInPath = pathCaseIds.filter((id) => visitedCases.includes(id));
  const percent = progressPercent(visitedInPath.length, pathCaseIds.length);
  const completedLevelCount = learningLevels.filter((level) => completedLevels.includes(level.id)).length;
  const progressBadge =
    percent >= 80
      ? { text: "完成", className: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm" }
      : percent >= 30
        ? { text: "进阶", className: "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm" }
        : { text: "起步", className: "bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-sm" };

  const stats = [
    { label: "课件章节", value: activeChapters.length, hint: "与课件一一对应", color: "from-brand-500 to-violet-500" },
    { label: "学习关卡", value: learningLevels.length, hint: `${completedLevelCount} 关已完成`, color: "from-violet-500 to-accent-500" },
    { label: "注册数据集", value: datasets.length || "—", hint: "可平滑扩展大数据集", color: "from-accent-500 to-amber-400" },
    { label: "注册模型", value: models.length || "—", hint: "现场训练 / 预训练 / 结构展示", color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="space-y-12">
      {/* Hero 区 */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-brand-soft p-8 shadow-card dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 lg:p-12">
        {/* 装饰光团 */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-brand-300/30 to-violet-300/20 blur-3xl dark:from-brand-700/20 dark:to-violet-700/10" />
        <div className="pointer-events-none absolute -right-12 top-10 h-48 w-48 rounded-full bg-gradient-to-br from-accent-400/20 to-brand-400/20 blur-3xl dark:from-accent-700/10 dark:to-brand-700/10" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-gradient-to-br from-violet-300/25 to-transparent blur-2xl dark:from-violet-700/15" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 animate-pulse-glow" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gradient-brand">
              Computer Vision Course Project
            </p>
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-slate-900 dark:text-white lg:text-5xl">
            <span className="text-gradient-brand">计算机视觉</span>
            <span className="text-slate-900 dark:text-white"> 交互式教学可视化平台</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 lg:text-base">
            按课件章节组织知识点讲解、可交互算法案例、模型训练与对比，贯通从手工特征到深度学习端到端方法的演进主线。
          </p>

          {/* 统计卡片 */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur-sm transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-card-hover dark:border-slate-800/60 dark:bg-slate-900/70"
              >
                {/* 渐变装饰条 */}
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.color} opacity-80`} />
                <p className={`text-3xl font-extrabold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{stat.label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 四大学习世界 */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              <span className="text-gradient-brand">四大学习世界</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              把 {pathCaseIds.length} 个案例组织成有前置关系的关卡，按路径推进或直接跳转实验。
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className={`badge ${progressBadge.className}`}>{progressBadge.text}</span>
            <span className="text-xs text-slate-400">
              总进度 {visitedInPath.length} / {pathCaseIds.length} · {percent}%
            </span>
            <Link to="/path" className="btn-gradient !px-4 !py-2 !text-xs">学习路径</Link>
            <Link to="/graph" className="btn-ghost !px-3 !py-1.5 !text-xs">知识图谱</Link>
            <Link to="/labs" className="btn-ghost !px-3 !py-1.5 !text-xs">上机实验</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {learningWorlds.map((world, index) => {
            const worldCaseIds = Array.from(
              new Set(world.levels.flatMap((level) => level.cases.map((item) => item.caseId))),
            );
            const done = worldCaseIds.filter((id) => visitedCases.includes(id)).length;
            const worldPercent = progressPercent(done, worldCaseIds.length);
            return (
              <Link key={world.id} to="/path" className="group card-interactive p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xs text-slate-400">WORLD {index + 1}</span>
                  <span className="badge bg-gradient-to-r from-brand-500/10 to-violet-500/10 text-brand-700 dark:from-brand-900/40 dark:to-violet-900/40 dark:text-brand-300">
                    {world.levels.length} 个关卡
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900 transition-colors duration-200 group-hover:text-gradient-brand dark:text-white">
                  {world.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {world.description}
                </p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      案例 {done} / {worldCaseIds.length}
                    </span>
                    <span>{worldPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full progress-gradient transition-all duration-500" style={{ width: `${worldPercent}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 上机实验中心 */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              <span className="text-gradient-brand">上机实验中心</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              五次上机实验的过程、真实数据与结果图，已与章节案例、模型库互相打通。
            </p>
          </div>
          <Link to="/labs" className="btn-gradient !px-4 !py-2 !text-xs">进入实验中心</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {labs.map((lab) => (
            <Link key={lab.id} to={`/labs/${lab.id}`} className="group card-interactive overflow-hidden">
              <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-950">
                <img
                  src={lab.cover}
                  alt={lab.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-400">{lab.id.toUpperCase()}</span>
                  <span className="text-xs text-slate-400">{lab.date}</span>
                </div>
                <h3 className="mt-1 line-clamp-1 text-base font-bold text-slate-900 transition-colors duration-200 group-hover:text-gradient-brand dark:text-white">
                  {lab.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {lab.summary}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 课程章节 */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              <span className="text-gradient-brand">课程章节</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              每章采用「知识点讲解 / 交互实验 / 结果展示」三段式页面结构。
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {activeChapters.map((chapter) => (
            <Link key={chapter.id} to={`/chapters/${chapter.id}`} className="group card-interactive p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs text-slate-400">{chapter.order}</span>
                <span className="badge bg-gradient-to-r from-brand-500/10 to-violet-500/10 text-brand-700 dark:from-brand-900/40 dark:to-violet-900/40 dark:text-brand-300">
                  {chapter.knowledge.length} 个知识块
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900 transition-colors duration-200 group-hover:text-gradient-brand dark:text-white">
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
