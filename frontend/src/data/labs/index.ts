import type { LabMeta } from "./types";
import { lab1 } from "./lab1";
import { lab2 } from "./lab2";
import { lab3 } from "./lab3";
import { lab4 } from "./lab4";
import { lab5 } from "./lab5";

export const labs: LabMeta[] = [lab1, lab2, lab3, lab4, lab5];

export function getLab(id: string | undefined): LabMeta | undefined {
  return labs.find((lab) => lab.id === id);
}

/** 案例在实验档案中的出处，用于章节案例卡上的「来自上机实验」徽标。 */
export interface CaseLabOrigin {
  labId: string;
  labTitle: string;
  sectionId: string;
  sectionTitle: string;
}

export const caseLabOrigin: Record<string, CaseLabOrigin> = {};
for (const lab of labs) {
  for (const section of lab.sections) {
    for (const caseId of section.caseIds ?? []) {
      // 同一案例出现在多个小节时，保留最先登记的一处作为出处
      if (!caseLabOrigin[caseId]) {
        caseLabOrigin[caseId] = {
          labId: lab.id,
          labTitle: lab.title,
          sectionId: section.id,
          sectionTitle: section.title,
        };
      }
    }
  }
}

export * from "./types";
