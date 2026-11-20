/**
 * 离线规则引擎：基于当前案例参数、指标与步骤给出解释、参数分析、结果诊断与讲解稿。
 * 所有结论都附带依据，不依赖外部服务；在线大模型仅作为可选增强。
 */

import { getGuidance } from "../cases/guidance";
import type { AssistantContext } from "./context";

export type DiagnosisLevel = "info" | "warn" | "error";

export interface Diagnosis {
  level: DiagnosisLevel;
  title: string;
  detail: string;
}

export type AssistantAction = "explain" | "analyze" | "diagnose" | "script";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^\d.+-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function paramNumber(ctx: AssistantContext, name: string): number | null {
  return toNumber(ctx.params[name]);
}

function metricNumber(ctx: AssistantContext, key: string): number | null {
  return toNumber(ctx.metrics[key]);
}

function findMetric(ctx: AssistantContext, suffix: string): [string, number] | null {
  for (const [key, value] of Object.entries(ctx.metrics)) {
    if (key.endsWith(suffix)) {
      const parsed = toNumber(value);
      if (parsed !== null) return [key, parsed];
    }
  }
  return null;
}

/** 通用诊断：结果是否为空、步骤是否完整、指标是否缺失。 */
function genericRules(ctx: AssistantContext): Diagnosis[] {
  const items: Diagnosis[] = [];
  const { images, charts } = ctx.resultSummary;

  if (images === 0 && charts === 0) {
    items.push({
      level: "error",
      title: "当前没有可视化结果",
      detail: "案例尚未返回图片或图表。请确认后端案例已实现，并检查输入图片与参数范围后重新计算。",
    });
  }
  if (ctx.steps.length === 0) {
    items.push({
      level: "warn",
      title: "缺少步骤信息",
      detail: "该案例未返回中间步骤，无法回放计算过程；可先观察输入与最终输出。",
    });
  } else if (ctx.steps.length === 1) {
    items.push({
      level: "info",
      title: "步骤较少",
      detail: "只返回了 1 个步骤，说明流程被合并或提前结束；可检查参数是否使算法一次性完成。",
    });
  }
  if (Object.keys(ctx.metrics).length === 0) {
    items.push({
      level: "info",
      title: "没有量化指标",
      detail: "该案例以视觉结果为主，建议结合步骤说明定性判断。",
    });
  }
  return items;
}

