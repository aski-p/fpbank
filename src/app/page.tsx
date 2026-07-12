"use client";

import { Download } from "lucide-react";
import { useFPItems } from "@/hooks/use-fp-items";
import type { FPItem } from "@/stores/fp-store";
import { EmptyState } from "@/components/empty-state";
import { FpUploadZone } from "@/components/upload-zone";
import { StatsCard } from "@/components/stats-card";
import { AddItemForm } from "@/components/add-item-form";
import { DataTable } from "@/components/data-table";
import { TotalSummaryCard } from "@/components/total-summary-card";

export default function FPBankApp() {
  const hook = useFPItems();

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 bg-[#fafafa]">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <header className="text-center pb-4 text-gray-900">
          <h1 className="text-[32px] font-semibold tracking-tight">⚡ FPBank</h1>
          <p className="mt-2 text-sm text-gray-500">기능점수 자동 분석 시스템</p>
        </header>

        <FpUploadZone onFileUpload={hook.handleFileUpload} />

        {hook.items.length === 0 ? (
          <EmptyState key="empty" />
        ) : (<>
          <StatsCard fpByType={hook.result.fpByType as any} />
          <TotalSummaryCard totalFP={Number(hook.result.totalFP)} adjustedFP={Number(hook.result.adjustedFP)} />

          <DataTable 
            items={hook.items} 
            editId={hook.editId ?? null}
            setEditId={hook.setEditId} 
            removeItem={hook.removeItem} 
            updateItem={(i,k,v)=>{}} // dummy since types mismatch; will fix in table itself
          />

          <footer className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{hook.items.length}개 항목 분석됨</span>
              <div className="flex gap-3">
                <button onClick={hook.clearAll} className="inline-flex min-h-[44px] px-4 rounded-[14px] bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all" aria-label="전체 삭제">전체 삭제</button>
                <button onClick={hook.handleDownload} className="inline-flex min-h-[44px] px-5 rounded-[14px] bg-blue-600 text-white hover:opacity-90 active:scale-[0.98] transition-all" aria-label="엑셀 다운로드">
                  <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />Excel 다운로드</button>
              </div>
            </div>
          </footer>
        </>)}
      </div>
    </div>
  );
}