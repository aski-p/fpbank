import { NextResponse } from "next/server";
import { AnalysisValidationError } from "@/lib/fp-analysis";
import { parseAnalysisMode } from "@/lib/analysis-mode";
import { runFPAnalysis } from "@/lib/fp-analysis-service";
import {
  AnalysisConfigurationError,
  AnalysisUpstreamError,
} from "@/lib/fp-document-analyzer";
import {
  LocalAnalysisConfigurationError,
  LocalAnalysisError,
  LocalAnalysisUnsupportedError,
} from "@/lib/local-qwen-analyzer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status, headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("업로드 요청 형식이 올바르지 않습니다.", "INVALID_FORM_DATA", 400);
  }

  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  const mode = parseAnalysisMode(formData.get("mode"));

  try {
    const output = await runFPAnalysis(files, mode);
    return NextResponse.json(
      { ...output.result, analysisMeta: output.meta },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof AnalysisValidationError) {
      return jsonError(error.message, "INVALID_FILES", 400);
    }
    if (error instanceof AnalysisConfigurationError) {
      return jsonError(error.message, "AI_NOT_CONFIGURED", 503);
    }
    if (error instanceof LocalAnalysisConfigurationError) {
      return jsonError(error.message, "LOCAL_AI_NOT_CONFIGURED", 503);
    }
    if (error instanceof LocalAnalysisUnsupportedError) {
      return jsonError(error.message, "LOCAL_FILE_UNSUPPORTED", 422);
    }
    if (error instanceof LocalAnalysisError) {
      const status = [422, 429, 502, 503, 504].includes(error.status) ? error.status : 502;
      return jsonError(error.message, "LOCAL_ANALYSIS_FAILED", status);
    }
    if (error instanceof AnalysisUpstreamError) {
      const status = [422, 429, 502, 503, 504].includes(error.status) ? error.status : 502;
      return jsonError(error.message, "AI_ANALYSIS_FAILED", status);
    }
    console.error("Unexpected FP analysis error", error instanceof Error ? error.name : "unknown");
    return jsonError("분석 중 예기치 않은 오류가 발생했습니다.", "ANALYSIS_ERROR", 500);
  }
}
