import { evaluateAnalysisAccuracy, getCloudReviewDecision, type AnalysisAccuracyReport, type AnalysisMode } from "@/lib/analysis-mode";
import { analyzeFPDocuments, analyzeFPObservations } from "@/lib/fp-document-analyzer";
import { analyzeFPDocumentsLocally, type LocalAnalysisBundle } from "@/lib/local-qwen-analyzer";
import type { NormalizedFPAnalysisResult } from "@/lib/fp-analysis";

export interface FPAnalysisDependencies {
  analyzeLocal: (files: File[]) => Promise<LocalAnalysisBundle>;
  reviewCloud: (observations: unknown) => Promise<NormalizedFPAnalysisResult>;
  analyzeCloudFiles: (files: File[]) => Promise<NormalizedFPAnalysisResult>;
}

export interface FPAnalysisMeta {
  mode: AnalysisMode;
  path: "local" | "local+cloud" | "cloud-fallback";
  cloudReviewPerformed: boolean;
  cloudReasons: string[];
  localResult?: NormalizedFPAnalysisResult;
  cloudAgreement?: AnalysisAccuracyReport;
  cloudError?: string;
}

export interface FPAnalysisServiceOutput {
  result: NormalizedFPAnalysisResult;
  meta: FPAnalysisMeta;
}

const defaultDependencies: FPAnalysisDependencies = {
  analyzeLocal: (files) => analyzeFPDocumentsLocally(files),
  reviewCloud: (observations) => analyzeFPObservations(observations),
  analyzeCloudFiles: (files) => analyzeFPDocuments(files),
};

function withWarning(result: NormalizedFPAnalysisResult, warning: string): NormalizedFPAnalysisResult {
  return { ...result, warnings: [...result.warnings, warning] };
}

export async function runFPAnalysis(
  files: File[],
  mode: AnalysisMode,
  dependencies: FPAnalysisDependencies = defaultDependencies,
): Promise<FPAnalysisServiceOutput> {
  let local: LocalAnalysisBundle;
  try {
    local = await dependencies.analyzeLocal(files);
  } catch (error) {
    if (mode === "local") throw error;
    const cloudResult = await dependencies.analyzeCloudFiles(files);
    return {
      result: cloudResult,
      meta: {
        mode,
        path: "cloud-fallback",
        cloudReviewPerformed: true,
        cloudReasons: ["로컬 분석 사용 불가"],
        cloudError: error instanceof Error ? error.message : "로컬 분석 오류",
      },
    };
  }

  const decision = getCloudReviewDecision(mode, local.result);
  if (!decision.required) {
    return {
      result: local.result,
      meta: {
        mode,
        path: "local",
        cloudReviewPerformed: false,
        cloudReasons: [],
        localResult: local.result,
      },
    };
  }

  try {
    const cloudResult = await dependencies.reviewCloud(local.observations);
    return {
      result: cloudResult,
      meta: {
        mode,
        path: "local+cloud",
        cloudReviewPerformed: true,
        cloudReasons: decision.reasons,
        localResult: local.result,
        cloudAgreement: evaluateAnalysisAccuracy(local.result, cloudResult),
      },
    };
  } catch (error) {
    if (mode === "cloud") throw error;
    const message = error instanceof Error ? error.message : "클라우드 검증 오류";
    return {
      result: withWarning(local.result, `클라우드 교차검증을 완료하지 못했습니다: ${message}`),
      meta: {
        mode,
        path: "local",
        cloudReviewPerformed: false,
        cloudReasons: decision.reasons,
        localResult: local.result,
        cloudError: message,
      },
    };
  }
}
