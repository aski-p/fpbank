import { useRef, useState } from "react";
import { FileSpreadsheet, LoaderCircle, UploadCloud } from "lucide-react";
import { validateExcelFile } from "@/lib/excel-file";

interface Props {
  onFileUpload: (file: File) => void | Promise<void>;
}

export function FpUploadZone({ onFileUpload }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function submitFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      validateExcelFile(file);
      setIsUploading(true);
      await onFileUpload(file);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Excel 파일을 분석하지 못했습니다.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        submitFile(event.dataTransfer.files[0]);
      }}
      className={`relative overflow-hidden rounded-[24px] border p-5 transition sm:p-6 ${
        isDragOver
          ? "border-[#b9f56a] bg-[#b9f56a]/15"
          : "border-white/15 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#b9f56a] text-[#17320d]">
          <UploadCloud className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
          .xlsx · .xls
        </span>
      </div>
      <div className="mt-7">
        <h2 className="text-xl font-medium tracking-[-0.035em]">
          {isDragOver ? "여기에 놓아주세요" : "Excel 분석 시작하기"}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/55">
          파일을 끌어다 놓거나 직접 선택하세요. 첫 번째 시트의 데이터를 브라우저에서 바로 분석합니다.
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="fp-focus mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#151714] transition hover:bg-[#b9f56a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
        {isUploading ? "Excel 분석 중..." : "Excel 파일 선택"}
      </button>
      {error && <p role="alert" className="mt-3 text-xs font-medium text-[#ffb4b4]">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(event) => submitFile(event.target.files?.[0])}
        className="sr-only"
        aria-label="분석할 Excel 파일 선택"
      />
    </div>
  );
}
