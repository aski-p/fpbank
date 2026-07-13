import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AnalysisJobQueueFullError,
  clearAnalysisJobsForTests,
  createAnalysisJob,
  getAnalysisJob,
} from "@/lib/analysis-job-store";
import type { FPAnalysisServiceOutput } from "@/lib/fp-analysis-service";

const result: FPAnalysisServiceOutput = {
  result: { documentSummary: "완료", items: [], warnings: [] },
  meta: { mode: "local", path: "local", cloudReviewPerformed: false, cloudReasons: [] },
};

function image(name = "screen.png") {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, { type: "image/png" });
}

async function eventually(jobId: string, accessToken: string, status: "completed" | "failed") {
  for (let index = 0; index < 30; index += 1) {
    const job = getAnalysisJob(jobId, accessToken);
    if (job?.status === status) return job;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`job did not reach ${status}`);
}

beforeEach(() => clearAnalysisJobsForTests());

describe("analysis job store", () => {
  it("returns immediately and completes a queued analysis without exposing files", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const runner = vi.fn(async () => { await gate; return result; });

    const created = createAnalysisJob([image()], "local", runner);
    expect(created.status).toBe("queued");
    expect(JSON.stringify(created)).not.toContain("iVBOR");

    release();
    const completed = await eventually(created.id, created.accessToken, "completed");
    expect(completed.output).toEqual(result);
    expect(runner).toHaveBeenCalledOnce();
  });

  it("runs only one local model job at a time", async () => {
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const runner = vi.fn(async (files: File[]) => {
      order.push(`start:${files[0].name}`);
      if (files[0].name === "first.png") await firstGate;
      order.push(`end:${files[0].name}`);
      return result;
    });

    const first = createAnalysisJob([image("first.png")], "local", runner);
    const second = createAnalysisJob([image("second.png")], "local", runner);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual(["start:first.png"]);

    releaseFirst();
    await eventually(first.id, first.accessToken, "completed");
    await eventually(second.id, second.accessToken, "completed");
    expect(order).toEqual(["start:first.png", "end:first.png", "start:second.png", "end:second.png"]);
  });

  it("stores a safe failure without leaking the thrown stack", async () => {
    const runner = vi.fn(async () => { throw new Error("private upstream detail"); });
    const created = createAnalysisJob([image()], "local", runner);
    const failed = await eventually(created.id, created.accessToken, "failed");
    expect(getAnalysisJob(created.id, "wrong-token")).toBeUndefined();
    expect(failed.error).toBe("분석 작업을 완료하지 못했습니다.");
    expect(JSON.stringify(failed)).not.toContain("private upstream detail");
  });

  it("rejects work when the bounded queue is full", () => {
    const never = vi.fn(async () => new Promise<FPAnalysisServiceOutput>(() => undefined));
    for (let index = 0; index < 6; index += 1) createAnalysisJob([image(`${index}.png`)], "local", never);
    expect(() => createAnalysisJob([image("overflow.png")], "local", never))
      .toThrow(AnalysisJobQueueFullError);
  });
});
