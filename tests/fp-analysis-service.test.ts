import { describe, expect, it, vi } from "vitest";
import { runFPAnalysis } from "@/lib/fp-analysis-service";
import type { NormalizedFPAnalysisResult } from "@/lib/fp-analysis";

const safe: NormalizedFPAnalysisResult = {
  documentSummary: "가상자산",
  items: [{
    applicationName: "i-ONE Bank 3.0",
    businessName: "가상자산 관리",
    unitProcessName: "가상자산 등록",
    fpType: "EI",
    weight: 4,
    confidence: 0.92,
    evidence: "등록 확인",
    rationale: "연결정보 유지",
    needsReview: false,
    decisionStatus: "accepted",
    reviewReasons: [],
  }],
  warnings: [],
};
const risky: NormalizedFPAnalysisResult = {
  ...safe,
  items: [{ ...safe.items[0], confidence: 0.6, needsReview: true, reviewReasons: ["낮은 신뢰도"] }],
};
const cloud: NormalizedFPAnalysisResult = {
  ...safe,
  documentSummary: "클라우드 검증 완료",
};
const files = [new File(["x"], "screen.png", { type: "image/png" })];
const observations = { documentSummary: "화면", applicationCandidates: [], screens: [] };

function deps(localResult: NormalizedFPAnalysisResult) {
  return {
    analyzeLocal: vi.fn().mockResolvedValue({ result: localResult, observations }),
    reviewCloud: vi.fn().mockResolvedValue(cloud),
    analyzeCloudFiles: vi.fn().mockResolvedValue(cloud),
  };
}

describe("runFPAnalysis", () => {
  it("returns local output without cloud in local mode", async () => {
    const d = deps(risky);
    const output = await runFPAnalysis(files, "local", d);
    expect(output.result).toBe(risky);
    expect(d.reviewCloud).not.toHaveBeenCalled();
    expect(output.meta).toMatchObject({ path: "local", cloudReviewPerformed: false });
  });

  it("keeps safe local output in auto mode", async () => {
    const d = deps(safe);
    const output = await runFPAnalysis(files, "auto", d);
    expect(output.result).toBe(safe);
    expect(d.reviewCloud).not.toHaveBeenCalled();
    expect(output.meta.path).toBe("local");
  });

  it("reviews risky local output in auto mode and preserves both results", async () => {
    const d = deps(risky);
    const output = await runFPAnalysis(files, "auto", d);
    expect(output.result).toBe(cloud);
    expect(d.reviewCloud).toHaveBeenCalledWith(observations);
    expect(output.meta).toMatchObject({ path: "local+cloud", cloudReviewPerformed: true, localResult: risky });
    expect(output.meta.cloudReasons).toContain("낮은 신뢰도");
  });

  it("always cross-reviews local observations in cloud mode", async () => {
    const d = deps(safe);
    const output = await runFPAnalysis(files, "cloud", d);
    expect(output.result).toBe(cloud);
    expect(d.reviewCloud).toHaveBeenCalledOnce();
    expect(output.meta.cloudReasons).toEqual(["항상 클라우드 검증 모드"]);
  });

  it("falls back to full cloud analysis when local analysis is unavailable outside local mode", async () => {
    const d = deps(safe);
    d.analyzeLocal.mockRejectedValue(new Error("local unavailable"));
    const output = await runFPAnalysis(files, "auto", d);
    expect(d.analyzeCloudFiles).toHaveBeenCalledWith(files);
    expect(output.result).toBe(cloud);
    expect(output.meta.path).toBe("cloud-fallback");
  });
});
