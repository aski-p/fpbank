import { describe, expect, it } from "vitest";
import { getFPItemDisplayName } from "@/lib/fp-item-display";
import type { FPItem } from "@/stores/fp-store";

const base: FPItem = {
  id: "1",
  appName: "i-ONE Bank 3.0",
  businessName: "투자관리 서비스 전체 투자 현황",
  processName: "전체 투자 현황 정보 조회",
  description: "전체 투자 현황 정보 다건 조회",
  fpType: "EQ",
  weight: 3.9,
  remark: "",
};

describe("getFPItemDisplayName", () => {
  it("uses the unit-process description instead of the repeated business name", () => {
    expect(getFPItemDisplayName(base)).toBe("전체 투자 현황 정보 다건 조회");
  });

  it("falls back to the unit-process name when the description is empty", () => {
    expect(getFPItemDisplayName({ ...base, description: "" })).toBe("전체 투자 현황 정보 조회");
  });
});
