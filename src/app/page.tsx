"use client";

import { Download, Landmark, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useFPItems } from "@/hooks/use-fp-items";
import { EmptyState } from "@/components/empty-state";
import { FpUploadZone } from "@/components/upload-zone";
import { StatsCard } from "@/components/stats-card";
import { AddItemForm } from "@/components/add-item-form";
import { DataTable } from "@/components/data-table";
import { TotalSummaryCard } from "@/components/total-summary-card";
import { DocumentAnalysisZone } from "@/components/document-analysis-zone";
import { mergeAnalyzedItems, type NormalizedFPAnalysisItem } from "@/lib/fp-analysis";

export default function FPBankApp() {
  const hook = useFPItems();
  const hasItems = hook.items.length > 0;

  function applyAnalyzedItems(analyzed: NormalizedFPAnalysisItem[]) {
    const merged = mergeAnalyzedItems(hook.items, analyzed);
    hook.loadFromExcel(merged.items);
    return { addedCount: merged.addedCount, skippedCount: merged.skippedCount };
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-[1320px]">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#151714] text-white shadow-sm">
              <Landmark className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em]">FPBank</p>
              <p className="text-xs font-medium text-[#7a8077]">Function Point Intelligence</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#dfe3dc] bg-white/70 px-3 py-2 text-xs font-medium text-[#5d635a] backdrop-blur sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-[#4a8b25]" aria-hidden="true" />
            Excel은 브라우저에서 분석
          </div>
        </header>

        <section className="mb-6 overflow-hidden rounded-[30px] bg-[#151714] text-white shadow-[0_30px_80px_rgba(21,23,20,0.12)]">
          <div className="grid gap-8 px-6 py-8 sm:px-9 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:py-12">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white/75 ring-1 ring-white/10">
                <Sparkles className="h-3.5 w-3.5 text-[#b9f56a]" aria-hidden="true" />
                Smart FP Analysis
              </div>
              <h1 className="text-[clamp(2.35rem,5vw,4.75rem)] font-medium leading-[0.98] tracking-[-0.065em]">
                기능점수 산정을<br />더 빠르고 명확하게.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
                Excel 데이터를 불러오면 기능 유형과 가중치를 자동으로 분류하고,
                보정 결과까지 한 화면에서 정리합니다.
              </p>
            </div>
            <FpUploadZone onFileUpload={hook.handleFileUpload} />
          </div>
        </section>

        <DocumentAnalysisZone onApply={applyAnalyzedItems} />

        <section className="mb-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <AddItemForm onAdd={hook.addItem} />
          <div className="rounded-[24px] border border-[#dfe3dc] bg-white p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9086]">Workflow</p>
            <div className="mt-4 space-y-4">
              {["Excel 업로드 또는 기능 입력", "FP 유형 및 가중치 자동 분류", "결과 검토 후 Excel 내보내기"].map((label, index) => (
                <div key={label} className="flex items-center gap-3 text-sm font-medium text-[#444942]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eef1eb] font-mono text-[11px] text-[#5c6259]">0{index + 1}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {!hasItems ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <TotalSummaryCard totalFP={Number(hook.result.totalFP)} adjustedFP={Number(hook.result.adjustedFP)} itemCount={hook.result.includedItems.length} />
              <StatsCard fpByType={hook.result.fpByType} />
            </section>

            <section className="overflow-hidden rounded-[28px] border border-[#dfe3dc] bg-white">
              <div className="flex flex-col gap-4 border-b border-[#e5e8e1] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.035em]">분석 항목</h2>
                  <p className="mt-1 text-sm text-[#7b8178]">중복 가능 항목을 확인하고 체크박스로 FP 합산 포함 여부를 조정하세요.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={hook.clearAll} className="fp-focus inline-flex h-11 items-center gap-2 rounded-full border border-[#e2e5df] px-4 text-sm font-semibold text-[#666c63] transition hover:border-[#efb7b7] hover:bg-[#fff4f4] hover:text-[#bd3f3f]" aria-label="전체 항목 삭제">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />전체 삭제
                  </button>
                  <button onClick={hook.handleDownload} className="fp-focus inline-flex h-11 items-center gap-2 rounded-full bg-[#151714] px-5 text-sm font-semibold text-white transition hover:bg-[#2b2e29] active:scale-[0.98]" aria-label="Excel 파일 다운로드">
                    <Download className="h-4 w-4" aria-hidden="true" />Excel 내보내기
                  </button>
                </div>
              </div>
              <DataTable
                items={hook.items}
                editId={hook.editId}
                setEditId={hook.setEditId}
                removeItem={hook.removeItem}
                updateItem={hook.updateItem}
                toggleItemIncluded={hook.toggleItemIncluded}
                duplicateCandidates={hook.duplicateCandidates}
              />
            </section>
          </div>
        )}

        <footer className="mt-10 flex flex-col gap-2 border-t border-[#dfe3dc] py-6 text-xs text-[#858b82] sm:flex-row sm:items-center sm:justify-between">
          <span>FPBank · Function Point Analysis</span>
          <span>Excel은 브라우저에서 처리 · AI 분석 파일은 서버 전송 후 저장하지 않도록 요청합니다.</span>
        </footer>
      </div>
    </main>
  );
}
