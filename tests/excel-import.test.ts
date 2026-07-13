import { describe, expect, it } from "vitest";
import { parseFPExcelRows } from "@/lib/excel-import";

const rows: unknown[][] = [
  [null, "총 기능점수", 16.6],
  [null, "보정 후 기능점수", 13.74],
  [],
  [null, "①어플리케이션명", "②세부 업무명", "③단위프로세스명", "단위프로세스 설명", "④FP유형", "⑤가중치"],
  [null, "i-ONE Bank 3.0", "투자관리 서비스 전체 투자 현황", "전체 투자 현황 데이터", "전체 투자 현황 데이터 유지", "ILF", 7.5],
  [null, "i-ONE Bank 3.0", "투자관리 서비스 전체 투자 현황", "전체 투자 현황 조회", "전체 투자 현황 정보 조회", "EQ", 3.9],
  ["DD", "i-ONE Bank 3.0", "투자관리 서비스 전체 투자 현황", "전체 투자 현황 처리", "전체 투자 현황 정보 처리", "EO", 5.2],
  [null, "i-ONE Bank 3.0", "제외 대상", "빈 가중치", "빈 가중치", "EQ", null],
  [null, "i-ONE Bank 3.0", "제외 대상", "0 가중치", "0 가중치", "EQ", 0],
  [null, "i-ONE Bank 3.0", "제외 대상", "음수 가중치", "음수 가중치", "EQ", -3.9],
  [null, "i-ONE Bank 3.0", "제외 대상", "프로세스명만 있음", null, "EQ", 3.9],
  [null, "i-ONE Bank 3.0", "제외 대상", null, "설명만 있음", "EQ", 3.9],
  [null, "i-ONE Bank 3.0", "쉼표 가중치", "대형 가중치", "대형 가중치", "EI", "1,234.5"],
  [null, "요약", null, null, null, "EQ", 3.9],
];

describe("parseFPExcelRows", () => {
  it("ignores summary rows and maps columns from the real header", () => {
    let id = 0;
    const parsed = parseFPExcelRows(rows, () => `item-${++id}`);

    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toMatchObject({
      appName: "i-ONE Bank 3.0",
      businessName: "투자관리 서비스 전체 투자 현황",
      processName: "전체 투자 현황 데이터",
      description: "전체 투자 현황 데이터 유지",
      fpType: "ILF",
      weight: 7.5,
    });
    expect(parsed[2]).toMatchObject({
      appName: "i-ONE Bank 3.0",
      processName: "전체 투자 현황 처리",
      description: "전체 투자 현황 정보 처리",
      fpType: "EO",
      weight: 5.2,
    });
    expect(parsed[3]).toMatchObject({ fpType: "EI", weight: 1234.5 });
  });

  it("rejects sheets without the FP table header instead of treating metadata as items", () => {
    expect(() => parseFPExcelRows([["총 기능점수", 365]], () => "id"))
      .toThrow(/헤더/);
  });
});
