import { afterEach, describe, expect, it } from "vitest";
import { calculateFP } from "@/lib/fp-calculator";
import { detectDuplicateCandidates } from "@/lib/fp-duplicates";
import { useFPStore, type FPItem } from "@/stores/fp-store";

function item(id: string, overrides: Partial<FPItem> = {}): FPItem {
  return {
    id,
    appName: "i-ONE Bank",
    businessName: "계좌 관리",
    processName: "계좌 거래내역 조회",
    description: "기간별 계좌 거래 내역을 조회한다",
    fpType: "EQ",
    weight: 3.9,
    remark: "Excel 분석",
    included: true,
    ...overrides,
  };
}

afterEach(() => {
  useFPStore.getState().clearAll();
});

describe("detectDuplicateCandidates", () => {
  it("groups exact and highly similar process candidates without hiding them", () => {
    const candidates = detectDuplicateCandidates([
      item("a"),
      item("b", {
        processName: "계좌거래 내역 조회",
        description: "조회 기간에 따라 계좌 거래내역을 보여준다",
      }),
      item("c", {
        businessName: "고객 관리",
        processName: "고객 연락처 변경",
        description: "고객 연락처를 변경한다",
        fpType: "EI",
        weight: 4,
      }),
    ]);

    expect(candidates.get("a")?.groupId).toBe("D1");
    expect(candidates.get("b")?.groupId).toBe("D1");
    expect(candidates.get("a")?.reason).toMatch(/프로세스|설명/);
    expect(candidates.has("c")).toBe(false);
  });

  it("does not group otherwise similar rows with different FP types", () => {
    const candidates = detectDuplicateCandidates([
      item("eq"),
      item("eo", { fpType: "EO", weight: 5.2 }),
    ]);
    expect(candidates.size).toBe(0);
  });
});

describe("FP inclusion selection", () => {
  it("excludes unchecked rows from every FP summary while preserving the row", () => {
    const items = [
      item("included"),
      item("excluded", { included: false }),
      item("ei", { processName: "계좌 등록", description: "계좌를 등록한다", fpType: "EI", weight: 4 }),
    ];
    const result = calculateFP(items);

    expect(result.items).toHaveLength(3);
    expect(result.includedItems).toHaveLength(2);
    expect(result.totalFP).toBe(7.9);
    expect(result.fpByType.EQ).toEqual({ count: 1, totalFp: 3.9 });
    expect(result.fpByType.EI).toEqual({ count: 1, totalFp: 4 });
  });

  it("toggles inclusion in the store", () => {
    useFPStore.getState().loadFromExcel([item("row")]);
    useFPStore.getState().toggleItemIncluded("row");
    expect(useFPStore.getState().items[0].included).toBe(false);
    useFPStore.getState().toggleItemIncluded("row");
    expect(useFPStore.getState().items[0].included).toBe(true);
  });
});
