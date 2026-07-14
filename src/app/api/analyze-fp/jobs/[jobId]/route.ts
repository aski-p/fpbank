import { NextResponse } from "next/server";
import { getAnalysisJob } from "@/lib/analysis-job-store";
import {
  analysisMemoryQueueEnabled,
  hasValidWorkerCredential,
  workerCredentialRequired,
} from "@/lib/analysis-api-guard";
import { getAnalysisRemoteWorkerConfig, remoteWorkerHeaders, remoteWorkerUrl } from "@/lib/analysis-worker-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  if (!UUID_PATTERN.test(jobId)) {
    return NextResponse.json({ error: "분석 작업을 찾을 수 없습니다.", code: "JOB_NOT_FOUND" }, { status: 404, headers: NO_STORE_HEADERS });
  }
  if (workerCredentialRequired() && !hasValidWorkerCredential(request)) {
    return NextResponse.json({ error: "worker 인증 정보가 올바르지 않습니다.", code: "INVALID_WORKER_CREDENTIAL" }, { status: 403, headers: NO_STORE_HEADERS });
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!analysisMemoryQueueEnabled()) {
    const remote = getAnalysisRemoteWorkerConfig();
    if (!remote) {
      return NextResponse.json({ error: "정밀 분석 worker가 연결되지 않았습니다.", code: "ANALYSIS_WORKER_UNAVAILABLE" }, { status: 503, headers: NO_STORE_HEADERS });
    }
    try {
      const workerHeaders = remoteWorkerHeaders(remote);
      if (authorization) workerHeaders.set("authorization", authorization);
      const response = await fetch(remoteWorkerUrl(remote, `/api/analyze-fp/jobs/${jobId}`), {
        cache: "no-store",
        headers: workerHeaders,
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      const body = await response.arrayBuffer();
      return new NextResponse(body, {
        status: response.status,
        headers: { ...NO_STORE_HEADERS, "Content-Type": response.headers.get("content-type") ?? "application/json" },
      });
    } catch {
      return NextResponse.json({ error: "정밀 분석 worker에 연결하지 못했습니다.", code: "ANALYSIS_WORKER_UNAVAILABLE" }, { status: 503, headers: NO_STORE_HEADERS });
    }
  }
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const job = getAnalysisJob(jobId, accessToken);
  if (!job) {
    return NextResponse.json({ error: "분석 작업을 찾을 수 없습니다.", code: "JOB_NOT_FOUND" }, { status: 404, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json(job, { status: 200, headers: NO_STORE_HEADERS });
}
