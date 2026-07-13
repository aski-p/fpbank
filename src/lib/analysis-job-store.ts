import type { AnalysisMode } from "@/lib/analysis-mode";
import { runFPAnalysis, type FPAnalysisServiceOutput } from "@/lib/fp-analysis-service";
import { randomBytes, timingSafeEqual } from "node:crypto";

export type AnalysisJobStatus = "queued" | "running" | "completed" | "failed";

export interface AnalysisJobSnapshot {
  id: string;
  status: AnalysisJobStatus;
  createdAt: string;
  updatedAt: string;
  output?: FPAnalysisServiceOutput;
  error?: string;
}

type AnalysisRunner = (files: File[], mode: AnalysisMode) => Promise<FPAnalysisServiceOutput>;

interface InternalAnalysisJob extends AnalysisJobSnapshot {
  accessToken: string;
  files: File[];
  mode: AnalysisMode;
  runner: AnalysisRunner;
}

interface AnalysisJobState {
  jobs: Map<string, InternalAnalysisJob>;
  queue: string[];
  running: boolean;
  drainScheduled: boolean;
}

const MAX_OUTSTANDING_JOBS = 6;
const JOB_TTL_MS = 10 * 60 * 1000;
const GLOBAL_KEY = Symbol.for("fpbank.analysis-job-state");

function state(): AnalysisJobState {
  const target = globalThis as typeof globalThis & { [GLOBAL_KEY]?: AnalysisJobState };
  if (!target[GLOBAL_KEY]) {
    target[GLOBAL_KEY] = { jobs: new Map(), queue: [], running: false, drainScheduled: false };
  }
  return target[GLOBAL_KEY];
}

export class AnalysisJobQueueFullError extends Error {
  constructor() {
    super("현재 정밀 분석 대기열이 가득 찼습니다. 잠시 후 다시 시도해주세요.");
    this.name = "AnalysisJobQueueFullError";
  }
}

function publicFailureMessage(error: unknown): string {
  if (error instanceof Error && [
    "AnalysisValidationError",
    "AnalysisConfigurationError",
    "AnalysisUpstreamError",
    "LocalAnalysisConfigurationError",
    "LocalAnalysisUnsupportedError",
    "LocalAnalysisError",
  ].includes(error.name)) return error.message;
  return "분석 작업을 완료하지 못했습니다.";
}

function snapshot(job: InternalAnalysisJob): AnalysisJobSnapshot {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    ...(job.output ? { output: job.output } : {}),
    ...(job.error ? { error: job.error } : {}),
  };
}

function cleanupExpiredJobs(now = Date.now()): void {
  const store = state();
  for (const [id, job] of store.jobs) {
    if ((job.status === "completed" || job.status === "failed") && now - Date.parse(job.updatedAt) > JOB_TTL_MS) {
      store.jobs.delete(id);
    }
  }
}

async function drainQueue(): Promise<void> {
  const store = state();
  store.drainScheduled = false;
  if (store.running) return;
  const id = store.queue.shift();
  if (!id) return;
  const job = store.jobs.get(id);
  if (!job) {
    scheduleDrain();
    return;
  }

  store.running = true;
  job.status = "running";
  job.updatedAt = new Date().toISOString();
  try {
    job.output = await job.runner(job.files, job.mode);
    job.status = "completed";
  } catch (error) {
    job.error = publicFailureMessage(error);
    job.status = "failed";
  } finally {
    job.files = [];
    job.updatedAt = new Date().toISOString();
    store.running = false;
    scheduleDrain();
  }
}

function scheduleDrain(): void {
  const store = state();
  if (store.drainScheduled) return;
  store.drainScheduled = true;
  queueMicrotask(() => { void drainQueue(); });
}

export function createAnalysisJob(
  files: File[],
  mode: AnalysisMode,
  runner: AnalysisRunner = runFPAnalysis,
): AnalysisJobSnapshot & { accessToken: string } {
  cleanupExpiredJobs();
  const store = state();
  const outstanding = [...store.jobs.values()].filter((job) => job.status === "queued" || job.status === "running").length;
  if (outstanding >= MAX_OUTSTANDING_JOBS) throw new AnalysisJobQueueFullError();

  const now = new Date().toISOString();
  const job: InternalAnalysisJob = {
    id: crypto.randomUUID(),
    accessToken: randomBytes(32).toString("base64url"),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    files: [...files],
    mode,
    runner,
  };
  store.jobs.set(job.id, job);
  store.queue.push(job.id);
  scheduleDrain();
  return { ...snapshot(job), accessToken: job.accessToken };
}

export async function waitForAnalysisJob(jobId: string): Promise<void> {
  for (;;) {
    const job = state().jobs.get(jobId);
    if (!job || job.status === "completed" || job.status === "failed") return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function validAccessToken(expected: string, supplied: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function getAnalysisJob(id: string, accessToken: string): AnalysisJobSnapshot | undefined {
  cleanupExpiredJobs();
  const job = state().jobs.get(id);
  return job && validAccessToken(job.accessToken, accessToken) ? snapshot(job) : undefined;
}

export function clearAnalysisJobsForTests(): void {
  const store = state();
  store.jobs.clear();
  store.queue.length = 0;
  store.running = false;
  store.drainScheduled = false;
}
