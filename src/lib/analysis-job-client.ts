import type { FPAnalysisServiceOutput } from "@/lib/fp-analysis-service";

export type ClientAnalysisJobStatus = "queued" | "running" | "completed" | "failed";

interface JobClientOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

interface PollJobOptions extends JobClientOptions {
  accessToken: string;
  intervalMs?: number;
  maxAttempts?: number;
  onStatus?: (status: ClientAnalysisJobStatus) => void;
}

interface JobCreationResponse {
  jobId: string;
  accessToken: string;
  status: "queued";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function responseError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return new Error(body.error);
  } catch {
    // Use the safe fallback for non-JSON proxy errors.
  }
  return new Error(fallback);
}

export async function submitAnalysisJob(
  formData: FormData,
  options: JobClientOptions = {},
): Promise<JobCreationResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl("/api/analyze-fp/jobs", {
    method: "POST",
    body: formData,
    cache: "no-store",
    signal: options.signal,
  });
  if (!response.ok) throw await responseError(response, "분석 작업을 생성하지 못했습니다.");
  const body = await response.json() as Partial<JobCreationResponse>;
  if (body.status !== "queued" || typeof body.jobId !== "string" || !UUID_PATTERN.test(body.jobId)
    || typeof body.accessToken !== "string" || body.accessToken.length < 32) {
    throw new Error("분석 작업 응답이 올바르지 않습니다.");
  }
  return body as JobCreationResponse;
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("분석 상태 확인이 취소되었습니다.", "AbortError"));
    }, { once: true });
  });
}

export async function pollAnalysisJob(
  jobId: string,
  options: PollJobOptions,
): Promise<FPAnalysisServiceOutput> {
  if (!UUID_PATTERN.test(jobId)) throw new Error("분석 작업 ID가 올바르지 않습니다.");
  const fetchImpl = options.fetchImpl ?? fetch;
  const intervalMs = options.intervalMs ?? 2_000;
  const maxAttempts = options.maxAttempts ?? 900;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetchImpl(`/api/analyze-fp/jobs/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${options.accessToken}` },
      signal: options.signal,
    });
    if (!response.ok) throw await responseError(response, "분석 작업 상태를 확인하지 못했습니다.");
    const body = await response.json() as {
      status?: ClientAnalysisJobStatus;
      output?: FPAnalysisServiceOutput;
      error?: string;
    };
    if (!body.status || !["queued", "running", "completed", "failed"].includes(body.status)) {
      throw new Error("분석 작업 상태 응답이 올바르지 않습니다.");
    }
    options.onStatus?.(body.status);
    if (body.status === "completed") {
      if (!body.output) throw new Error("완료된 분석 결과가 없습니다.");
      return body.output;
    }
    if (body.status === "failed") throw new Error(body.error || "분석 작업을 완료하지 못했습니다.");
    await delay(intervalMs, options.signal);
  }
  throw new Error("정밀 분석 대기 시간이 초과되었습니다. 작업을 다시 시작해주세요.");
}
