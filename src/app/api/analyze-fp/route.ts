import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export async function POST() {
  return NextResponse.json({
    error: "동기 분석 API는 폐기되었습니다. 비동기 분석 작업 API를 사용해주세요.",
    code: "SYNC_ANALYSIS_REMOVED",
    jobsEndpoint: "/api/analyze-fp/jobs",
  }, { status: 410, headers: NO_STORE_HEADERS });
}
