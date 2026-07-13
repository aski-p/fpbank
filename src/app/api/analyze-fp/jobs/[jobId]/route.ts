import { NextResponse } from "next/server";
import { getAnalysisJob } from "@/lib/analysis-job-store";

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
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const job = getAnalysisJob(jobId, accessToken);
  if (!job) {
    return NextResponse.json({ error: "분석 작업을 찾을 수 없습니다.", code: "JOB_NOT_FOUND" }, { status: 404, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json(job, { status: 200, headers: NO_STORE_HEADERS });
}
