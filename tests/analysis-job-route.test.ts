import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as GET_COLLECTION, POST } from "@/app/api/analyze-fp/jobs/route";
import { GET } from "@/app/api/analyze-fp/jobs/[jobId]/route";
import { clearAnalysisJobsForTests, createAnalysisJob } from "@/lib/analysis-job-store";
import { clearAnalysisRateLimitsForTests } from "@/lib/analysis-api-guard";
import type { FPAnalysisServiceOutput } from "@/lib/fp-analysis-service";

const output: FPAnalysisServiceOutput = {
  result: { documentSummary: "완료", items: [], warnings: [] },
  meta: { mode: "local", path: "local", cloudReviewPerformed: false, cloudReasons: [] },
};

function file(name = "screen.png") {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, { type: "image/png" });
}

function requestWith(value: File) {
  const form = new FormData();
  form.append("mode", "local");
  form.append("files", value);
  return new Request("http://localhost/api/analyze-fp/jobs", { method: "POST", body: form });
}

afterEach(() => {
  clearAnalysisJobsForTests();
  clearAnalysisRateLimitsForTests();
  vi.unstubAllEnvs();
});

describe("analysis job API", () => {
  it("fails closed in production before reading form data", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FP_ANALYSIS_MEMORY_QUEUE_ENABLED", "");
    const formData = vi.fn();
    const request = {
      url: "https://fpbank.vercel.app/api/analyze-fp/jobs",
      headers: new Headers({ host: "fpbank.vercel.app" }),
      formData,
    } as unknown as Request;

    const availability = await GET_COLLECTION();
    expect(availability.status).toBe(200);
    expect(await availability.json()).toMatchObject({ available: false });

    const response = await POST(request);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "ANALYSIS_WORKER_UNAVAILABLE" });
    expect(formData).not.toHaveBeenCalled();
  });

  it("creates a queued job and returns no-store 202", async () => {
    createAnalysisJob([file("blocker.png")], "local", vi.fn(async () => new Promise<FPAnalysisServiceOutput>(() => undefined)));
    const response = await POST(requestWith(file()));
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toMatchObject({ status: "queued" });
    expect(body.jobId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.accessToken).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it("rejects invalid files before creating a job", async () => {
    const response = await POST(requestWith(new File(["x"], "script.svg", { type: "image/svg+xml" })));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_FILES" });

    const disguised = await POST(requestWith(new File(["not-a-png"], "fake.png", { type: "image/png" })));
    expect(disguised.status).toBe(400);
    expect(await disguised.json()).toMatchObject({ code: "INVALID_FILES" });
  });

  it("returns completed output and 404 for an unknown job", async () => {
    const created = createAnalysisJob([file()], "local", vi.fn(async () => output));
    for (let index = 0; index < 20; index += 1) {
      const response = await GET(new Request("http://localhost", { headers: { Authorization: `Bearer ${created.accessToken}` } }), { params: Promise.resolve({ jobId: created.id }) });
      const body = await response.json();
      if (body.status === "completed") {
        expect(body.output).toEqual(output);
        expect(response.headers.get("cache-control")).toContain("no-store");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (index === 19) throw new Error("job did not complete");
    }

    const forbidden = await GET(new Request("http://localhost", { headers: { Authorization: "Bearer wrong-token" } }), { params: Promise.resolve({ jobId: created.id }) });
    expect(forbidden.status).toBe(404);

    const missing = await GET(new Request("http://localhost"), { params: Promise.resolve({ jobId: crypto.randomUUID() }) });
    expect(missing.status).toBe(404);
  });
});
