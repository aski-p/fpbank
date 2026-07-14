import { describe, expect, it } from "vitest";
import { calculateFP, classifyFPType } from "@/lib/fp-calculator";
import type { FPItem } from "@/stores/fp-store";

function item(id: string, weight: number): FPItem {
  return {
    id,
    appName: "앱",
    businessName: "업무",
    processName: id,
    description: id,
    fpType: "EQ",
    weight,
    remark: "",
  };
}

describe("classifyFPType", () => {
  it("does not misclassify internal information data as EIF", () => {
    expect(classifyFPType("투자관리 서비스 분석 인사이트 데이터")).toBe("ILF");
    expect(classifyFPType("투자관리 서비스 전체 투자 현황 데이터")).toBe("ILF");
    expect(classifyFPType("고객 상태정보 저장소")).toBe("ILF");
  });

  it("uses EIF only when another system ownership/reference is explicit", () => {
    expect(classifyFPType("타시스템 고객정보 참조")).toBe("EIF");
    expect(classifyFPType("외부기관 관리 데이터 연계")).toBe("EIF");
  });
});

describe("calculateFP", () => {
  it("uses the IBK correction formula shown in the source Excel", () => {
    const result = calculateFP([item("a", 142.5), item("b", 120.9), item("c", 93.6), item("d", 8)]);
    expect(result.totalFP).toBe(365);
    expect(result.adjustedFP).toBe(302.22);
  });

  it("sums source weights before rounding type subtotals", () => {
    const result = calculateFP([
      { ...item("a", 1.25), fpType: "EQ" },
      { ...item("b", 1.25), fpType: "EI" },
    ]);
    expect(result.totalFP).toBe(2.5);
    expect(result.adjustedFP).toBe(2.07);
  });

  it("applies the adjustment formula before rounding the raw total", () => {
    const result = calculateFP([
      { ...item("a", 1.255), fpType: "EQ" },
      { ...item("b", 1.25), fpType: "EI" },
    ]);
    expect(result.totalFP).toBe(2.51);
    expect(result.adjustedFP).toBe(2.07);
  });
});
