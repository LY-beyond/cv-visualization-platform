import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { findChapter } from "../chapters/config";
import {
  findLevel,
  learningLevels,
  learningWorlds,
  type LearningLevel,
} from "../chapters/learningPath";
import { progressPercent, useProgressStore } from "../stores/progressStore";

function levelStatus(level: LearningLevel, visited: string[], completed: string[]) {
  if (completed.includes(level.id)) return { text: "已完成", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
  const touched = level.cases.some((item) => visited.includes(item.caseId));
  if (touched) return { text: "进行中", className: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" };
  return { text: "未开始", className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" };
}

export default function LearningPathPage() {
  const navigate = useNavigate();
  const { visitedCases, completedLevels, lastCase, reset } = useProgressStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [knownIds, setKnownIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    api.cases
      .list()
      .then((items) => setKnownIds(new Set(items.map((item) => item.id))))
      .catch(() => setKnownIds(null));
  }, []);

  const pathCaseIds = useMemo(
    () => Array.from(new Set(learningLevels.flatMap((level) => level.cases.map((item) => item.caseId)))),
    [],
  );
  const visitedInPath = pathCaseIds.filter((id) => visitedCases.includes(id));
  const percent = progressPercent(visitedInPath.length, pathCaseIds.length);
  const missingIds = knownIds ? pathCaseIds.filter((id) => !knownIds.has(id)) : [];

  const selected = selectedId ? findLevel(selectedId) ?? null : null;

  const enterLevel = (level: LearningLevel) => {
    const target = level.cases.find((item) => !visitedCases.includes(item.caseId)) ?? level.cases[0];
    if (!target) return;
    navigate(`/chapters/${target.chapterId}#case-${target.caseId}`);
  };

  const continueLearning = () => {
    if (lastCase) {
      navigate(`/chapters/${lastCase.chapterId}#case-${lastCase.caseId}`);
      return;
    }
    const firstLevel = learningLevels.find((level) => level.cases.length > 0);
    if (firstLevel) enterLevel(firstLevel);
  };

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-brand-50 to-white p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Learning Path</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white lg:text-3xl">学习路径闯关地图</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          四大学习世界把 {pathCaseIds.length} 个案例组织成有前置关系的关卡。完成关卡下的全部案例即可点亮关卡，进度保存在本地。
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="min-w-[220px] flex-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>总进度</span>
              <span className="font-mono">
                {visitedInPath.length} / {pathCaseIds.length} 案例 · {percent}%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={continueLearning}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            继续学习
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300"
          >
            重置进度
          </button>
        </div>
        {missingIds.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            学习路径中有 {missingIds.length} 个案例未注册：{missingIds.join("、")}。请检查案例 id 或后端注册表。
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {learningWorlds.map((world, worldIndex) => {
            const worldCaseIds = Array.from(new Set(world.levels.flatMap((level) => level.cases.map((item) => item.caseId))));
            const worldVisited = worldCaseIds.filter((id) => visitedCases.includes(id)).length;
            return (
              <section key={world.id}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-slate-400">WORLD {worldIndex + 1}</p>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{world.title}</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {world.description}
                    </p>
                  </div>
                  <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {worldVisited} / {worldCaseIds.length} 案例
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {world.levels.map((level) => {
                    const status = levelStatus(level, visitedCases, completedLevels);
                    const visitedCount = level.cases.filter((item) => visitedCases.includes(item.caseId)).length;
                    return (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setSelectedId(level.id)}
                        className={[
                          "rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:bg-slate-900 dark:hover:border-brand-700",
                          selectedId === level.id
                            ? "border-brand-400 ring-1 ring-brand-300 dark:border-brand-600"
                            : "border-slate-200 dark:border-slate-800",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{level.title}</p>
                          <span className={`badge ${status.className}`}>{status.text}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {level.summary}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {level.concepts.slice(0, 3).map((concept) => (
                            <span
                              key={concept}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-[11px] text-slate-400">
                          案例 {visitedCount} / {level.cases.length}
                          {level.prerequisites.length > 0 && ` · 前置 ${level.prerequisites.length} 关`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {selected ? (
            <div className="section-card space-y-4">
              <div>
                <p className="text-xs text-slate-400">{selected.worldTitle}</p>
                <h3 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">{selected.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{selected.summary}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">本关任务</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{selected.task}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
                  <p className="text-slate-400">输入</p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">{selected.input}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
                  <p className="text-slate-400">输出</p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">{selected.output}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">核心计算</p>
                <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-slate-500 dark:text-slate-400">
                  {selected.core.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">观察指标</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selected.metrics.join(" · ")}</p>
              </div>

              {selected.prerequisites.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">前置关卡</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selected.prerequisites.map((prerequisite) => {
                      const level = findLevel(prerequisite);
                      const done = completedLevels.includes(prerequisite);
                      return (
                        <span
                          key={prerequisite}
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            done
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {level?.title ?? prerequisite}
                        </span>
                      );
                    })}
                  </div>
                  {!selected.prerequisites.every((item) => completedLevels.includes(item)) && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">
                      前置关卡尚未全部完成，可先补齐基础，也可直接进入实验。
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">关联案例</p>
                <ul className="mt-1 space-y-1">
                  {selected.cases.map((item) => {
                    const visited = visitedCases.includes(item.caseId);
                    const chapter = findChapter(item.chapterId);
                    return (
                      <li key={item.caseId}>
                        <button
                          type="button"
                          onClick={() => navigate(`/chapters/${item.chapterId}#case-${item.caseId}`)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <span className="truncate">
                            {item.label ?? item.caseId}
                            <span className="ml-1 text-[10px] text-slate-400">{chapter?.title ?? item.chapterId}</span>
                          </span>
                          <span className={visited ? "text-emerald-600 dark:text-emerald-300" : "text-slate-300"}>
                            {visited ? "已访问" : "未访问"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {selected.cases.length === 0 && (
                    <li className="text-xs text-slate-400">该关卡为规划内容，暂无案例。</li>
                  )}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => enterLevel(selected)}
                disabled={selected.cases.length === 0}
                className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                进入实验
              </button>
            </div>
          ) : (
            <div className="section-card text-sm text-slate-400">
              从左侧选择一个关卡，查看输入输出、核心计算、观察指标与前置关系。
              <p className="mt-2 text-xs">学习路径仅记录本地进度，不会上传任何数据。</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
