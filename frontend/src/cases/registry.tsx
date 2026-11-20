import type { ComponentType } from "react";

import type { CaseMeta } from "../api/types";
import { ConvSlide, PoolingDemo } from "./frontend/BasicCases";
import { BowAnimation, CnnStructure, TrainingCurveReplay } from "./frontend/ClassificationCases";
import { BoxFormatDemo, IouCalculator, NmsSteps, TwoStageFlow, YoloGrid } from "./frontend/DetectionCases";
import { ApplicationGallery, MethodCompare, Timeline } from "./frontend/OverviewCases";
import { BiometricCompare, DistanceMatch, RecognitionModes } from "./frontend/RecognitionCases";
import SegStructure from "./frontend/SegCases";
import { OnnxDetectCase, OnnxSegmentCase } from "./frontend/OnnxCases";
import {
  BowExplorer,
  LetterboxLab,
  NmsThresholdLab,
  SlicIterationCase,
  YoloDecodeLab,
} from "./frontend/LabCases";
import LenetCase from "./frontend/LenetCase";

export type CaseComponent = ComponentType<{ meta: CaseMeta }>;

/**
 * 前端交互案例注册表。
 * 新增纯前端案例时，在此登记案例标识与组件，章节页会自动挂载。
 */
const registry: Record<string, CaseComponent> = {
  timeline: Timeline,
  method_compare: MethodCompare,
  application_gallery: ApplicationGallery,
  bow_animation: BowAnimation,
  training_curve: TrainingCurveReplay,
  cnn_structure: CnnStructure,
  pooling_demo: PoolingDemo,
  conv_slide: ConvSlide,
  seg_structure: SegStructure,
  box_format: BoxFormatDemo,
  iou_calc: IouCalculator,
  nms_steps: NmsSteps,
  yolo_grid: YoloGrid,
  two_stage_flow: TwoStageFlow,
  recognition_modes: RecognitionModes,
  biometric_compare: BiometricCompare,
  distance_match: DistanceMatch,
  onnx_detect: OnnxDetectCase,
  onnx_segment: OnnxSegmentCase,
  "lab3-bow-explorer": BowExplorer,
  "lab3-lenet-draw": LenetCase,
  "lab4-slic-player": SlicIterationCase,
  "lab5-yolo-decode": YoloDecodeLab,
  "lab5-letterbox": LetterboxLab,
  "lab5-nms-lab": NmsThresholdLab,
};

export function getCaseComponent(caseId: string): CaseComponent | undefined {
  return registry[caseId];
}
