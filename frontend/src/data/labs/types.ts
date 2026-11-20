/**
 * 上机实验档案的数据结构。
 *
 * 实验中心采用数据驱动渲染：五次实验各一份 LabMeta，页面按 schema 统一渲染，
 * 不写五套硬编码页面。数值一律取自实验报告原文，并标注来源。
 */

export interface LabSection {
  /** 锚点 id */
  id: string;
  title: string;
  /** 正文段落（纯文本，避免注入 HTML） */
  paragraphs?: string[];
  /** 要点列表 */
  bullets?: string[];
  /** 关联的交互案例 id（章节案例） */
  caseIds?: string[];
  /** 关联的模型 id（模型库） */
  modelIds?: string[];
}

export interface LabSeries {
  name: string;
  values: number[];
}

export type LabChart =
  | {
      sectionId: string;
      title: string;
      /** 数据来源说明，如「实验二报告 表 3.2.3」 */
      source: string;
      kind: "bar";
      data: { categories: string[]; series: LabSeries[]; unit?: string };
    }
  | {
      sectionId: string;
      title: string;
      source: string;
      kind: "line";
      data: { x: string[]; series: LabSeries[]; unit?: string };
    }
  | {
      sectionId: string;
      title: string;
      source: string;
      kind: "table";
      data: { columns: string[]; rows: (string | number)[][] };
    };

export interface LabGalleryItem {
  sectionId: string;
  src: string;
  caption: string;
}

export interface LabMeta {
  /** lab1 .. lab5 */
  id: string;
  title: string;
  date: string;
  cover: string;
  tags: string[];
  summary: string;
  /** 实验目的 */
  goals: string[];
  sections: LabSection[];
  charts: LabChart[];
  gallery: LabGalleryItem[];
  thoughtQuestions: { q: string; a: string }[];
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** 拼接 public/labs 下的素材地址（兼容生产环境 /app 子路径） */
export function labAsset(path: string): string {
  return `${BASE}/labs/${path}`;
}