/** 案例专属规则：结论必须引用具体参数或指标。 */
function caseRules(ctx: AssistantContext): Diagnosis[] {
  const items: Diagnosis[] = [];
  const id = ctx.caseId ?? "";

  if (id === "detect_overlay") {
    const conf = paramNumber(ctx, "conf");
    const iou = paramNumber(ctx, "iou");
    const kept = metricNumber(ctx, "最终保留");
    const suppressed = metricNumber(ctx, "被 NMS 抑制");
    const filtered = metricNumber(ctx, "置信度过滤后");

    if (conf !== null && conf < 0.3) {
      items.push({
        level: "warn",
        title: "置信度阈值偏低",
        detail: `当前 conf=${conf.toFixed(2)}，低分候选框会被保留，容易出现背景误检；建议提升到 0.5 左右再对比。`,
      });
    }
    if (conf !== null && conf > 0.85) {
      items.push({
        level: "warn",
        title: "置信度阈值偏高",
        detail: `当前 conf=${conf.toFixed(2)}，部分真实目标（如得分 0.84 的三角形）会被过滤掉，注意漏检。`,
      });
    }
    if (iou !== null && iou > 0.65) {
      items.push({
        level: "warn",
        title: "NMS 抑制不足",
        detail: `当前 IoU 阈值 ${iou.toFixed(2)} 偏大，同类重叠框难以被抑制，结果中可能残留重复框。`,
      });
    }
    if (iou !== null && iou < 0.25) {
      items.push({
        level: "info",
        title: "NMS 抑制较强",
        detail: `当前 IoU 阈值 ${iou.toFixed(2)} 偏小，相邻目标可能被误删，建议观察密集区域。`,
      });
    }
    if (kept !== null && kept === 1 && filtered !== null && filtered > 2) {
      items.push({
        level: "info",
        title: "最终只保留 1 个框",
        detail: `过滤后仍有 ${filtered} 个候选框，但 NMS 只保留 1 个，说明多数候选框高度重叠。`,
      });
    }
    if (suppressed !== null && suppressed > 0) {
      items.push({
        level: "info",
        title: "存在被抑制的重复框",
        detail: `本次共抑制 ${suppressed} 个重复框，可与灰色细框对照，理解 NMS 的作用。`,
      });
    }
  }

  if (id === "kmeans_seg") {
    const k = paramNumber(ctx, "k");
    const maxIter = paramNumber(ctx, "max_iter");
    const used = metricNumber(ctx, "实际迭代");
    const foreground = metricNumber(ctx, "前景像素占比");

    if (k !== null && k >= 10) {
      items.push({
        level: "warn",
        title: "簇数偏大导致碎片化",
        detail: `当前 K=${k}，颜色相近的区域会被拆成多个簇，分割结果容易碎片化；建议先取 2~6 观察主体结构。`,
      });
    }
    if (maxIter !== null && maxIter < 5) {
      items.push({
        level: "warn",
        title: "迭代轮数不足",
        detail: `当前最大迭代 ${maxIter} 轮，聚类可能尚未收敛；可提高轮数并观察 SSE 曲线是否走平。`,
      });
    }
    if (used !== null && maxIter !== null && used < maxIter) {
      items.push({
        level: "info",
        title: "提前收敛",
        detail: `第 ${used} 轮簇心位移已小于 0.5，聚类提前结束，说明当前 K 下结构较稳定。`,
      });
    }
    if (foreground !== null && foreground < 5) {
      items.push({
        level: "info",
        title: "前景占比偏低",
        detail: `前景像素仅占 ${foreground.toFixed(1)}%，可能是背景颜色被选为前景簇，可换个输入图或调整 K。`,
      });
    }
  }

  if (id === "canny_steps") {
    const low = paramNumber(ctx, "low");
    const high = paramNumber(ctx, "high");
    const sigma = paramNumber(ctx, "sigma");
    const ratio = metricNumber(ctx, "边缘占比");

    if (low !== null && high !== null) {
      if (low >= high) {
        items.push({
          level: "error",
          title: "双阈值顺序异常",
          detail: `低阈值 ${low} 不小于高阈值 ${high}，后端已自动交换，建议手动设置低阈值小于高阈值。`,
        });
      } else if (high / Math.max(low, 1) > 4) {
        items.push({
          level: "warn",
          title: "双阈值比例过大",
          detail: `高/低阈值为 ${high}/${low}，弱边缘连接条件苛刻，边缘容易断裂。`,
        });
      } else if (high / Math.max(low, 1) < 2) {
        items.push({
          level: "warn",
          title: "双阈值过于接近",
          detail: `高/低阈值为 ${high}/${low}，弱边缘几乎全部保留，纹理噪声会增多。`,
        });
      }
    }
    if (sigma !== null && sigma >= 3) {
      items.push({
        level: "warn",
        title: "高斯平滑过强",
        detail: `当前 σ=${sigma.toFixed(1)}，细节会被明显抹平；可降到 1.0~1.5 对比。`,
      });
    }
    if (ratio !== null) {
      if (ratio > 15) {
        items.push({
          level: "warn",
          title: "边缘像素过多",
          detail: `边缘占比 ${ratio.toFixed(2)}%，很可能把纹理噪声也判为边缘。`,
        });
      } else if (ratio < 0.5) {
        items.push({
          level: "info",
          title: "边缘像素很少",
          detail: `边缘占比仅 ${ratio.toFixed(2)}%，可适当降低低阈值补充弱边缘。`,
        });
      }
    }
  }

  if (id === "threshold_compare") {
    const threshold = paramNumber(ctx, "threshold");
    const otsu = metricNumber(ctx, "Otsu 阈值");
    if (threshold !== null && otsu !== null) {
      const gap = Math.abs(threshold - otsu);
      items.push({
        level: "info",
        title: "固定阈值与 Otsu 对比",
        detail: `固定阈值 ${threshold}，Otsu 自动阈值 ${otsu}，相差 ${gap.toFixed(0)} 个灰度级；差距越大，两种结果差异越明显。`,
      });
    }
    if (threshold !== null && (threshold < 30 || threshold > 225)) {
      items.push({
        level: "warn",
        title: "固定阈值位于灰度极值附近",
        detail: `当前 T=${threshold}，前景占比会接近 0% 或 100%，不利于观察结构。`,
      });
    }
  }

  if (id === "model_compare") {
    const best = findMetric(ctx, "最佳准确率");
    const count = metricNumber(ctx, "对比模型数");
    if (best && best[1] < 70) {
      items.push({
        level: "warn",
        title: "最佳模型准确率偏低",
        detail: `当前最佳准确率 ${best[1].toFixed(1)}%，可检查训练轮数、数据集划分与特征表示。`,
      });
    }
    if (best && best[1] >= 90) {
      items.push({
        level: "info",
        title: "模型表现良好",
        detail: `最佳准确率 ${best[1].toFixed(1)}%，可进一步比较参数量与推理开销，而不是只看精度。`,
      });
    }
    if (count !== null && count < 2) {
      items.push({
        level: "info",
        title: "对比模型不足",
        detail: "当前只有 1 个模型的结果，建议在分类章训练 LeNet-5 或 SVM 后再对比。",
      });
    }
  }

  if (id === "confusion_gallery") {
    const weakest = ctx.metrics["召回最低类别"];
    if (typeof weakest === "string" && weakest !== "-") {
      items.push({
        level: "warn",
        title: "存在召回最低类别",
        detail: `召回最低的是 ${weakest}，结合错误样例查看是否被相邻类别系统性混淆。`,
      });
    }
  }

  if (id === "feature_embedding") {
    const method = String(ctx.params["method"] ?? "tsne");
    const source = String(ctx.metrics["数据来源"] ?? "");
    if (method === "pca") {
      items.push({
        level: "info",
        title: "PCA 只做线性投影",
        detail: "PCA 保留方差最大方向，类别重叠较常见；切换到 t-SNE 更易观察局部簇结构。",
      });
    }
    if (source === "示例分布") {
      items.push({
        level: "info",
        title: "当前为示例分布",
        detail: "本地没有可用样本特征，展示的是合成分布；训练后会自动切换为真实特征。",
      });
    }
  }

  if (id === "ransac_filter") {
    const threshold = paramNumber(ctx, "threshold");
    if (threshold !== null && threshold < 2) {
      items.push({
        level: "warn",
        title: "误差阈值过小",
        detail: `当前阈值 ${threshold.toFixed(1)}，内点数量可能不足，单应矩阵估计不稳定。`,
      });
    }
    if (threshold !== null && threshold > 12) {
      items.push({
        level: "warn",
        title: "误差阈值过大",
        detail: `当前阈值 ${threshold.toFixed(1)}，误匹配可能被当作内点，拼接会出现错位。`,
      });
    }
  }

  if (id === "feature_matching") {
    const maxMatches = paramNumber(ctx, "max_matches");
    if (maxMatches !== null && maxMatches > 120) {
      items.push({
        level: "info",
        title: "匹配数量较多",
        detail: `当前上限 ${maxMatches}，连线过密会掩盖误匹配；建议先看 30~50 条再逐步增加。`,
      });
    }
  }

  if (id === "nms_steps") {
    const iou = paramNumber(ctx, "iou_threshold");
    if (iou !== null && iou > 0.7) {
      items.push({
        level: "warn",
        title: "NMS 阈值偏大",
        detail: `当前 IoU 阈值 ${iou.toFixed(2)}，重叠框不易被抑制，最终保留框会偏多。`,
      });
    }
    if (iou !== null && iou < 0.2) {
      items.push({
        level: "info",
        title: "NMS 阈值偏小",
        detail: `当前 IoU 阈值 ${iou.toFixed(2)}，相邻目标可能被误抑制。`,
      });
    }
  }

  if (id === "iou_calc") {
    const x1 = paramNumber(ctx, "x1");
    const y1 = paramNumber(ctx, "y1");
    const w1 = paramNumber(ctx, "w1");
    const h1 = paramNumber(ctx, "h1");
    const x2 = paramNumber(ctx, "x2");
    const y2 = paramNumber(ctx, "y2");
    const w2 = paramNumber(ctx, "w2");
    const h2 = paramNumber(ctx, "h2");
    if ([x1, y1, w1, h1, x2, y2, w2, h2].every((value) => value !== null)) {
      const interW = Math.max(0, Math.min(x1! + w1!, x2! + w2!) - Math.max(x1!, x2!));
      const interH = Math.max(0, Math.min(y1! + h1!, y2! + h2!) - Math.max(y1!, y2!));
      const intersection = interW * interH;
      const union = w1! * h1! + w2! * h2! - intersection;
      const iou = union > 0 ? intersection / union : 0;
      items.push({
        level: iou >= 0.5 ? "warn" : "info",
        title: `当前两框 IoU ≈ ${iou.toFixed(3)}`,
        detail:
          iou >= 0.5
            ? "重叠程度较高，若属于同类目标，NMS 通常会抑制其中一个。"
            : "重叠程度较低，两个框可以同时保留。",
      });
    }
  }

  return items;
}

