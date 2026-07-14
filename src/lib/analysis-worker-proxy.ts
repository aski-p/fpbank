export interface AnalysisRemoteWorkerConfig {
  baseUrl: string;
  sharedSecret: string;
}

export function getAnalysisRemoteWorkerConfig(
  environment: Record<string, string | undefined> = process.env,
): AnalysisRemoteWorkerConfig | undefined {
  const rawUrl = environment.FP_ANALYSIS_WORKER_BASE_URL?.trim() ?? "";
  const sharedSecret = environment.FP_ANALYSIS_WORKER_SHARED_SECRET?.trim() ?? "";
  if (!rawUrl || sharedSecret.length < 16) return undefined;

  try {
    const url = new URL(rawUrl);
    if (url.username || url.password || url.search || url.hash) return undefined;
    if (environment.NODE_ENV === "production" && url.protocol !== "https:") return undefined;
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return { baseUrl: url.href.replace(/\/$/, ""), sharedSecret };
  } catch {
    return undefined;
  }
}

export function remoteWorkerHeaders(
  config: AnalysisRemoteWorkerConfig,
  additional: HeadersInit = {},
): Headers {
  const headers = new Headers(additional);
  headers.set("x-fp-worker-key", config.sharedSecret);
  return headers;
}

export function remoteWorkerUrl(config: AnalysisRemoteWorkerConfig, path: string): string {
  if (!path.startsWith("/api/analyze-fp/jobs")) throw new Error("Invalid analysis worker path");
  return `${config.baseUrl}${path}`;
}
