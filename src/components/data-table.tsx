import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { FPItem, FPType } from "@/stores/fp-store";
import { FP_WEIGHTS } from "@/lib/fp-calculator";
import { getFPItemDisplayName } from "@/lib/fp-item-display";
import type { DuplicateCandidate } from "@/lib/fp-duplicates";

interface DataTableProps {
  items: FPItem[];
  editId: string | null;
  setEditId: (id: string | null) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, key: keyof FPItem, value: string | number | boolean) => void;
  toggleItemIncluded: (id: string) => void;
  duplicateCandidates: ReadonlyMap<string, DuplicateCandidate>;
}

const TYPES: FPType[] = ["ILF", "EIF", "EQ", "EI", "EO"];

export function DataTable({ items, editId, setEditId, removeItem, updateItem, toggleItemIncluded, duplicateCandidates }: DataTableProps) {
  const inputClass = "fp-focus h-10 w-full min-w-[120px] rounded-xl border border-[#cfd5ca] bg-white px-3 text-sm outline-none focus:border-[#8ecb4e]";
  const includedCount = items.filter((item) => item.included !== false).length;
  const duplicateGroupCount = new Set(Array.from(duplicateCandidates.values(), (candidate) => candidate.groupId)).size;

  return (
    <div>
      <div className="divide-y divide-[#eceee9] sm:hidden">
        {items.map((item, index) => {
          const isEditing = editId === item.id;
          const included = item.included !== false;
          const duplicate = duplicateCandidates.get(item.id);
          return (
            <article key={item.id} className={`p-5 transition ${isEditing ? "bg-[#f7fbef]" : "bg-white"} ${included ? "" : "opacity-55"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#596057]">
                      <input type="checkbox" checked={included} onChange={() => toggleItemIncluded(item.id)} aria-label={`${index + 1}번 항목 FP 합산 포함`} className="h-4 w-4 accent-[#6fa936]" />
                      FP 합산
                    </label>
                    {duplicate && <span title={duplicate.reason} className="rounded-full bg-[#fff1cf] px-2 py-1 text-[10px] font-semibold text-[#8a6518]">중복 가능 {duplicate.groupId}</span>}
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-[#9a9f97]">{String(index + 1).padStart(2, "0")} · {item.appName}</p>
                  {isEditing ? (
                    <fieldset data-mobile-item-editor="true" className="mt-2 space-y-2" aria-label={`${index + 1}번 항목 명칭 편집`}>
                      <input className={inputClass} value={item.appName} onChange={(event) => updateItem(item.id, "appName", event.target.value)} aria-label={`${index + 1}번 애플리케이션명`} />
                      <input className={inputClass} value={item.businessName} onChange={(event) => updateItem(item.id, "businessName", event.target.value)} aria-label={`${index + 1}번 업무명`} />
                      <input className={inputClass} value={item.processName} onChange={(event) => updateItem(item.id, "processName", event.target.value)} aria-label={`${index + 1}번 단위프로세스명`} />
                      <input className={inputClass} value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} aria-label={`${index + 1}번 단위프로세스 설명`} />
                    </fieldset>
                  ) : (
                    <>
                      <h3 className="mt-2 text-[15px] font-semibold leading-6 text-[#30342e]">{getFPItemDisplayName(item)}</h3>
                      <p className="mt-1 truncate text-xs text-[#7a8077]">세부업무 · {item.businessName}</p>
                      {item.processName && item.processName !== item.description && (
                        <p className="mt-1 truncate text-[11px] text-[#969b93]">프로세스 · {item.processName}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {isEditing ? (
                    <select
                      className={`${inputClass} min-w-[82px]`}
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
                  <p className="mt-2 font-mono text-xs font-semibold text-[#5f655c]">{included ? `${item.weight.toFixed(1)} FP` : "합산 제외"}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-1.5">
                <button
                  onClick={() => setEditId(isEditing ? null : item.id)}
                  className={`fp-focus grid h-9 w-9 place-items-center rounded-full ${isEditing ? "bg-[#b9f56a] text-[#17320d]" : "bg-[#f0f2ed] text-[#5f655c]"}`}
                  aria-label={isEditing ? "편집 완료" : "항목 편집"}
                >
                  {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => removeItem(item.id)} className="fp-focus grid h-9 w-9 place-items-center rounded-full bg-[#fff2f2] text-[#c54a4a]" aria-label="항목 삭제">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="fp-scrollbar hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="bg-[#f7f8f5] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#858b82]">
            <th className="w-16 px-5 py-3.5 sm:px-7">No.</th>
            <th className="min-w-[132px] px-4 py-3.5">FP 합산</th>
            <th className="px-4 py-3.5">애플리케이션</th>
            <th className="px-4 py-3.5">업무</th>
            <th className="min-w-[280px] px-4 py-3.5">단위프로세스 설명</th>
            <th className="px-4 py-3.5">유형</th>
            <th className="px-4 py-3.5 text-right">가중치</th>
            <th className="w-28 px-5 py-3.5 text-right sm:px-7">관리</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {items.map((item, index) => {
              const isEditing = editId === item.id;
              const included = item.included !== false;
              const duplicate = duplicateCandidates.get(item.id);
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`border-t border-[#eceee9] transition ${isEditing ? "bg-[#f7fbeF]" : "hover:bg-[#fbfcfa]"} ${included ? "" : "opacity-55"}`}
                >
                  <td className="px-5 py-4 font-mono text-xs text-[#9a9f97] sm:px-7">{String(index + 1).padStart(2, "0")}</td>
                  <td className="px-4 py-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#596057]">
                      <input type="checkbox" checked={included} onChange={() => toggleItemIncluded(item.id)} aria-label={`${index + 1}번 항목 FP 합산 포함`} className="h-4 w-4 accent-[#6fa936]" />
                      {included ? "포함" : "제외"}
                    </label>
                    {duplicate && <span title={duplicate.reason} className="mt-1.5 block w-fit rounded-full bg-[#fff1cf] px-2 py-1 text-[10px] font-semibold text-[#8a6518]">중복 가능 {duplicate.groupId}</span>}
                  </td>
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
                      <div className="space-y-2">
                        <input className={inputClass} value={item.processName} onChange={(event) => updateItem(item.id, "processName", event.target.value)} aria-label={`${index + 1}번 단위프로세스명`} />
                        <input className={inputClass} value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} aria-label={`${index + 1}번 단위프로세스 설명`} />
                      </div>
                    ) : (
                      <div>
                        <p className="line-clamp-2 text-sm font-medium leading-5 text-[#3f443d]">{getFPItemDisplayName(item)}</p>
                        {item.processName && item.processName !== item.description && <p className="mt-1 truncate text-[11px] text-[#969b93]">프로세스명 · {item.processName}</p>}
                      </div>
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
                  <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-[#343832]">{included ? item.weight.toFixed(1) : "합산 제외"}</td>
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
      </div>
      <div className="flex items-center justify-between border-t border-[#e8ebe5] bg-[#fafbf9] px-5 py-4 text-xs text-[#7d837a] sm:px-7">
        <span>전체 {items.length.toLocaleString("ko-KR")}개 · FP 합산 {includedCount.toLocaleString("ko-KR")}개</span>
        <span>{duplicateGroupCount > 0 ? `중복 가능 ${duplicateGroupCount}그룹 · 체크로 합산 조정` : "클릭해서 수정 가능"}</span>
      </div>
    </div>
  );
}
