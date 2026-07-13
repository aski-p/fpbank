import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import type { FPItem, FPType } from "@/stores/fp-store";
import { classifyFPType, FP_WEIGHTS } from "@/lib/fp-calculator";

interface AddItemFormProps {
  onAdd: (item: Omit<FPItem, "id">) => void;
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const [description, setDescription] = useState("");
  const [businessName, setBusinessName] = useState("");

  function handleAdd() {
    const processName = description.trim();
    if (!processName) return;
    const fpType = classifyFPType(processName) as FPType;
    onAdd({
      appName: "Frontend App",
      businessName: businessName.trim() || "App Business",
      processName,
      description: processName,
      fpType,
      weight: FP_WEIGHTS[fpType],
      remark: "수동 입력",
    });
    setDescription("");
  }

  return (
    <div className="rounded-[24px] border border-[#dfe3dc] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9086]">Quick add</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">기능 직접 추가</h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#eef1eb] text-[#4f554d]">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="block">
          <span className="sr-only">기능 설명</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
            placeholder="예: 고객 계좌 목록 조회"
            className="fp-focus h-12 w-full rounded-2xl border border-[#dfe3dc] bg-[#f8f9f6] px-4 text-sm text-[#252823] outline-none transition placeholder:text-[#a3a8a0] focus:border-[#99cd5c] focus:bg-white"
          />
        </label>
        <label className="block">
          <span className="sr-only">업무명</span>
          <input
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="업무명 (선택)"
            className="fp-focus h-12 w-full rounded-2xl border border-[#dfe3dc] bg-[#f8f9f6] px-4 text-sm text-[#252823] outline-none transition placeholder:text-[#a3a8a0] focus:border-[#99cd5c] focus:bg-white"
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!description.trim()}
          className="fp-focus inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#b9f56a] px-5 text-sm font-semibold text-[#17320d] transition hover:bg-[#a8e958] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          분석 추가
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
