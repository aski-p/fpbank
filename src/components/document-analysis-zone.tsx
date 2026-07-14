"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileImage,
  FileText,
  LoaderCircle,
  ScanSearch,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import {
  AnalysisValidationError,
  normalizeAnalysisPayload,
  validateAnalysisFiles,
  ANALYSIS_FILE_LIMITS,
  type NormalizedFPAnalysisItem,
  type NormalizedFPAnalysisResult,
} from "@/lib/fp-analysis";
import type { AnalysisMode, AnalysisAccuracyReport } from "@/lib/analysis-mode";
import { pollAnalysisJob, submitAnalysisJob, type ClientAnalysisJobStatus } from "@/lib/analysis-job-client";

interface DocumentAnalysisZoneProps {
  onApply: (items: NormalizedFPAnalysisItem[]) => { addedCount: number; skippedCount: number };
}

interface AnalysisMetaBody {
  mode: AnalysisMode;
  path: "local" | "local+cloud" | "cloud-fallback";
  cloudReviewPerformed: boolean;
  cloudReasons: string[];
  localResult?: NormalizedFPAnalysisResult;
  cloudAgreement?: AnalysisAccuracyReport;
  cloudError?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const MODE_OPTIONS: Array<{ value: AnalysisMode; label: string; description: string }> = [
  { value: "local", label: "로컬 전용", description: "Qwen + 규칙 엔진, 외부 API 없음" },
  { value: "auto", label: "자동 검증", description: "위험 후보만 Terra 교차검증" },
  { value: "cloud", label: "항상 검증", description: "모든 결과를 Terra로 교차검증" },
];

export function DocumentAnalysisZone({ onApply }: DocumentAnalysisZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [workerAvailable, setWorkerAvailable] = useState<boolean | null>(null);
  const [cloudAvailable, setCloudAvailable] = useState<boolean | null>(null);
  const [jobStatus, setJobStatus] = useState<ClientAnalysisJobStatus | null>(null);
  const [mode, setMode] = useState<AnalysisMode>("local");
  const [result, setResult] = useState<NormalizedFPAnalysisResult | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisMetaBody | null>(null);
  const [error, setError] = useState("");
  const [applyMessage, setApplyMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analyze-fp/jobs", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return { worker: false, cloud: false };
        const body = await response.json() as { available?: unknown; cloudAvailable?: unknown };
        return { worker: body.available === true, cloud: body.cloudAvailable === true };
      })
      .then(({ worker, cloud }) => {
        setWorkerAvailable(worker);
        setCloudAvailable(cloud);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setWorkerAvailable(false);
          setCloudAvailable(false);
        }
      });
    return () => {
      controller.abort();
      analysisAbortRef.current?.abort();
    };
  }, []);

  function selectFiles(nextFiles: File[]) {
    setError("");
    setApplyMessage("");
    setResult(null);
    setAnalysisMeta(null);
    try {
      validateAnalysisFiles(nextFiles);
      setFiles(nextFiles);
    } catch (validationError) {
      setFiles([]);
      setError(validationError instanceof Error ? validationError.message : "파일을 확인해주세요.");
    }
  }

  function removeFile(index: number) {
    const next = files.filter((_, fileIndex) => fileIndex !== index);
    setFiles(next);
    setResult(null);
    setAnalysisMeta(null);
    setApplyMessage("");
  }

  async function analyze() {
    setError("");
    setApplyMessage("");
    setResult(null);
    setAnalysisMeta(null);
    try {
      if (workerAvailable !== true) {
        throw new Error("정밀 분석 worker가 이 배포에 연결되지 않았습니다.");
      }
      validateAnalysisFiles(files);
      setIsAnalyzing(true);
      setJobStatus("queued");
      const controller = new AbortController();
      analysisAbortRef.current?.abort();
      analysisAbortRef.current = controller;
      const formData = new FormData();
      formData.append("mode", mode);
      for (const file of files) formData.append("files", file);

      const created = await submitAnalysisJob(formData, { signal: controller.signal });
      const completed = await pollAnalysisJob(created.jobId, {
        accessToken: created.accessToken,
        signal: controller.signal,
        onStatus: setJobStatus,
      });
      setResult(normalizeAnalysisPayload(completed.result));
      setAnalysisMeta(completed.meta);
    } catch (analysisError) {
      if (analysisError instanceof AnalysisValidationError || analysisError instanceof Error) {
        setError(analysisError.message);
      } else {
        setError("문서를 분석하지 못했습니다.");
      }
    } finally {
      setIsAnalyzing(false);
      setJobStatus(null);
      analysisAbortRef.current = null;
    }
  }

  function applyResults() {
    if (!result) return;
    const applied = onApply(result.items);
    const reviewExcluded = result.items.filter((item) => item.needsReview).length;
    const duplicateExcluded = Math.max(0, applied.skippedCount - reviewExcluded);
    const exclusions = [
      reviewExcluded > 0 ? `검토 필요 ${reviewExcluded}건` : "",
      duplicateExcluded > 0 ? `중복 ${duplicateExcluded}건` : "",
    ].filter(Boolean).join(", ");
    setApplyMessage(exclusions
      ? `${applied.addedCount}건을 반영하고 ${exclusions}을 제외했습니다.`
      : `${applied.addedCount}건을 FP 분석표에 반영했습니다.`);
  }

  const reviewCount = result?.items.filter((item) => item.needsReview).length ?? 0;
  const analysisStatusLabel = jobStatus === "queued"
    ? "GPU 분석 대기열에서 순서를 기다리는 중입니다."
    : jobStatus === "running"
      ? "Qwen이 화면별 관찰·FP 판정·독립 감리를 수행 중입니다."
      : "정밀 분석을 준비하고 있습니다.";

  return (
    <section className="mb-6 overflow-hidden rounded-[28px] border border-[#dfe3dc] bg-white">
      <div className="grid lg:grid-cols-[360px_1fr]">
        <div className="border-b border-[#e5e8e1] bg-[#f7f9f4] p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#151714] text-[#b9f56a]">
              <BrainCircuit className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="rounded-full bg-[#e6f7d0] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3e6822]">AI Vision</span>
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-[#899087]">Design document</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em]">화면설계 AI 분석</h2>
          <p className="mt-3 text-sm leading-6 text-[#737a71]">
            화면 이미지나 설계서 PDF에서 애플리케이션, 세부업무, 단위프로세스와 FP 유형을 추출합니다.
          </p>
          <div className="mt-6 space-y-3 text-xs text-[#656c63]">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#65983e]" />유형별 가중치 서버 재검증</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#65983e]" />근거와 신뢰도 함께 제공</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#65983e]" />중복 후보 표시·FP 합산 선택</div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <fieldset className="mb-5">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7b8278]">분석 모드</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {MODE_OPTIONS.map((option) => {
                const selected = mode === option.value;
                const cloudModeUnavailable = option.value !== "local" && cloudAvailable !== true;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    disabled={isAnalyzing || cloudModeUnavailable}
                    onClick={() => { setMode(option.value); setResult(null); setAnalysisMeta(null); setApplyMessage(""); }}
                    className={`fp-focus rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-[#8bbd53] bg-[#eff9e4]" : "border-[#dfe3dc] bg-white hover:border-[#b9c1b5]"}`}
                  >
                    <span className="block text-sm font-semibold">{option.label}{cloudModeUnavailable ? " · API 키 미설정" : ""}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#7b8278]">{option.description}</span>
                  </button>
                );
              })}
            </div>
            {cloudAvailable === false && (
              <p className="mt-2 text-xs text-[#8a6518]">Terra API 키가 없어 현재는 Qwen 로컬 전용 분석만 사용할 수 있습니다.</p>
            )}
          </fieldset>

          <div
            onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragOver(false);
              selectFiles(Array.from(event.dataTransfer.files));
            }}
            className={`rounded-[22px] border border-dashed p-5 transition sm:p-6 ${isDragOver ? "border-[#8dc84c] bg-[#f1fae6]" : "border-[#cfd5ca] bg-[#fbfcfa]"}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf1e9] text-[#525951]">
                  <UploadCloud className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold">이미지 또는 PDF를 놓아주세요</p>
                  <p className="mt-1 text-xs text-[#899087]">
                    PNG · JPG · WebP · PDF / 최대 {ANALYSIS_FILE_LIMITS.maxFiles}개 · 파일당 {ANALYSIS_FILE_LIMITS.maxFileBytes / 1024 / 1024}MB · 전체 {ANALYSIS_FILE_LIMITS.maxTotalBytes / 1024 / 1024}MB
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={isAnalyzing} className="fp-focus h-11 rounded-full border border-[#d8ddd4] bg-white px-5 text-sm font-semibold transition hover:border-[#a9b2a4] disabled:opacity-50">
                파일 선택
              </button>
              <input ref={inputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} aria-label="분석할 화면설계 파일 선택" />
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}`} className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#f0f2ed] py-2 pl-3 pr-2 text-xs text-[#555c53]">
                  {file.type === "application/pdf" ? <FileText className="h-3.5 w-3.5 shrink-0" /> : <FileImage className="h-3.5 w-3.5 shrink-0" />}
                  <span className="max-w-[190px] truncate">{file.name}</span>
                  <span className="font-mono text-[10px] text-[#92988f]">{formatBytes(file.size)}</span>
                  <button type="button" onClick={() => removeFile(index)} disabled={isAnalyzing} className="grid h-6 w-6 place-items-center rounded-full hover:bg-[#dfe3dc]" aria-label={`${file.name} 제거`}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          {workerAvailable === false && (
            <div role="status" className="mt-4 flex items-start gap-2 rounded-2xl bg-[#fff8e8] px-4 py-3 text-sm text-[#85641f]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              정밀 분석 worker가 연결되지 않은 배포입니다. Excel 분석과 기능 직접 추가는 계속 사용할 수 있습니다.
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#b53f3f]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {isAnalyzing && (
            <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 rounded-2xl border border-[#dce8cf] bg-[#f4faed] px-4 py-3 text-sm text-[#4f6f35]">
              <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
              <div><p className="font-semibold">최대 정확도 분석 진행 중</p><p className="mt-0.5 text-xs text-[#718366]">{analysisStatusLabel}</p></div>
            </div>
          )}

          <button type="button" onClick={analyze} disabled={files.length === 0 || isAnalyzing || workerAvailable !== true} className="fp-focus mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#151714] px-6 text-sm font-semibold text-white transition hover:bg-[#2b2e29] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
            {isAnalyzing ? <><LoaderCircle className="h-4 w-4 animate-spin" />{jobStatus === "queued" ? "분석 대기 중..." : "Qwen 정밀 분석 중..."}</> : <><ScanSearch className="h-4 w-4" />화면설계 분석</>}
          </button>

          {result && (
            <div className="mt-7 border-t border-[#e5e8e1] pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9086]">Analysis result</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.035em]">{result.items.length}개 기능 후보</h3>
                  <p className="mt-1 text-sm text-[#747b72]">{result.documentSummary}</p>
                </div>
                {reviewCount > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4da] px-3 py-2 text-xs font-semibold text-[#8a6518]"><AlertTriangle className="h-3.5 w-3.5" />검토 필요 {reviewCount}건</span>}
              </div>

              {analysisMeta && (
                <div className="mt-4 grid gap-3 rounded-[18px] border border-[#e1e5dd] bg-[#f8faf6] p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9086]">분석 경로</p>
                    <p className="mt-1 text-sm font-semibold">
                      {analysisMeta.path === "local" ? "Qwen 로컬" : analysisMeta.path === "local+cloud" ? "Qwen + Terra" : "Terra 대체 분석"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9086]">클라우드 교차검증</p>
                    <p className="mt-1 text-sm font-semibold">{analysisMeta.cloudReviewPerformed ? "실행됨" : "실행 안 함"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9086]">로컬 후보</p>
                    <p className="mt-1 text-sm font-semibold">{analysisMeta.localResult?.items.length ?? "-"}건</p>
                  </div>
                  {analysisMeta.cloudAgreement && (
                    <p className="text-xs leading-5 text-[#656c63] sm:col-span-3">
                      로컬↔클라우드 프로세스 합의 F1 {Math.round(analysisMeta.cloudAgreement.processF1 * 100)}% ·
                      일치 프로세스 유형 합의 {Math.round(analysisMeta.cloudAgreement.typeAccuracy * 100)}% ·
                      FP 차이 {analysisMeta.cloudAgreement.fpDelta > 0 ? "+" : ""}{analysisMeta.cloudAgreement.fpDelta.toFixed(1)}
                    </p>
                  )}
                  {analysisMeta.cloudReasons.length > 0 && (
                    <p className="text-xs leading-5 text-[#8a6518] sm:col-span-3">검증 사유: {analysisMeta.cloudReasons.join(", ")}</p>
                  )}
                </div>
              )}

              <div className="fp-scrollbar mt-5 overflow-x-auto rounded-[18px] border border-[#e0e4dc]">
                <table className="w-full min-w-[820px] text-left text-xs">
                  <thead className="bg-[#f5f7f2] text-[#81877e]">
                    <tr><th className="px-4 py-3">애플리케이션명</th><th className="px-4 py-3">세부업무명</th><th className="px-4 py-3">단위프로세스명</th><th className="px-4 py-3">FP 유형</th><th className="px-4 py-3 text-right">가중치</th><th className="px-4 py-3">신뢰도</th></tr>
                  </thead>
                  <tbody>
                    {result.items.map((item, index) => (
                      <tr key={`${item.applicationName}-${item.unitProcessName}-${index}`} className="border-t border-[#ecefe9] align-top">
                        <td className="px-4 py-3 font-medium">{item.applicationName}</td>
                        <td className="px-4 py-3">{item.businessName}</td>
                        <td className="px-4 py-3"><p className="font-medium">{item.unitProcessName}</p><p className="mt-1 max-w-xs text-[11px] leading-4 text-[#858b82]">근거: {item.evidence || "없음"}</p>{item.sourceRefs?.length ? <p className="mt-1 max-w-xs text-[10px] text-[#92988f]">출처: {item.sourceRefs.join(", ")}</p> : null}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 font-mono font-semibold ${item.fpType ? "bg-[#edf1e9]" : "bg-[#fff0d8] text-[#956515]"}`}>{item.fpType ?? "UNKNOWN"}</span></td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{item.fpType ? item.weight.toFixed(1) : "—"}</td>
                        <td className="px-4 py-3"><span className={item.needsReview ? "text-[#a47419]" : "text-[#4f872d]"}>{Math.round(item.confidence * 100)}%</span>{item.needsReview && <p className="mt-1 max-w-[180px] text-[10px] leading-4 text-[#a47419]">{item.reviewReasons.join(", ") || "검토 필요"}</p>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.warnings.map((warning) => <p key={warning} className="mt-2 text-xs text-[#8a6518]">• {warning}</p>)}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={applyResults} disabled={!result.items.some((item) => !item.needsReview)} className="fp-focus inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#b9f56a] px-5 text-sm font-semibold text-[#17320d] transition hover:bg-[#a9e85b] disabled:opacity-40"><Sparkles className="h-4 w-4" />검증 통과 항목 반영</button>
                {applyMessage && <p className="text-sm font-medium text-[#4f7d31]">{applyMessage}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
