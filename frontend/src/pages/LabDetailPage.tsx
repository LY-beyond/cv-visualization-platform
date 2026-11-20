import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { getLab } from "../data/labs";
import LabChartCard from "../components/labs/LabChartCard";
import LabGallery from "../components/labs/LabGallery";
import SlicPlayer from "../components/labs/SlicPlayer";
import DetectorResults from "../components/labs/DetectorResults";
import { useProgressStore } from "../stores/progressStore";

/** 案例 → 章节；模型 → 章节。用于档案页的「动手试试」与模型卡跳转。 */
const CASE_CHAPTER: Record<string, string> = {
  "lab2-filter-compare": "ch2",
  "lab2-edge-operators": "ch2",
  "lab3-bow-explorer": "ch3",
  "lab3-lenet-draw": "ch3",
  "lab4-meanshift": "ch4",
  "lab4-slic-player": "ch4",
  "lab4-canny-steps": "ch4",
  "lab4-transpose-conv": "ch4",
  "lab5-yolo-decode": "ch5",
  "lab5-letterbox": "ch5",
  "lab5-nms-lab": "ch5",
};

const MODEL_CHAPTER: Record<string, string> = {
  faster_rcnn: "ch5",
  mask_rcnn: "ch5",
  yolov3_coco: "ch5",
  yolo_v3: "ch5",
  lenet5: "ch3",
  resnet18: "ch3",
};

export default function LabDetailPage() {
  const { labId } = useParams<{ labId: string }>();
  const lab = getLab(labId);
  const visitLab = useProgressStore((state) => state.visitLab);

  useEffect(() => {
    if (lab) visitLab(lab.id);
  }, [lab, visitLab]);

  if (!lab) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">未找到该实验档案。</p>
        <Link to="/labs" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
          返回实验中心
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_1fr]">
          <div className="p-6 lg:p-8">
            <Link to="/labs" className="text-xs font-medium text-brand-600 hover:underline">
              ← 返回实验中心
            </Link>
            <p className="mt-4 font-mono text-xs text-slate-400">
              {lab.id.toUpperCase()} · {lab.date}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white lg:text-3xl">{lab.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{lab.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {lab.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">实验目的</h2>
              <ul className="mt-2 space-y-1.5">
                {lab.goals.map((goal) => (
                  <li key={goal} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="min-h-[220px] bg-slate-100 dark:bg-slate-950">
            <img src={lab.cover} alt={lab.title} className="h-full w-full object-cover" />
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-800">
            <p className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">本页目录</p>
            {lab.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded px-1 py-1 text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400"
              >
                {section.title}
              </a>
            ))}
            <a href="#questions" className="block rounded px-1 py-1 text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400">
              思考题与结论
            </a>
          </div>
        </nav>

        <div className="space-y-8">
          {lab.sections.map((section) => {
            const charts = lab.charts.filter((chart) => chart.sectionId === section.id);
            const figures = lab.gallery.filter((item) => item.sectionId === section.id);
            return (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-6 w-1 rounded-full bg-brand-500" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{section.title}</h2>
                </div>

                <div className="space-y-3">
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}

                  {lab.id === "lab4" && section.id === "slic" && <SlicPlayer />}
                  {lab.id === "lab5" && section.id === "compare" && <DetectorResults />}

                  {(section.caseIds?.length || section.modelIds?.length) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {section.caseIds?.map((caseId) => (
                        <Link
                          key={caseId}
                          to={`/chapters/${CASE_CHAPTER[caseId] ?? "ch2"}#case-${caseId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
                        >
                          动手试试 · {caseId}
                        </Link>
                      ))}
                      {section.modelIds?.map((modelId) => (
                        <Link
                          key={modelId}
                          to={`/chapters/${MODEL_CHAPTER[modelId] ?? "ch5"}#models`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          模型库 · {modelId}
                        </Link>
                      ))}
                    </div>
                  )}

                  {charts.length > 0 && (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {charts.map((chart) => (
                        <LabChartCard key={chart.title} chart={chart} />
                      ))}
                    </div>
                  )}

                  {figures.length > 0 && <LabGallery items={figures} />}
                </div>
              </section>
            );
          })}

          <section id="questions" className="scroll-mt-24">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-brand-500" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">思考题与结论</h2>
            </div>
            <div className="space-y-2">
              {lab.thoughtQuestions.map((item, index) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-700 marker:hidden dark:text-slate-200">
                    <span className="mr-2 font-mono text-xs text-brand-600">Q{index + 1}</span>
                    {item.q}
                    <span className="float-right text-slate-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 border-t border-slate-100 pt-2 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <p className="text-xs leading-relaxed text-slate-400">
            本页数据与结果图取自课程实验报告与运行留档，图片已本地化到站点静态目录；数值保留报告原值，
            未做四舍五入修饰。原始素材仍保存在仓库的「实验项目」目录中。
          </p>
        </div>
      </div>
    </div>
  );
}
