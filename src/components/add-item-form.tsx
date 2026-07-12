import { useState } from "react";
import { Plus } from "lucide-react";
import type { FPItem, FPType } from "@/stores/fp-store";
import { classifyFPType, FP_WEIGHTS } from "@/lib/fp-calculator";

interface AddItemFormProps {
  onAdd: (item: Omit<FPItem, "id">) => void;
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const [description, setDescription] = useState("");
  const [bizName, setBizName] = useState("");

  const handleAdd = () => {
    const trimmed = description.trim();
    if (!trimmed) return;

    const typeKey = classifyFPType(trimmed) as FPType;
    onAdd({
      appName: "Frontend App",
      businessName: bizName || "App Business",
      processName: trimmed,
      description: trimmed,
      fpType: typeKey,
      weight: FP_WEIGHTS[typeKey],
      remark: "수동입력",
    });
    setDescription("");
  };

  return (
    <div className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-200 space-y-3">
      <div>
        <label htmlFor="desc-input" className="block text-xs font-medium text-gray-500 mb-1">
          기능 설명
        </label>
        <div className="flex gap-3 items-end">
          <textarea
            id="desc-input"
            rows={2}
            placeholder="기능을 입력하세요 (Enter로 추가)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevent new line in textarea
                handleAdd();
              }
            }}
            className="flex-1 min-h-[44px] resize-none bg-white border rounded-[14px] px-3 py-2 text-sm focus:outline-none ring-1 ring-gray-100 focus:ring-blue-500 transition-shadow placeholder:text-gray-300"
          />
          <button
            onClick={handleAdd}
            type="button"
            className="inline-flex min-h-[44px] items-center gap-2 px-5 rounded-[14px] bg-blue-600 text-white font-medium hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            추가하기
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="biz-input" className="block text-xs font-medium text-gray-500 mb-1">
          업무명 (선택)
        </label>
        <input
          id="biz-input"
          type="text"
          value={bizName}
          onChange={(e) => setBizName(e.target.value)}
          className="w-full min-h-[44px] bg-white border rounded-[14px] px-3 py-2 text-sm ring-1 ring-gray-100 focus:ring-blue-500 transition-shadow placeholder:text-gray-300"
        />
      </div>
    </div>
  );
}
