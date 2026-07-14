import { beforeEach, describe, expect, it } from "vitest";
import {
  analysisMemoryQueueEnabled,
  analysisRateLimitKeyCountForTests,
  clearAnalysisRateLimitsForTests,
  consumeAnalysisRateLimit,
  hasValidRequestOrigin,
  hasValidWorkerCredential,
} from "@/lib/analysis-api-guard";

beforeEach(() => clearAnalysisRateLimitsForTests());

describe("analysis API guard", () => {
  it("disables the process-local queue by default in production", () => {
    expect(analysisMemoryQueueEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(analysisMemoryQueueEnabled({ NODE_ENV: "production", FP_ANALYSIS_MEMORY_QUEUE_ENABLED: "true" })).toBe(true);
    expect(analysisMemoryQueueEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("accepts same-origin requests and rejects cross-origin requests", () => {
    expect(hasValidRequestOrigin(new Request("https://fpbank.vercel.app/api", {
      headers: { host: "fpbank.vercel.app", origin: "https://fpbank.vercel.app" },
    }))).toBe(true);
    expect(hasValidRequestOrigin(new Request("https://fpbank.vercel.app/api", {
      headers: { host: "fpbank.vercel.app", origin: "https://evil.example" },
    }))).toBe(false);
    expect(hasValidRequestOrigin(new Request("https://fpbank.vercel.app/api", {
      headers: { host: "fpbank.vercel.app", origin: "http://fpbank.vercel.app" },
    }))).toBe(false);
  });

  it("rejects missing Origin in production unless non-browser access is explicitly enabled", () => {
    const request = new Request("https://fpbank.vercel.app/api");
    expect(hasValidRequestOrigin(request, { NODE_ENV: "production" })).toBe(false);
    expect(hasValidRequestOrigin(request, {
      NODE_ENV: "production",
      FP_ANALYSIS_ALLOW_NON_BROWSER: "true",
    })).toBe(true);
  });

  it("validates a presented worker secret independently of whether it is mandatory", () => {
    const environment = {
      NODE_ENV: "production",
      FP_ANALYSIS_WORKER_SHARED_SECRET: "worker-secret-value",
    };
    expect(hasValidWorkerCredential(new Request("https://worker.example/api", {
      headers: { "x-fp-worker-key": "worker-secret-value" },
    }), environment)).toBe(true);
    expect(hasValidWorkerCredential(new Request("https://worker.example/api"), environment)).toBe(false);
    expect(hasValidWorkerCredential(new Request("https://worker.example/api", {
      headers: { "x-fp-worker-key": "wrong-secret-value" },
    }), environment)).toBe(false);
    const unicodeCredentialRequest = {
      headers: { get: (name: string) => name.toLowerCase() === "x-fp-worker-key" ? "123456789012345가" : null },
    } as unknown as Request;
    expect(() => hasValidWorkerCredential(
      unicodeCredentialRequest,
      { FP_ANALYSIS_WORKER_SHARED_SECRET: "1234567890123456" },
    )).not.toThrow();
    expect(hasValidWorkerCredential(
      unicodeCredentialRequest,
      { FP_ANALYSIS_WORKER_SHARED_SECRET: "1234567890123456" },
    )).toBe(false);
  });

  it("limits one client to three job creations per 15 minutes", () => {
    const request = new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.10" } });
    expect(consumeAnalysisRateLimit(request, 0).allowed).toBe(true);
    expect(consumeAnalysisRateLimit(request, 1).allowed).toBe(true);
    expect(consumeAnalysisRateLimit(request, 2).allowed).toBe(true);
    const blocked = consumeAnalysisRateLimit(request, 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("evicts expired client keys instead of growing forever", () => {
    for (let index = 0; index < 25; index += 1) {
      consumeAnalysisRateLimit(new Request("http://localhost", {
        headers: { "x-forwarded-for": `203.0.113.${index}` },
      }), 0);
    }
    expect(analysisRateLimitKeyCountForTests()).toBe(25);
    consumeAnalysisRateLimit(new Request("http://localhost", {
      headers: { "x-forwarded-for": "198.51.100.1" },
    }), 15 * 60 * 1000);
    expect(analysisRateLimitKeyCountForTests()).toBe(1);
  });
});
