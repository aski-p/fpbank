import { describe, expect, it, vi } from "vitest";
import { pollAnalysisJob, submitAnalysisJob } from "@/lib/analysis-job-client";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

const accessToken = "a".repeat(43);

const output = {
  result: { documentSummary: "완료", items: [], warnings: [] },
  meta: { mode: "local", path: "local", cloudReviewPerformed: false, cloudReasons: [] },
};

describe("analysis job client", () => {
  it("submits form data and validates the returned job id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ jobId: "123e4567-e89b-42d3-a456-426614174000", accessToken, status: "queued" }, 202));
    const form = new FormData();
    const created = await submitAnalysisJob(form, { fetchImpl });
    expect(created.jobId).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(fetchImpl).toHaveBeenCalledWith("/api/analyze-fp/jobs", expect.objectContaining({ method: "POST", body: form }));
  });

  it("polls queued and running states until completed", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: "queued" }))
      .mockResolvedValueOnce(jsonResponse({ status: "running" }))
      .mockResolvedValueOnce(jsonResponse({ status: "completed", output }));
    const onStatus = vi.fn();
    const completed = await pollAnalysisJob("123e4567-e89b-42d3-a456-426614174000", {
      accessToken,
      fetchImpl,
      intervalMs: 0,
      maxAttempts: 5,
      onStatus,
    });
    expect(completed).toEqual(output);
    expect(onStatus.mock.calls.map((call) => call[0])).toEqual(["queued", "running", "completed"]);
  });

  it("surfaces a safe failed-job message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: "failed", error: "로컬 Qwen 서버에 연결하지 못했습니다." }));
    await expect(pollAnalysisJob("123e4567-e89b-42d3-a456-426614174000", { accessToken, fetchImpl, intervalMs: 0 }))
      .rejects.toThrow(/로컬 Qwen/);
  });

  it("stops after the configured polling limit", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse({ status: "running" }));
    await expect(pollAnalysisJob("123e4567-e89b-42d3-a456-426614174000", { accessToken, fetchImpl, intervalMs: 0, maxAttempts: 2 }))
      .rejects.toThrow(/시간이 초과/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
