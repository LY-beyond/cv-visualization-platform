import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";

import { activeChapters } from "../chapters/config";
import { findLevel, learningLevels, learningWorlds, type LearningLevel } from "../chapters/learningPath";
import { labs } from "../data/labs";
import { useProgressStore } from "../stores/progressStore";
import ThemedChart from "../viz/ThemedChart";

const WORLD_COLOR: Record<string, string> = {
  foundations: "#2563eb",
  "deep-vision": "#7c3aed",
  "recognition-segmentation": "#0d9488",
  "recognition-frontier": "#d97706",
};

/** 五次上机实验对应的主章节，用于图谱过滤与连线。 */
const LAB_CHAPTER: Record<string, string> = {
  lab1: "ch1",
  lab2: "ch2",
  lab3: "ch3",
  lab4: "ch4",
  lab5: "ch5",
};

interface GraphNode {
  id: string;
  name: string;
  kind: "chapter" | "level" | "case" | "lab";
  category: number;
  symbolSize: number;
  chapterId?: string;
  levelId?: string;
  labId?: string;
  itemStyle?: { color: string };
}

/** 知识图谱：章节 / 关卡 / 案例 / 实验四类节点，支持缩放拖拽与点击直达。 */
export default function GraphView() {
  const navigate = useNavigate();
  const { visitedCases, completedLevels } = useProgressStore();
  const [chapterFilter, setChapterFilter] = useState("all");
  const [showCases, setShowCases] = useState(true);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);

  const selectedLevel = selectedLevelId ? findLevel(selectedLevelId) ?? null : null;

  const nodes = useMemo<GraphNode[]>(() => {
    const items: GraphNode[] = [];
    const chapters = activeChapters.filter(
      (chapter) => chapterFilter === "all" || chapter.id === chapterFilter,
    );
    const chapterIds = new Set(chapters.map((chapter) => chapter.id));

    chapters.forEach((chapter) => {
      items.push({
        id: `chapter:${chapter.id}`,
        name: chapter.title,
        kind: "chapter",
        category: 0,
        symbolSize: 42,
        chapterId: chapter.id,
      });
    });

    const levels = learningLevels.filter(
      (level) => chapterFilter === "all" || level.cases.some((item) => chapterIds.has(item.chapterId)),
    );
    const levelIds = new Set(levels.map((level) => level.id));

    labs
      .filter((lab) => chapterFilter === "all" || LAB_CHAPTER[lab.id] === chapterFilter)
      .forEach((lab) => {
        items.push({
          id: `lab:${lab.id}`,
          name: lab.title,
          kind: "lab",
          category: 3,
          symbolSize: 26,
          chapterId: LAB_CHAPTER[lab.id],
          labId: lab.id,
          itemStyle: { color: "#ea580c" },
        });
      });

    levels.forEach((level) => {
      items.push({
        id: `level:${level.id}`,
        name: level.title,
        kind: "level",
        category: 1,
        symbolSize: 30,
        levelId: level.id,
        itemStyle: { color: WORLD_COLOR[level.worldId] ?? "#64748b" },
      });
    });

    if (showCases) {
      const seen = new Set<string>();
      levels.forEach((level) => {
        level.cases
          .filter((item) => chapterFilter === "all" || chapterIds.has(item.chapterId))
          .forEach((item) => {
            const id = `case:${item.caseId}`;
            if (seen.has(id)) return;
            seen.add(id);
            items.push({
              id,
              name: item.label ?? item.caseId,
              kind: "case",
              category: 2,
              symbolSize: visitedCases.includes(item.caseId) ? 16 : 12,
              chapterId: item.chapterId,
              levelId: level.id,
              itemStyle: {
                color: visitedCases.includes(item.caseId) ? "#16a34a" : "#94a3b8",
              },
            });
          });
      });
    }

    return items.filter((node) => node.kind !== "level" || levelIds.has(node.levelId ?? ""));
  }, [chapterFilter, showCases, visitedCases]);

  const edges = useMemo(() => {
    const items: { source: string; target: string; lineStyle?: { color: string; width: number } }[] = [];
    const nodeIds = new Set(nodes.map((node) => node.id));

    learningLevels.forEach((level) => {
      const levelNodeId = `level:${level.id}`;
      if (!nodeIds.has(levelNodeId)) return;
      level.cases.forEach((item) => {
        const caseNodeId = `case:${item.caseId}`;
        const chapterNodeId = `chapter:${item.chapterId}`;
        if (nodeIds.has(caseNodeId)) {
          items.push({
            source: levelNodeId,
            target: caseNodeId,
            lineStyle: { color: WORLD_COLOR[level.worldId] ?? "#94a3b8", width: 1 },
          });
          if (nodeIds.has(chapterNodeId)) {
            items.push({ source: chapterNodeId, target: caseNodeId, lineStyle: { color: "#cbd5e1", width: 0.6 } });
          }
        }
      });
      level.prerequisites.forEach((prerequisite) => {
        const sourceId = `level:${prerequisite}`;
        if (nodeIds.has(sourceId)) {
          items.push({
            source: sourceId,
            target: levelNodeId,
            lineStyle: { color: "#fb923c", width: 1.2 },
          });
        }
      });
    });

    // 关卡与章节的包含关系，帮助理解章节覆盖面
    learningLevels.forEach((level) => {
      const levelNodeId = `level:${level.id}`;
      if (!nodeIds.has(levelNodeId)) return;
      const chapters = Array.from(new Set(level.cases.map((item) => item.chapterId)));
      chapters.forEach((chapterId) => {
        const chapterNodeId = `chapter:${chapterId}`;
        if (nodeIds.has(chapterNodeId)) {
          items.push({ source: chapterNodeId, target: levelNodeId, lineStyle: { color: "#e2e8f0", width: 0.5 } });
        }
      });
    });

    // 实验档案与章节、案例的连线：实验是章节内容的真实数据来源
    labs.forEach((lab) => {
      const labNodeId = `lab:${lab.id}`;
      if (!nodeIds.has(labNodeId)) return;
      const chapterId = LAB_CHAPTER[lab.id];
      if (chapterId && nodeIds.has(`chapter:${chapterId}`)) {
        items.push({
          source: `chapter:${chapterId}`,
          target: labNodeId,
          lineStyle: { color: "#fdba74", width: 1.2 },
        });
      }
      const caseIds = new Set(lab.sections.flatMap((section) => section.caseIds ?? []));
      caseIds.forEach((caseId) => {
        const caseNodeId = `case:${caseId}`;
        if (nodeIds.has(caseNodeId)) {
          items.push({ source: labNodeId, target: caseNodeId, lineStyle: { color: "#fdba74", width: 0.9 } });
        }
      });
    });

    return items;
  }, [nodes]);

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        formatter: (params: unknown) => {
          const data = (params as { data?: GraphNode }).data;
          if (!data) return "";
          if (data.kind === "case") return `案例：${data.name}<br/>点击跳转到对应实验`;
          if (data.kind === "lab") return `上机实验：${data.name}<br/>点击查看实验档案`;
          if (data.kind === "level") return `关卡：${data.name}<br/>点击查看关卡信息`;
          return `章节：${data.name}`;
        },
      },
      legend: {
        top: 0,
        data: learningWorlds.map((world) => world.title),
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          top: 28,
          force: { repulsion: 220, edgeLength: [50, 120], gravity: 0.08 },
          label: { show: true, fontSize: 10, position: "right" },
          edgeSymbol: ["none", "arrow"],
          edgeSymbolSize: 5,
          categories: [
            { name: "章节" },
            { name: "关卡" },
            { name: "案例" },
            { name: "实验" },
          ],
          data: nodes.map((node) => ({
            ...node,
            label: { show: node.kind !== "case" || showCases },
          })),
          links: edges,
          lineStyle: { opacity: 0.6, curveness: 0.08 },
          emphasis: { focus: "adjacency", lineStyle: { width: 2 } },
        },
      ],
    }),
    [nodes, edges, showCases],
  );

  const onEvents = useMemo(
    () => ({
      click: (params: unknown) => {
        const data = (params as { data?: GraphNode }).data;
        if (!data) return;
        if (data.kind === "case" && data.chapterId) {
          navigate(`/chapters/${data.chapterId}#case-${data.id.replace(/^case:/, "")}`);
        } else if (data.kind === "lab" && data.labId) {
          navigate(`/labs/${data.labId}`);
        } else if (data.kind === "level" && data.levelId) {
          setSelectedLevelId(data.levelId);
        }
      },
    }),
    [navigate],
  );

  const completedCount = learningLevels.filter(
    (level) => completedLevels.includes(level.id) && level.cases.length > 0,
  ).length;
  const totalLevels = learningLevels.filter((level) => level.cases.length > 0).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Knowledge Graph</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white lg:text-3xl">知识图谱</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          章节、关卡、案例与上机实验构成四层知识网络。支持滚轮缩放与拖拽，点击案例节点进入对应章节实验，点击橙色实验节点打开实验档案。
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          章节
          <select
            value={chapterFilter}
            onChange={(event) => setChapterFilter(event.target.value)}
            className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">全部章节</option>
            {activeChapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={showCases}
            onChange={(event) => setShowCases(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
          />
          显示案例节点
        </label>
        <button
          type="button"
          onClick={() => {
            setChapterFilter("all");
            setShowCases(true);
            setSelectedLevelId(null);
          }}
          className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
        >
          回到全量视图
        </button>
        <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          已完成关卡 {completedCount} / {totalLevels}
        </span>
      </div>

      <div className="section-card p-2">
        <ThemedChart option={option} height={560} onEvents={onEvents} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {learningWorlds.map((world) => (
          <div key={world.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WORLD_COLOR[world.id] }} />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{world.title}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {world.levels.length} 个关卡 ·{" "}
              {world.levels.reduce((total, level) => total + level.cases.length, 0)} 个案例
            </p>
          </div>
        ))}
      </div>

      {selectedLevel && (
        <div className="section-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-400">{selectedLevel.worldTitle}</p>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{selectedLevel.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {selectedLevel.summary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLevelId(null)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300"
            >
              关闭
            </button>
          </div>
          <LevelCases level={selectedLevel} />
        </div>
      )}
    </div>
  );
}

function LevelCases({ level }: { level: LearningLevel & { worldTitle: string } }) {
  const navigate = useNavigate();
  const { visitedCases } = useProgressStore();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {level.cases.map((item) => (
        <button
          key={item.caseId}
          type="button"
          onClick={() => navigate(`/chapters/${item.chapterId}#case-${item.caseId}`)}
          className={[
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            visitedCases.includes(item.caseId)
              ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
              : "border-slate-200 text-slate-500 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300",
          ].join(" ")}
        >
          {item.label ?? item.caseId}
        </button>
      ))}
    </div>
  );
}
