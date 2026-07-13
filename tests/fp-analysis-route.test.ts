import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/analyze-fp/route";

describe("legacy FP analysis route", () => {
  it("returns 410 and directs callers to the queued job API", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({
      code: "SYNC_ANALYSIS_REMOVED",
      jobsEndpoint: "/api/analyze-fp/jobs",
    });
  });
});