/** 综合诊断：通用规则在前，专属规则在后。 */
export function diagnose(ctx: AssistantContext): Diagnosis[] {
  return [...genericRules(ctx), ...caseRules(ctx)];
}

function formatParams(ctx: AssistantContext): string {
  const entries = Object.entries(ctx.params);
  if (entries.length === 0) return "该案例没有可调参数。";
  return entries.map(([key, value]) => `- ${key} = ${String(value)}`).join("\n");
}

function formatMetrics(ctx: AssistantContext): string {
  const entries = Object.entries(ctx.metrics);
  if (entries.length === 0) return "（无量化指标）";
  return entries.map(([key, value]) => `- ${key}：${String(value)}`).join("\n");
}

function formatSteps(ctx: AssistantContext): string {
  if (ctx.steps.length === 0) return "（无步骤信息）";
  return ctx.steps
    .map((step, index) => `${index + 1}. ${step.title ?? "步骤"}：${step.description ?? ""}`)
    .join("\n");
}

export function explainCase(ctx: AssistantContext): string {
  const guidance = getGuidance(ctx.caseId ?? "");
  const lines = [
    `【算法原理】${guidance.principle}`,
    guidance.formula ? `\n【核心公式】${guidance.formula}` : "",
    `\n【本案例】${ctx.caseName ?? ctx.caseId ?? "未选择案例"}（${ctx.chapterTitle}）`,
    ctx.steps.length > 0 ? `\n【执行流程】\n${formatSteps(ctx)}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function analyzeParams(ctx: AssistantContext): string {
  const guidance = getGuidance(ctx.caseId ?? "");
  const lines = [
    `【当前参数】\n${formatParams(ctx)}`,
    `\n【建议尝试】\n${guidance.hints.map((hint) => `- ${hint}`).join("\n")}`,
  ];
  if (guidance.pitfalls && guidance.pitfalls.length > 0) {
    lines.push(`\n【常见误区】\n${guidance.pitfalls.map((item) => `- ${item}`).join("\n")}`);
  }
  lines.push(`\n【当前指标】\n${formatMetrics(ctx)}`);
  return lines.join("\n");
}

export function diagnoseText(ctx: AssistantContext): string {
  const items = diagnose(ctx);
  const label: Record<DiagnosisLevel, string> = { info: "提示", warn: "注意", error: "问题" };
  const body = items
    .map((item) => `- [${label[item.level]}] ${item.title}：${item.detail}`)
    .join("\n");
  return `【结果诊断】\n${body}`;
}

export function generateScript(ctx: AssistantContext): string {
  const guidance = getGuidance(ctx.caseId ?? "");
  const items = diagnose(ctx).filter((item) => item.level !== "info");
  return [
    `【讲解稿】${ctx.caseName ?? ctx.caseId ?? "案例"}`,
    `\n各位好，本案例属于「${ctx.chapterTitle}」，主题是${ctx.caseName ?? "算法演示"}。`,
    `\n它的核心思想是：${guidance.principle}`,
    guidance.formula ? `\n对应的核心公式为：${guidance.formula}。` : "",
    `\n本次使用的参数是：${Object.entries(ctx.params)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join("，") || "无"}。`,
    `\n运行后得到的关键指标为：\n${formatMetrics(ctx)}`,
    ctx.steps.length > 0 ? `\n算法过程分为 ${ctx.steps.length} 步：${ctx.steps.map((s) => s.title ?? "步骤").join(" → ")}。` : "",
    items.length > 0
      ? `\n需要特别说明的是：${items.map((item) => item.detail).join(" ")}`
      : "\n当前参数下结果整体稳定，可以继续调整参数观察变化。",
    "\n以上就是本案例的演示，谢谢。",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 简单关键词路由，让自由提问也能得到可用回答。 */
export function answerQuestion(question: string, ctx: AssistantContext): string {
  const text = question.trim();
  if (!text) return "请输入问题，或直接点击上方的快捷动作。";
  if (/讲解稿|讲稿|演示稿|串词/.test(text)) return generateScript(ctx);
  if (/参数|调参|阈值/.test(text)) return analyzeParams(ctx);
  if (/诊断|结果|为什么|原因|问题/.test(text)) return diagnoseText(ctx);
  return `${explainCase(ctx)}\n\n【针对你的问题】\n当前自由提问仅支持离线规则回答，可尝试“分析参数”“诊断结果”或“生成讲解稿”。`;
}
