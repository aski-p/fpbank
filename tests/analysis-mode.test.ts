import { describe, expect, it } from "vitest";
import {
  evaluateAnalysisAccuracy,
  getCloudReviewDecision,
  parseAnalysisMode,
} from "@/lib/analysis-mode";
import type { NormalizedFPAnalysisItem, NormalizedFPAnalysisResult } from "@/lib/fp-analysis";

function item(overrides: Partial<NormalizedFPAnalysisItem> = {}): NormalizedFPAnalysisItem {
  return {
    applicationName: "i-ONE Bank 3.0",
    businessName: "가상자산 현황",
    unitProcessName: "가상자산 등록",
    fpType: "EI",
    weight: 4,
    confidence: 0.92,
    evidence: "확인 버튼을 선택하면 등록 완료",
    rationale: "연결 자산 정보를 유지하는 입력",
    needsReview: false,
    reviewReasons: [],
    ...overrides,
  };
}

function result(items: NormalizedFPAnalysisItem[], warnings: string[] = []): NormalizedFPAnalysisResult {
  return { documentSummary: "투자관리", items, warnings };
}

describe("analysis mode", () => {
  it("accepts three modes and defaults invalid values to auto", () => {
    expect(parseAnalysisMode("local")).toBe("local");
    expect(parseAnalysisMode("auto")).toBe("auto");
    expect(parseAnalysisMode("cloud")).toBe("cloud");
    expect(parseAnalysisMode("anything")).toBe("auto");
  });

  it("never calls cloud in local mode and always calls it in cloud mode", () => {
    expect(getCloudReviewDecision("local", result([item({ needsReview: true })]))).toEqual({ required: false, reasons: [] });
    expect(getCloudReviewDecision("cloud", result([item()]))).toEqual({ required: true, reasons: ["항상 클라우드 검증 모드"] });
  });

  it("keeps a high-confidence EI local in auto mode", () => {
    expect(getCloudReviewDecision("auto", result([item()])).required).toBe(false);
  });

  it("escalates risky local candidates in auto mode", () => {
    const decision = getCloudReviewDecision("auto", result([
      item({ confidence: 0.7, evidence: "", needsReview: true, reviewReasons: ["근거 부족"] }),
      item({ unitProcessName: "가상자산 데이터", fpType: "ILF", weight: 7.5 }),
    ]));
    expect(decision.required).toBe(true);
    expect(decision.reasons).toEqual(expect.arrayContaining(["낮은 신뢰도", "근거 부족", "AI 검토 필요", "데이터 기능 소유권 검증"]));
  });
});

describe("evaluateAnalysisAccuracy", () => {
  it("calculates process and FP type accuracy against approved results", () => {
    const predicted = result([
      item(),
      item({ businessName: "가상자산 현황", unitProcessName: "가상자산 조회", fpType: "EO", weight: 5.2 }),
      item({ businessName: "불필요", unitProcessName: "중복 화면 조회", fpType: "EQ", weight: 3.9 }),
    ]);
    const approved = result([
      item(),
      item({ businessName: "가상자산 현황", unitProcessName: "가상자산 조회", fpType: "EQ", weight: 3.9 }),
      item({ businessName: "가상자산 현황", unitProcessName: "가상자산 삭제", fpType: "EI", weight: 4 }),
    ]);

    const report = evaluateAnalysisAccuracy(predicted, approved);
    expect(report).toMatchObject({
      predictedCount: 3,
      approvedCount: 3,
      matchedProcessCount: 2,
      correctTypeCount: 1,
      processPrecision: 2 / 3,
      processRecall: 2 / 3,
      processF1: 2 / 3,
      typeAccuracy: 0.5,
      predictedFP: 13.1,
      approvedFP: 11.9,
      fpDelta: 1.2,
    });
  });

  it("returns zero-safe metrics for empty results", () => {
    expect(evaluateAnalysisAccuracy(result([]), result([]))).toMatchObject({
      processPrecision: 1,
      processRecall: 1,
      processF1: 1,
      typeAccuracy: 1,
      fpDelta: 0,
    });
  });
});
