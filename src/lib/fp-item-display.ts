import type { FPItem } from "@/stores/fp-store";

export function getFPItemDisplayName(item: Pick<FPItem, "description" | "processName">): string {
  return item.description.trim() || item.processName.trim() || "단위프로세스 설명 없음";
}
