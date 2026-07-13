import { FileSpreadsheet, MousePointer2 } from "lucide-react";

export function EmptyState() {
  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-dashed border-[#cfd5ca] bg-white/55 px-6 py-14 text-center sm:py-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(185,245,106,0.13),transparent_48%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-[#151714] text-[#b9f56a]">
          <FileSpreadsheet className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-[-0.045em]">분석할 데이터를 추가하세요</h2>
        <p className="mt-3 text-sm leading-6 text-[#777d74]">
          위에서 Excel 파일을 업로드하거나 기능을 직접 입력하면
          유형별 FP와 보정 점수가 여기에 표시됩니다.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#dfe3dc] bg-white px-4 py-2 text-xs font-medium text-[#666c63]">
          <MousePointer2 className="h-3.5 w-3.5 text-[#59912f]" aria-hidden="true" />
          별도 설치 없이 바로 분석
        </div>
      </div>
    </section>
  );
}
