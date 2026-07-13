import type { NormalizedFPAnalysisItem, NormalizedFPAnalysisResult } from "@/lib/fp-analysis";

export type AnalysisMode = "local" | "auto" | "cloud";

export interface CloudReviewDecision {
  required: boolean;
  reasons: string[];
}

export interface AnalysisAccuracyReport {
  predictedCount: number;
  approvedCount: number;
  matchedProcessCount: number;
  correctTypeCount: number;
  processPrecision: number;
  processRecall: number;
  processF1: number;
  typeAccuracy: number;
  predictedFP: number;
  approvedFP: number;
  fpDelta: number;
}

export function parseAnalysisMode(value: unknown): AnalysisMode {
  return value === "local" || value === "cloud" || value === "auto" ? value : "auto";
}

export function getCloudReviewDecision(
  mode: AnalysisMode,
  localResult: NormalizedFPAnalysisResult,
): CloudReviewDecision {
  if (mode === "local") return { required: false, reasons: [] };
  if (mode === "cloud") return { required: true, reasons: ["항상 클라우드 검증 모드"] };

  const reasons = new Set<string>();
  if (localResult.items.length === 0) reasons.add("기능 후보 없음");
  if (localResult.warnings.length > 0) reasons.add("분석 경고 존재");

  for (const item of localResult.items) {
    if (item.confidence < 0.8) reasons.add("낮은 신뢰도");
    if (!item.evidence.trim()) reasons.add("근거 부족");
    if (item.needsReview) reasons.add("AI 검토 필요");
    if (item.fpType === "ILF" || item.fpType === "EIF") reasons.add("데이터 기능 소유권 검증");
    if (item.fpType === "EO" && item.confidence < 0.85) reasons.add("EO 파생 처리 검증");
    if ([item.applicationName, item.businessName, item.unitProcessName].some((value) => /^(미확인|알 수 없음|unknown)$/i.test(value.trim()))) {
      reasons.add("필수 명칭 미확인");
    }
  }

  return { required: reasons.size > 0, reasons: [...reasons] };
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function processKey(item: NormalizedFPAnalysisItem): string {
  return [item.applicationName, item.businessName, item.unitProcessName].map(normalize).join("|");
}

function rounded(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

function sumFP(items: NormalizedFPAnalysisItem[]): number {
  return rounded(items.reduce((sum, item) => sum + item.weight, 0));
}

export function evaluateAnalysisAccuracy(
  predicted: NormalizedFPAnalysisResult,
  approved: NormalizedFPAnalysisResult,
): AnalysisAccuracyReport {
  const approvedByProcess = new Map(approved.items.map((item) => [processKey(item), item]));
  let matchedProcessCount = 0;
  let correctTypeCount = 0;

  for (const candidate of predicted.items) {
    const reference = approvedByProcess.get(processKey(candidate));
    if (!reference) continue;
    matchedProcessCount += 1;
    if (candidate.fpType === reference.fpType) correctTypeCount += 1;
  }

  const predictedCount = predicted.items.length;
  const approvedCount = approved.items.length;
  const processPrecision = predictedCount === 0 ? (approvedCount === 0 ? 1 : 0) : matchedProcessCount / predictedCount;
  const processRecall = approvedCount === 0 ? (predictedCount === 0 ? 1 : 0) : matchedProcessCount / approvedCount;
  const processF1 = processPrecision + processRecall === 0
    ? 0
    : (2 * processPrecision * processRecall) / (processPrecision + processRecall);
  const typeAccuracy = matchedProcessCount === 0
    ? (predictedCount === 0 && approvedCount === 0 ? 1 : 0)
    : correctTypeCount / matchedProcessCount;
  const predictedFP = sumFP(predicted.items);
  const approvedFP = sumFP(approved.items);

  return {
    predictedCount,
    approvedCount,
    matchedProcessCount,
    correctTypeCount,
    processPrecision,
    processRecall,
    processF1,
    typeAccuracy,
    predictedFP,
    approvedFP,
    fpDelta: rounded(predictedFP - approvedFP),
  };
}
