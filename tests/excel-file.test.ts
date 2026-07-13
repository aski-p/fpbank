import { describe, expect, it } from "vitest";
import { assertExcelRowLimit, validateExcelFile } from "@/lib/excel-file";

function excelFile(name = "sample.xlsx", size = 4) {
  return new File([new Uint8Array(size)], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("Excel upload boundaries", () => {
  it("accepts xlsx and xls files within 10 MB", () => {
    expect(() => validateExcelFile(excelFile())).not.toThrow();
    expect(() => validateExcelFile(excelFile("legacy.xls"))).not.toThrow();
  });

  it("rejects unsupported extensions and oversized workbooks", () => {
    expect(() => validateExcelFile(excelFile("payload.csv"))).toThrow(/Excel/);
    expect(() => validateExcelFile(excelFile("huge.xlsx", 10 * 1024 * 1024 + 1))).toThrow(/10MB/);
  });

  it("rejects sheets beyond the row processing limit", () => {
    expect(() => assertExcelRowLimit(10_000)).not.toThrow();
    expect(() => assertExcelRowLimit(10_001)).toThrow(/10,000행/);
  });
});
