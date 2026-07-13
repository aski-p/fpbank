import { after, NextResponse } from "next/server";
import { AnalysisValidationError, validateAnalysisFiles } from "@/lib/fp-analysis";
import { parseAnalysisMode } from "@/lib/analysis-mode";
import { validateAnalysisFileContents } from "@/lib/fp-document-analyzer";
import { AnalysisJobQueueFullError, createAnalysisJob, waitForAnalysisJob } from "@/lib/analysis-job-store";
import { analysisMemoryQueueEnabled, consumeAnalysisRateLimit, hasValidRequestOrigin } from "@/lib/analysis-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 1800;

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

function jsonError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status, headers: NO_STORE_HEADERS });
}

export async function GET() {
  const available = analysisMemoryQueueEnabled();
  return NextResponse.json({
    available,
    reason: available ? null : "정밀 분석 worker가 이 배포에 연결되지 않았습니다.",
  }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  if (!analysisMemoryQueueEnabled()) {
    return jsonError("이 배포에서는 정밀 분석 worker가 활성화되지 않았습니다.", "ANALYSIS_WORKER_UNAVAILABLE", 503);
  }
  if (!hasValidRequestOrigin(request)) {
    return jsonError("허용되지 않은 요청 출처입니다.", "INVALID_ORIGIN", 403);
  }
  const rate = consumeAnalysisRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "분석 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.", code: "ANALYSIS_RATE_LIMITED" },
      { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("업로드 요청 형식이 올바르지 않습니다.", "INVALID_FORM_DATA", 400);
  }

  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  const mode = parseAnalysisMode(formData.get("mode"));
  try {
    validateAnalysisFiles(files);
    await validateAnalysisFileContents(files);
    const job = createAnalysisJob(files, mode);
    if (process.env.NODE_ENV !== "test") after(() => waitForAnalysisJob(job.id));
    return NextResponse.json(
      { jobId: job.id, accessToken: job.accessToken, status: job.status, createdAt: job.createdAt },
      { status: 202, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof AnalysisValidationError) return jsonError(error.message, "INVALID_FILES", 400);
    if (error instanceof AnalysisJobQueueFullError) return jsonError(error.message, "ANALYSIS_QUEUE_FULL", 429);
    return jsonError("분석 작업을 생성하지 못했습니다.", "JOB_CREATION_FAILED", 500);
  }
}
