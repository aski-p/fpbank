import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { FPItem, FPType } from "@/stores/fp-store";
import { FP_WEIGHTS } from "@/lib/fp-calculator";

interface DataTableProps {
  items: FPItem[];
  editId: string | null;
  setEditId: (id: string | null) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, key: keyof FPItem, value: string | number) => void;
}

const TYPES: FPType[] = ["ILF", "EIF", "EQ", "EI", "EO"];

export function DataTable({ items, editId, setEditId, removeItem, updateItem }: DataTableProps) {
  const inputClass = "fp-focus h-10 w-full min-w-[120px] rounded-xl border border-[#cfd5ca] bg-white px-3 text-sm outline-none focus:border-[#8ecb4e]";

  return (
    <div className="fp-scrollbar overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="bg-[#f7f8f5] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#858b82]">
            <th className="w-16 px-5 py-3.5 sm:px-7">No.</th>
            <th className="px-4 py-3.5">애플리케이션</th>
            <th className="px-4 py-3.5">업무</th>
            <th className="min-w-[280px] px-4 py-3.5">프로세스 / 설명</th>
            <th className="px-4 py-3.5">유형</th>
            <th className="px-4 py-3.5 text-right">가중치</th>
            <th className="w-28 px-5 py-3.5 text-right sm:px-7">관리</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {items.map((item, index) => {
              const isEditing = editId === item.id;
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`border-t border-[#eceee9] transition ${isEditing ? "bg-[#f7fbeF]" : "hover:bg-[#fbfcfa]"}`}
                >
                  <td className="px-5 py-4 font-mono text-xs text-[#9a9f97] sm:px-7">{String(index + 1).padStart(2, "0")}</td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input className={inputClass} value={item.appName} onChange={(event) => updateItem(item.id, "appName", event.target.value)} aria-label={`${index + 1}번 애플리케이션명`} />
                    ) : (
                      <span className="block max-w-[180px] truncate text-sm font-semibold text-[#30342e]">{item.appName}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input className={inputClass} value={item.businessName} onChange={(event) => updateItem(item.id, "businessName", event.target.value)} aria-label={`${index + 1}번 업무명`} />
                    ) : (
                      <span className="block max-w-[180px] truncate text-sm text-[#686e65]">{item.businessName}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input className={inputClass} value={item.processName} onChange={(event) => {
                        updateItem(item.id, "processName", event.target.value);
                        updateItem(item.id, "description", event.target.value);
                      }} aria-label={`${index + 1}번 프로세스 설명`} />
                    ) : (
                      <p className="line-clamp-2 text-sm leading-5 text-[#3f443d]">{item.processName}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <select
                        className={`${inputClass} min-w-[88px]`}
                        value={item.fpType}
                        onChange={(event) => {
                          const nextType = event.target.value as FPType;
                          updateItem(item.id, "fpType", nextType);
                          updateItem(item.id, "weight", FP_WEIGHTS[nextType]);
                        }}
                        aria-label={`${index + 1}번 FP 유형`}
                      >
                        {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full bg-[#edf1e9] px-3 py-1.5 font-mono text-[11px] font-semibold text-[#4a5146]">{item.fpType}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-[#343832]">{item.weight.toFixed(1)}</td>
                  <td className="px-5 py-4 sm:px-7">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditId(isEditing ? null : item.id)}
                        className={`fp-focus grid h-9 w-9 place-items-center rounded-full transition ${isEditing ? "bg-[#b9f56a] text-[#17320d]" : "bg-[#f0f2ed] text-[#5f655c] hover:bg-[#e4e8e0]"}`}
                        aria-label={isEditing ? "편집 완료" : "항목 편집"}
                      >
                        {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => removeItem(item.id)} className="fp-focus grid h-9 w-9 place-items-center rounded-full bg-[#fff2f2] text-[#c54a4a] transition hover:bg-[#ffe4e4]" aria-label="항목 삭제">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-[#e8ebe5] bg-[#fafbf9] px-5 py-4 text-xs text-[#7d837a] sm:px-7">
        <span>총 {items.length.toLocaleString("ko-KR")}개 항목</span>
        <span>클릭해서 수정 가능</span>
      </div>
    </div>
  );
}
